import React, { useEffect, useMemo, useRef, useState } from 'react';
import jsPDF from 'jspdf';
import { Client, DocumentTemplate, FirmSettings } from '../types';
import { GeneratedDocument } from '../types/generatedDocument';
import { auth } from '../lib/firebase';
import { getBrasiliaISO } from '../utils/dateUtils';
import { onlyDigits } from '../utils/clientDataUtils';
import { replaceVariablesInTemplateText } from '../utils/documentReplacer';
import { saveGeneratedDocumentInFirestore } from '../services/generatedDocumentService';

interface DocumentGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: DocumentTemplate | null;
  clients: Client[];
  initialClientName?: string;
  initialClientCpf?: string;
  initialGeneratedText?: string;
  settings?: FirmSettings;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'dirty' | 'error';

const createGeneratedDocumentId = () => {
  const rawId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `document-${rawId}`;
};

const renderFormattedDoc = (text: string) => {
  const lines = text.split('\n');

  return (
    <div className="space-y-1.5 font-serif text-slate-900 text-xs md:text-sm leading-relaxed text-justify">
      {lines.map((line, lineIndex) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={lineIndex} className="h-3" />;

        if (trimmed.startsWith('#') || trimmed.includes('##')) {
          return (
            <div
              key={lineIndex}
              className="font-bold text-slate-950 my-3 uppercase tracking-wide border-b border-slate-100 pb-1 pt-1"
            >
              {line.replace(/#+/g, '').replace(/\*\*/g, '').trim()}
            </div>
          );
        }

        const parts = line.split(/(\*\*.*?\*\*)/g);
        return (
          <p key={lineIndex} className="min-h-[1.2em]">
            {parts.map((part, partIndex) =>
              part.startsWith('**') && part.endsWith('**') ? (
                <strong key={partIndex}>{part.slice(2, -2)}</strong>
              ) : (
                <span key={partIndex}>{part}</span>
              )
            )}
          </p>
        );
      })}
    </div>
  );
};

export const DocumentGeneratorOperationalModal: React.FC<DocumentGeneratorModalProps> = ({
  isOpen,
  onClose,
  template,
  clients,
  initialClientName,
  initialClientCpf,
  initialGeneratedText,
  settings,
}) => {
  const [selectedClientId, setSelectedClientId] = useState('');
  const [generatedDoc, setGeneratedDoc] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'preview' | 'edit'>('preview');
  const [copied, setCopied] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [draftId, setDraftId] = useState<string | null>(null);
  const [draftCreatedAt, setDraftCreatedAt] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState('');
  const openedForClientContext = useRef(false);

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === selectedClientId) || null,
    [clients, selectedClientId]
  );

  const replacementAnalysis = useMemo(() => {
    if (!template || !selectedClient) return null;
    return replaceVariablesInTemplateText(
      template.contentPattern || '',
      selectedClient,
      settings,
      'placeholder',
      '[Não informado]'
    );
  }, [template, selectedClient, settings]);

  useEffect(() => {
    if (!isOpen) return;

    const initialCpfDigits = onlyDigits(initialClientCpf || '');
    const initialClient = initialCpfDigits
      ? clients.find((client) => onlyDigits(client.cpf) === initialCpfDigits)
      : clients.find((client) => client.name === initialClientName);

    setSelectedClientId(initialClient?.id || '');
    openedForClientContext.current = Boolean(initialClient);
    setGeneratedDoc(initialGeneratedText || null);
    setViewMode('preview');
    setCopied(false);
    setSaveState('idle');
    setDraftId(null);
    setDraftCreatedAt(null);
    setSaveMessage(initialGeneratedText ? 'Documento preparado. Salve o rascunho para poder retomá-lo depois.' : '');
  }, [clients, initialClientCpf, initialClientName, initialGeneratedText, isOpen, template?.id]);

  if (!isOpen || !template) return null;

  const persistDraft = async (content: string, client: Client) => {
    const firmId = settings?.firmId || client.firmId;
    if (!firmId) {
      setSaveState('error');
      setSaveMessage('Não foi possível identificar o escritório. Aguarde a sincronização e tente novamente.');
      return false;
    }

    const now = getBrasiliaISO();
    const documentId = draftId || createGeneratedDocumentId();
    const createdAt = draftCreatedAt || now;
    const currentUser = auth.currentUser;

    const generatedDocument: GeneratedDocument = {
      id: documentId,
      title: `${template.title} — ${client.name}`,
      content,
      status: 'Rascunho',
      source: openedForClientContext.current ? 'clients' : 'documents',
      templateId: template.id,
      templateTitle: template.title,
      templateSnapshot: { ...template },
      clientId: client.id,
      clientName: client.name,
      clientCpf: client.cpf,
      createdAt,
      updatedAt: now,
      createdByUid: currentUser?.uid,
      createdByName: currentUser?.displayName || currentUser?.email || undefined,
    };

    setSaveState('saving');
    setSaveMessage('Salvando rascunho...');
    const saved = await saveGeneratedDocumentInFirestore(generatedDocument, firmId);

    if (!saved) {
      setSaveState('error');
      setSaveMessage('O documento foi gerado, mas o rascunho não pôde ser salvo no Firestore.');
      return false;
    }

    setDraftId(documentId);
    setDraftCreatedAt(createdAt);
    setSaveState('saved');
    setSaveMessage('Rascunho salvo. Você poderá retomá-lo pela central de documentos.');
    return true;
  };

  const handleSelectClient = (clientId: string) => {
    setSelectedClientId(clientId);
    setGeneratedDoc(null);
    setDraftId(null);
    setDraftCreatedAt(null);
    setSaveState('idle');
    setSaveMessage('');
    openedForClientContext.current = false;
  };

  const handleGenerateAndSave = async () => {
    if (!selectedClient || !replacementAnalysis) {
      setSaveState('error');
      setSaveMessage('Selecione um cliente cadastrado antes de gerar o documento.');
      return;
    }

    const content = replacementAnalysis.replacedText;
    setGeneratedDoc(content);
    setViewMode('preview');
    await persistDraft(content, selectedClient);
  };

  const handleSaveDraft = async () => {
    if (!generatedDoc || !selectedClient) return;
    await persistDraft(generatedDoc, selectedClient);
  };

  const handleCopy = async () => {
    if (!generatedDoc) return;
    await navigator.clipboard.writeText(generatedDoc);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const handleDownloadTxt = () => {
    if (!generatedDoc) return;
    const blob = new Blob([generatedDoc], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    const cleanTemplate = template.title.replace(/[^a-zA-Z0-9_\-]/g, '_');
    const cleanClient = (selectedClient?.name || 'Cliente').replace(/[^a-zA-Z0-9_\-]/g, '_');
    anchor.download = `${cleanTemplate}_${cleanClient}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = async () => {
    if (!generatedDoc) return;
    setExportingPdf(true);

    try {
      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 18;
      const contentWidth = pageWidth - margin * 2;
      let currentY = 20;

      if (settings?.firmName?.trim()) {
        pdf.setFont('times', 'bold');
        pdf.setFontSize(14);
        pdf.text(settings.firmName.trim(), pageWidth / 2, currentY, { align: 'center' });
        currentY += 6;
      }

      if (settings?.firmSubtitle?.trim()) {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.text(settings.firmSubtitle.trim(), pageWidth / 2, currentY, { align: 'center' });
        currentY += 7;
      }

      pdf.setDrawColor(10, 31, 68);
      pdf.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 8;

      pdf.setFont('times', 'normal');
      pdf.setFontSize(10.5);

      generatedDoc.split('\n').forEach((rawLine) => {
        const line = rawLine.replace(/#+/g, '').replace(/\*\*/g, '');
        const wrapped = line.trim() ? pdf.splitTextToSize(line, contentWidth) : [''];
        wrapped.forEach((wrappedLine: string) => {
          if (currentY > pageHeight - 22) {
            pdf.addPage();
            currentY = 20;
          }
          pdf.text(wrappedLine, margin, currentY);
          currentY += wrappedLine ? 5.2 : 3.5;
        });
      });

      const cleanTemplate = template.title.replace(/[^a-zA-Z0-9_\-]/g, '_');
      const cleanClient = (selectedClient?.name || 'Cliente').replace(/[^a-zA-Z0-9_\-]/g, '_');
      pdf.save(`${cleanTemplate}_${cleanClient}.pdf`);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      window.print();
    } finally {
      setExportingPdf(false);
    }
  };

  const statusStyle =
    saveState === 'saved'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : saveState === 'error'
        ? 'border-red-200 bg-red-50 text-red-800'
        : saveState === 'dirty'
          ? 'border-amber-200 bg-amber-50 text-amber-800'
          : 'border-slate-200 bg-slate-50 text-slate-600';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-5xl rounded-3xl p-5 md:p-7 border border-slate-200 shadow-2xl relative max-h-[94vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-2 rounded-full hover:bg-slate-100"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        <div className="flex items-start gap-3 mb-6 pr-12">
          <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-900 shrink-0">
            <span className="material-symbols-outlined">{template.icon || 'description'}</span>
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900">{template.title}</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              O sistema reutiliza a ficha do cliente e salva o resultado como rascunho para evitar redigitação.
            </p>
          </div>
        </div>

        {!generatedDoc ? (
          <div className="space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-extrabold text-slate-900">Cliente do documento</p>
                  <p className="text-[11px] text-slate-500">
                    {openedForClientContext.current
                      ? 'Cliente recebido automaticamente da ficha cadastral.'
                      : 'Selecione uma vez; os demais dados vêm do cadastro.'}
                  </p>
                </div>
                {openedForClientContext.current && selectedClient && (
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase">
                    Contexto preservado
                  </span>
                )}
              </div>

              <select
                value={selectedClientId}
                onChange={(event) => handleSelectClient(event.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-900"
              >
                <option value="">Selecione um cliente cadastrado...</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name} — CPF: {client.cpf}
                  </option>
                ))}
              </select>

              {selectedClient && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div className="bg-white border border-slate-200 rounded-xl p-3 sm:col-span-2">
                    <span className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Nome</span>
                    <strong className="text-slate-900">{selectedClient.name}</strong>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-3">
                    <span className="block text-[10px] uppercase font-bold text-slate-400 mb-1">CPF</span>
                    <strong className="text-slate-900 font-mono">{selectedClient.cpf}</strong>
                  </div>
                </div>
              )}
            </div>

            {replacementAnalysis && replacementAnalysis.missingVariables.length > 0 && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
                <div className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-lg">warning</span>
                  <div>
                    <p className="text-xs font-extrabold">
                      {replacementAnalysis.missingVariables.length} dado(s) ainda não informado(s) na ficha
                    </p>
                    <p className="text-[11px] mt-1 leading-relaxed">
                      O documento poderá ser gerado agora usando “[Não informado]”. Para evitar isso, atualize apenas os campos realmente necessários na ficha do cliente.
                    </p>
                    <p className="text-[11px] font-semibold mt-2">
                      {replacementAnalysis.missingVariables.slice(0, 5).map((item) => item.label).join(' • ')}
                      {replacementAnalysis.missingVariables.length > 5 ? ' • ...' : ''}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {saveMessage && (
              <div className={`rounded-xl border px-3 py-2.5 text-xs font-semibold ${statusStyle}`}>
                {saveMessage}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="sm:w-1/3 py-3 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!selectedClient || saveState === 'saving'}
                onClick={handleGenerateAndSave}
                className="flex-1 glass-btn-primary py-3 rounded-xl text-white text-xs font-extrabold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-base">
                  {saveState === 'saving' ? 'progress_activity' : 'description'}
                </span>
                <span>{saveState === 'saving' ? 'Gerando e salvando...' : 'Gerar e salvar rascunho'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className={`rounded-xl border px-3 py-2.5 text-xs font-semibold flex items-center justify-between gap-3 ${statusStyle}`}>
              <span>{saveMessage || 'Documento gerado. Salve o rascunho para poder retomá-lo depois.'}</span>
              {draftId && <span className="font-mono text-[9px] opacity-70 truncate max-w-[220px]">{draftId}</span>}
            </div>

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-3">
              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => setViewMode('preview')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${viewMode === 'preview' ? 'bg-blue-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  Visualizar
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('edit')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${viewMode === 'edit' ? 'bg-blue-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  Editar texto
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {(saveState === 'idle' || saveState === 'dirty' || saveState === 'error') && (
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    disabled={saveState === 'saving'}
                    className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-sm">save</span>
                    <span>{saveState === 'dirty' ? 'Salvar alterações' : 'Salvar rascunho'}</span>
                  </button>
                )}
                <button type="button" onClick={handleCopy} className="px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs font-bold">
                  {copied ? 'Copiado!' : 'Copiar'}
                </button>
                <button type="button" onClick={handleDownloadTxt} className="px-3 py-2 rounded-xl bg-slate-200 text-slate-800 text-xs font-bold">TXT</button>
                <button type="button" onClick={handleExportPdf} disabled={exportingPdf} className="px-3 py-2 rounded-xl bg-blue-900 text-white text-xs font-bold disabled:opacity-50">
                  {exportingPdf ? 'Gerando PDF...' : 'PDF'}
                </button>
                <button type="button" onClick={() => window.print()} className="px-3 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold">Imprimir</button>
              </div>
            </div>

            {viewMode === 'preview' ? (
              <div className="bg-slate-200/80 border border-slate-300 rounded-2xl p-3 sm:p-5 max-h-[62vh] overflow-y-auto">
                <div className="bg-white mx-auto max-w-[760px] min-h-[880px] shadow-xl p-8 md:p-14">
                  {(settings?.firmName || settings?.firmSubtitle) && (
                    <div className="text-center border-b border-slate-300 pb-4 mb-8">
                      {settings?.firmName && <h1 className="text-xl font-black uppercase tracking-widest text-[#0A1F44]">{settings.firmName}</h1>}
                      {settings?.firmSubtitle && <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">{settings.firmSubtitle}</p>}
                    </div>
                  )}
                  {renderFormattedDoc(generatedDoc)}
                </div>
              </div>
            ) : (
              <textarea
                value={generatedDoc}
                onChange={(event) => {
                  setGeneratedDoc(event.target.value);
                  setSaveState('dirty');
                  setSaveMessage('Existem alterações ainda não salvas neste rascunho.');
                }}
                rows={22}
                className="w-full bg-slate-50 border border-slate-300 rounded-2xl p-4 font-mono text-xs text-slate-900 leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-900"
              />
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setGeneratedDoc(null);
                  setViewMode('preview');
                  setSaveMessage(draftId ? 'O rascunho salvo será atualizado se você gerar novamente.' : '');
                  setSaveState(draftId ? 'saved' : 'idle');
                }}
                className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold"
              >
                Voltar ao cliente
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-[#0A1F44] hover:bg-slate-900 py-3 rounded-xl text-white text-xs font-extrabold flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">close</span>
                <span>Fechar</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
