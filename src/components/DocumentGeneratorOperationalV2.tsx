import React, { useEffect, useMemo, useRef, useState } from 'react';
import jsPDF from 'jspdf';
import { Client, DocumentTemplate, FirmSettings } from '../types';
import { BpcCaseItem } from '../types/bpc';
import {
  GeneratedDocument,
  GeneratedDocumentStatus,
} from '../types/generatedDocument';
import { auth } from '../lib/firebase';
import { getBrasiliaISO } from '../utils/dateUtils';
import { onlyDigits } from '../utils/clientDataUtils';
import { replaceVariablesInTemplateText } from '../utils/documentReplacer';
import { replaceBpcVariablesInText } from '../utils/bpcDocumentVariables';
import { saveGeneratedDocumentInFirestore } from '../services/generatedDocumentService';

interface DocumentGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: DocumentTemplate | null;
  clients: Client[];
  initialClientId?: string;
  initialClientName?: string;
  initialClientCpf?: string;
  initialGeneratedText?: string;
  initialDocument?: GeneratedDocument | null;
  bpcContext?: BpcCaseItem | null;
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

const sourceLabel = (source?: GeneratedDocument['source']) => {
  if (source === 'bpc') return 'BPC/LOAS';
  if (source === 'clients') return 'Ficha do cliente';
  if (source === 'case') return 'Caso';
  if (source === 'workflow') return 'Fluxo de trabalho';
  return 'Central de documentos';
};

const statusClasses: Record<GeneratedDocumentStatus, string> = {
  Rascunho: 'bg-amber-50 text-amber-800 border-amber-200',
  Finalizado: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  Arquivado: 'bg-slate-100 text-slate-600 border-slate-200',
};

const renderFormattedDoc = (text: string) => (
  <div className="space-y-1.5 font-serif text-slate-900 text-xs md:text-sm leading-relaxed text-justify">
    {text.split('\n').map((line, lineIndex) => {
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

export const DocumentGeneratorOperationalV2: React.FC<DocumentGeneratorModalProps> = ({
  isOpen,
  onClose,
  template,
  clients,
  initialClientId,
  initialClientName,
  initialClientCpf,
  initialGeneratedText,
  initialDocument,
  bpcContext,
  settings,
}) => {
  const [selectedClientId, setSelectedClientId] = useState('');
  const [generatedDoc, setGeneratedDoc] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'preview' | 'edit'>('preview');
  const [copied, setCopied] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [documentCreatedAt, setDocumentCreatedAt] = useState<string | null>(null);
  const [documentStatus, setDocumentStatus] = useState<GeneratedDocumentStatus>('Rascunho');
  const [saveMessage, setSaveMessage] = useState('');
  const initializedKeyRef = useRef('');

  const eligibleClients = useMemo(
    () => clients.filter((client) => String(client.status) !== 'Arquivado'),
    [clients]
  );

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === selectedClientId) || null,
    [clients, selectedClientId]
  );

  const effectiveBpcContext = bpcContext || initialDocument?.bpcCaseSnapshot || null;

  const replacementAnalysis = useMemo(() => {
    if (!template || !selectedClient) return null;
    const clientAnalysis = replaceVariablesInTemplateText(
      template.contentPattern || '',
      selectedClient,
      settings,
      'placeholder',
      '[Não informado]'
    );
    const bpcAnalysis = replaceBpcVariablesInText(
      clientAnalysis.replacedText,
      effectiveBpcContext,
      '[Não informado]'
    );
    return {
      replacedText: bpcAnalysis.replacedText,
      missingClientVariables: clientAnalysis.missingVariables,
      missingBpcVariables: bpcAnalysis.missingVariables,
    };
  }, [template, selectedClient, settings, effectiveBpcContext]);

  useEffect(() => {
    if (!isOpen || !template) {
      initializedKeyRef.current = '';
      return;
    }

    const initKey = [
      template.id,
      initialDocument?.id || '',
      initialClientId || '',
      onlyDigits(initialClientCpf || ''),
      initialClientName || '',
      effectiveBpcContext?.id || '',
    ].join('|');

    if (initializedKeyRef.current === initKey) return;

    const cpfDigits = onlyDigits(initialClientCpf || '');
    const expectedClientId = initialDocument?.clientId || initialClientId;
    const initialClient = expectedClientId
      ? clients.find((client) => client.id === expectedClientId)
      : cpfDigits
        ? clients.find((client) => onlyDigits(client.cpf) === cpfDigits)
        : clients.find((client) => client.name === initialClientName);

    const expectsExistingClient = Boolean(expectedClientId || cpfDigits || initialClientName);
    if (expectsExistingClient && !initialClient && clients.length === 0) return;

    initializedKeyRef.current = initKey;
    setSelectedClientId(initialClient?.id || '');
    setGeneratedDoc(initialDocument?.content || initialGeneratedText || null);
    setDocumentId(initialDocument?.id || null);
    setDocumentCreatedAt(initialDocument?.createdAt || null);
    setDocumentStatus(initialDocument?.status || 'Rascunho');
    setViewMode(initialDocument?.status === 'Rascunho' ? 'edit' : 'preview');
    setCopied(false);
    setSaveState(initialDocument ? 'saved' : 'idle');
    setSaveMessage(
      initialDocument
        ? `Documento carregado da biblioteca • ${sourceLabel(initialDocument.source)}`
        : initialGeneratedText
          ? 'Documento preparado. Salve o rascunho para poder retomá-lo depois.'
          : effectiveBpcContext
            ? 'Contexto BPC carregado. Escolha a minuta e gere sem redigitar os dados do caso.'
            : ''
    );
  }, [
    clients,
    effectiveBpcContext,
    initialClientCpf,
    initialClientId,
    initialClientName,
    initialDocument,
    initialGeneratedText,
    isOpen,
    template,
  ]);

  if (!isOpen || !template) return null;

  const persistDocument = async (
    content: string,
    client: Client,
    nextStatus: GeneratedDocumentStatus = documentStatus
  ) => {
    const firmId = settings?.firmId || initialDocument?.firmId || client.firmId;
    if (!firmId) {
      setSaveState('error');
      setSaveMessage('Não foi possível identificar o escritório. Aguarde a sincronização e tente novamente.');
      return false;
    }

    const now = getBrasiliaISO();
    const id = documentId || createGeneratedDocumentId();
    const createdAt = documentCreatedAt || now;
    const currentUser = auth.currentUser;
    const source: GeneratedDocument['source'] = initialDocument?.source
      || (effectiveBpcContext ? 'bpc' : (initialClientId || initialClientName || initialClientCpf ? 'clients' : 'documents'));

    const generatedDocument: GeneratedDocument = {
      id,
      title: initialDocument?.title || `${template.title} — ${client.name}`,
      content,
      status: nextStatus,
      source,
      templateId: initialDocument?.templateId || template.id,
      templateTitle: initialDocument?.templateTitle || template.title,
      templateSnapshot: initialDocument?.templateSnapshot || { ...template },
      clientId: initialDocument?.clientId || client.id,
      clientName: client.name,
      clientCpf: client.cpf,
      caseId: initialDocument?.caseId,
      bpcCaseId: initialDocument?.bpcCaseId || effectiveBpcContext?.id,
      bpcCaseSnapshot: effectiveBpcContext ? { ...effectiveBpcContext } : initialDocument?.bpcCaseSnapshot,
      workflowInstanceId: initialDocument?.workflowInstanceId,
      createdAt,
      updatedAt: now,
      createdByUid: initialDocument?.createdByUid || currentUser?.uid,
      createdByName: initialDocument?.createdByName || currentUser?.displayName || currentUser?.email || undefined,
    };

    setSaveState('saving');
    setSaveMessage('Salvando documento...');
    const saved = await saveGeneratedDocumentInFirestore(generatedDocument, firmId);

    if (!saved) {
      setSaveState('error');
      setSaveMessage('O documento está aberto, mas não pôde ser salvo no Firestore.');
      return false;
    }

    setDocumentId(id);
    setDocumentCreatedAt(createdAt);
    setDocumentStatus(nextStatus);
    setSaveState('saved');
    setSaveMessage(
      nextStatus === 'Finalizado'
        ? 'Documento finalizado e salvo.'
        : nextStatus === 'Arquivado'
          ? 'Documento arquivado. Ele continua preservado na biblioteca.'
          : 'Rascunho salvo. Você poderá retomá-lo pela biblioteca.'
    );
    return true;
  };

  const handleSelectClient = (clientId: string) => {
    setSelectedClientId(clientId);
    setGeneratedDoc(null);
    setDocumentId(null);
    setDocumentCreatedAt(null);
    setDocumentStatus('Rascunho');
    setSaveState('idle');
    setSaveMessage('');
  };

  const handleGenerateAndSave = async () => {
    if (!selectedClient || !replacementAnalysis) {
      setSaveState('error');
      setSaveMessage('Selecione um cliente cadastrado antes de gerar o documento.');
      return;
    }
    if (String(selectedClient.status) === 'Arquivado') {
      setSaveState('error');
      setSaveMessage('Cliente arquivado não pode iniciar um novo documento.');
      return;
    }

    const content = replacementAnalysis.replacedText;
    setGeneratedDoc(content);
    setViewMode('edit');
    await persistDocument(content, selectedClient, 'Rascunho');
  };

  const handleSaveDraft = async () => {
    if (!generatedDoc || !selectedClient) return;
    await persistDocument(generatedDoc, selectedClient, 'Rascunho');
  };

  const handleStatusChange = async (nextStatus: GeneratedDocumentStatus) => {
    if (!generatedDoc || !selectedClient) return;
    const saved = await persistDocument(generatedDoc, selectedClient, nextStatus);
    if (saved) setViewMode('preview');
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
    const cleanClient = (selectedClient?.name || initialDocument?.clientName || 'Cliente').replace(/[^a-zA-Z0-9_\-]/g, '_');
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
          currentY += 5.2;
        });
        currentY += line.trim() ? 1.5 : 3;
      });

      const cleanTemplate = template.title.replace(/[^a-zA-Z0-9_\-]/g, '_');
      const cleanClient = (selectedClient?.name || initialDocument?.clientName || 'Cliente').replace(/[^a-zA-Z0-9_\-]/g, '_');
      pdf.save(`${cleanTemplate}_${cleanClient}.pdf`);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      window.print();
    } finally {
      setExportingPdf(false);
    }
  };

  const missingClientCount = replacementAnalysis?.missingClientVariables.length || 0;
  const missingBpcCount = replacementAnalysis?.missingBpcVariables.length || 0;
  const isReadOnly = documentStatus !== 'Rascunho';
  const displayClientName = selectedClient?.name || initialDocument?.clientName || 'Cliente';
  const displayClientCpf = selectedClient?.cpf || initialDocument?.clientCpf || 'Não informado';

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 md:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white w-full max-w-5xl rounded-3xl p-5 md:p-7 border border-slate-200 shadow-2xl relative max-h-[94vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-2 rounded-full hover:bg-slate-100">
          <span className="material-symbols-outlined">close</span>
        </button>

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 mb-5 pr-12">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-900 shrink-0">
              <span className="material-symbols-outlined text-2xl">{template.icon || 'description'}</span>
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">{template.title}</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {effectiveBpcContext
                  ? `${effectiveBpcContext.modality === 'pcd' ? 'BPC PCD' : 'BPC Idoso'} • ${effectiveBpcContext.status}`
                  : 'Geração vinculada à ficha cadastral do cliente.'}
              </p>
            </div>
          </div>
          {generatedDoc && (
            <span className={`px-3 py-1.5 rounded-xl border text-xs font-bold self-start ${statusClasses[documentStatus]}`}>
              {documentStatus}
            </span>
          )}
        </div>

        {!generatedDoc ? (
          <div className="space-y-4 text-xs">
            {effectiveBpcContext && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div className="font-bold text-amber-950">Contexto BPC já carregado</div>
                <div className="text-amber-800 mt-1">
                  {effectiveBpcContext.clientName} • CPF {effectiveBpcContext.clientCpf} • {effectiveBpcContext.status}
                  {effectiveBpcContext.protocolNumber ? ` • Protocolo ${effectiveBpcContext.protocolNumber}` : ''}
                </div>
              </div>
            )}

            {selectedClient ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 flex items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-slate-900">{selectedClient.name}</div>
                  <div className="text-slate-500 mt-0.5">CPF {selectedClient.cpf}</div>
                </div>
                {!initialClientId && !effectiveBpcContext && (
                  <button type="button" onClick={() => handleSelectClient('')} className="text-xs font-bold text-blue-900 hover:underline">
                    Trocar cliente
                  </button>
                )}
              </div>
            ) : (
              <div>
                <label className="block font-bold text-slate-700 mb-1">Cliente cadastrado</label>
                <select
                  value={selectedClientId}
                  onChange={(event) => handleSelectClient(event.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-900"
                >
                  <option value="">Selecione um cliente...</option>
                  {eligibleClients.map((client) => (
                    <option key={client.id} value={client.id}>{client.name} — CPF: {client.cpf}</option>
                  ))}
                </select>
              </div>
            )}

            {selectedClient && (missingClientCount > 0 || missingBpcCount > 0) && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
                <div className="font-bold flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base">warning</span>
                  Dados ausentes usados por esta minuta
                </div>
                <p className="mt-1 text-[11px] leading-relaxed">
                  {missingClientCount > 0 ? `${missingClientCount} campo(s) da ficha do cliente` : ''}
                  {missingClientCount > 0 && missingBpcCount > 0 ? ' e ' : ''}
                  {missingBpcCount > 0 ? `${missingBpcCount} campo(s) do caso BPC` : ''} serão marcados como [Não informado].
                  O documento pode ser gerado agora e corrigido depois.
                </p>
              </div>
            )}

            {saveMessage && (
              <div className={`rounded-xl border px-3 py-2 font-semibold ${saveState === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-blue-100 bg-blue-50 text-blue-900'}`}>
                {saveMessage}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold">
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleGenerateAndSave}
                disabled={!selectedClient || saveState === 'saving'}
                className="flex-1 bg-[#0A1F44] disabled:opacity-50 py-3 rounded-xl text-white font-bold flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">save</span>
                <span>{saveState === 'saving' ? 'Salvando...' : 'Gerar e salvar rascunho'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={() => setViewMode('preview')} className={`px-3 py-2 rounded-xl text-xs font-bold ${viewMode === 'preview' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-700'}`}>
                  Visualizar
                </button>
                <button
                  onClick={() => setViewMode('edit')}
                  disabled={isReadOnly}
                  className={`px-3 py-2 rounded-xl text-xs font-bold disabled:opacity-40 ${viewMode === 'edit' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-700'}`}
                >
                  Editar texto
                </button>
                <span className="text-[11px] text-slate-500">{sourceLabel(initialDocument?.source || (effectiveBpcContext ? 'bpc' : 'documents'))}</span>
              </div>

              <div className="flex flex-wrap gap-2">
                <button onClick={handleCopy} className="px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs font-bold">
                  {copied ? 'Copiado!' : 'Copiar'}
                </button>
                <button onClick={handleDownloadTxt} className="px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs font-bold">TXT</button>
                <button onClick={handleExportPdf} disabled={exportingPdf} className="px-3 py-2 rounded-xl bg-[#0A1F44] text-white text-xs font-bold disabled:opacity-50">
                  {exportingPdf ? 'Gerando PDF...' : 'PDF'}
                </button>
                <button onClick={() => window.print()} className="px-3 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold">Imprimir</button>
              </div>
            </div>

            {saveMessage && (
              <div className={`rounded-xl border px-3 py-2 text-xs font-semibold ${saveState === 'error' ? 'border-red-200 bg-red-50 text-red-800' : saveState === 'dirty' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
                {saveMessage}
              </div>
            )}

            {viewMode === 'edit' && !isReadOnly ? (
              <textarea
                value={generatedDoc}
                onChange={(event) => {
                  setGeneratedDoc(event.target.value);
                  setSaveState('dirty');
                  setSaveMessage('Existem alterações ainda não salvas.');
                }}
                rows={22}
                className="w-full bg-slate-50 border border-slate-300 rounded-2xl p-4 font-mono text-xs text-slate-900 leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#0A1F44]"
              />
            ) : (
              <div className="overflow-x-auto p-3 sm:p-5 bg-slate-200/70 rounded-2xl border border-slate-300 max-h-[62vh] overflow-y-auto">
                <div className="bg-white mx-auto p-8 md:p-14 max-w-[760px] min-h-[900px] shadow-lg border border-slate-200">
                  {(settings?.firmName || settings?.firmSubtitle) && (
                    <div className="text-center border-b border-slate-300 pb-4 mb-7">
                      {settings?.firmName && <h1 className="text-xl font-black uppercase">{settings.firmName}</h1>}
                      {settings?.firmSubtitle && <p className="text-xs text-slate-500 mt-1">{settings.firmSubtitle}</p>}
                    </div>
                  )}
                  {renderFormattedDoc(generatedDoc)}
                  <div className="grid grid-cols-2 gap-8 mt-24 text-center text-xs">
                    <div className="border-t border-slate-800 pt-2">
                      <strong>{displayClientName}</strong>
                      <div className="text-slate-500">CPF {displayClientCpf}</div>
                    </div>
                    <div className="border-t border-slate-800 pt-2">
                      <strong>{settings?.lawyerName || '[Não informado]'}</strong>
                      <div className="text-slate-500">{settings?.oabNumber || '[Não informado]'}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col lg:flex-row gap-2 pt-1">
              {documentStatus === 'Rascunho' && (
                <>
                  <button
                    onClick={handleSaveDraft}
                    disabled={saveState === 'saving'}
                    className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold disabled:opacity-50"
                  >
                    Salvar rascunho
                  </button>
                  <button
                    onClick={() => handleStatusChange('Finalizado')}
                    disabled={saveState === 'saving'}
                    className="flex-1 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold disabled:opacity-50"
                  >
                    Finalizar documento
                  </button>
                </>
              )}
              {documentStatus === 'Finalizado' && (
                <button onClick={() => handleStatusChange('Rascunho')} className="flex-1 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
                  Reabrir como rascunho
                </button>
              )}
              {documentStatus === 'Arquivado' ? (
                <button onClick={() => handleStatusChange('Rascunho')} className="flex-1 py-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs font-bold">
                  Restaurar como rascunho
                </button>
              ) : (
                <button onClick={() => handleStatusChange('Arquivado')} className="flex-1 py-3 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-bold">
                  Arquivar
                </button>
              )}
              <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-[#0A1F44] text-white text-xs font-bold">Fechar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
