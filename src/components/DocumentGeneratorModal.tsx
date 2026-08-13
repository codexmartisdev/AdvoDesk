import React, { useState, useEffect, useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { DocumentTemplate, Client, FirmSettings } from '../types';
import { LOGO_IMAGE_URL, USER_AVATAR_URL } from '../data/mockData';

interface DocumentGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: DocumentTemplate | null;
  clients: Client[];
  initialClientName?: string;
  initialClientCpf?: string;
  initialGeneratedText?: string;
  settings?: FirmSettings;
  onSaveTemplate?: (template: DocumentTemplate) => void;
}

export const DocumentGeneratorModal: React.FC<DocumentGeneratorModalProps> = ({
  isOpen,
  onClose,
  template,
  clients,
  initialClientName,
  initialClientCpf,
  initialGeneratedText,
  settings = {
    firmName: 'BIZERRA NETO ADVOCACIA',
    firmSubtitle: 'Direito Previdenciário',
    logoUrl: LOGO_IMAGE_URL,
    lawyerName: 'Dr. Francisco Bizerra Neto',
    lawyerTitle: 'Advogado Sócio • OAB-PI nº 24.334',
    lawyerAvatarUrl: USER_AVATAR_URL,
    oabNumber: 'OAB-PI nº 24.334',
    practiceAreas: [],
    clientCategories: [],
  },
  onSaveTemplate,
}) => {
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [clientName, setClientName] = useState(initialClientName || 'João Silva e Oliveira');
  const [clientCpf, setClientCpf] = useState(initialClientCpf || '123.456.789-00');
  const [caseDetails, setCaseDetails] = useState('');
  const [customClauses, setCustomClauses] = useState('');
  const [generatedDoc, setGeneratedDoc] = useState<string | null>(initialGeneratedText || null);
  const [docSource, setDocSource] = useState<'ai' | 'template'>('ai');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [viewMode, setViewMode] = useState<'preview' | 'edit'>('preview');
  const [templateSaveStatus, setTemplateSaveStatus] = useState<string | null>(null);
  const [isTemplateModified, setIsTemplateModified] = useState(false);

  const docPrintRef = useRef<HTMLDivElement>(null);

  const handleSaveAsTemplatePattern = () => {
    if (!template || !generatedDoc || !onSaveTemplate) return;
    const updatedTemplate: DocumentTemplate = {
      ...template,
      contentPattern: generatedDoc,
    };
    onSaveTemplate(updatedTemplate);
    setIsTemplateModified(false);
    setTemplateSaveStatus('Modelo de minuta salvo com sucesso no banco de dados para os próximos usos!');
    setTimeout(() => setTemplateSaveStatus(null), 5000);
  };

  useEffect(() => {
    if (initialClientName) setClientName(initialClientName);
    if (initialClientCpf) setClientCpf(initialClientCpf);
    if (initialGeneratedText) {
      setGeneratedDoc(initialGeneratedText);
      setViewMode('preview');
    }
  }, [initialClientName, initialClientCpf, initialGeneratedText, isOpen]);

  const handleSelectClient = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedClientId(id);
    const found = clients.find((c) => c.id === id);
    if (found) {
      setClientName(found.name);
      setClientCpf(found.cpf);
    }
  };

  if (!isOpen || !template) return null;

  const handleGenerate = async () => {
    setLoading(true);
    setGeneratedDoc(null);

    try {
      const res = await fetch('/api/generate-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateTitle: template.title,
          templateContent: template.contentPattern,
          clientName,
          clientCpf,
          caseDetails,
          customClauses,
        }),
      });

      const data = await res.json();
      setGeneratedDoc(data.documentText || 'Não foi possível gerar a minuta.');
      if (data.source) {
        setDocSource(data.source);
      }
      setViewMode('preview');
    } catch (err) {
      console.error(err);
      setGeneratedDoc('Erro na conexão com o servidor de minutas.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!generatedDoc) return;
    navigator.clipboard.writeText(generatedDoc);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTxt = () => {
    if (!generatedDoc) return;
    const blob = new Blob([generatedDoc], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const title = template?.title || 'Documento';
    const cleanTitle = title.replace(/[^a-zA-Z0-9_\-]/g, '_');
    const cleanClient = (clientName || 'Cliente').replace(/[^a-zA-Z0-9_\-]/g, '_');
    a.download = `${cleanTitle}_${cleanClient}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = async () => {
    if (!generatedDoc) return;
    setExportingPdf(true);
    try {
      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
      const pageWidth = pdf.internal.pageSize.getWidth(); // 210mm
      const pageHeight = pdf.internal.pageSize.getHeight(); // 297mm
      const marginTop = 20;
      const marginBottom = 20;
      const marginLeft = 18;
      const marginRight = 18;
      const contentWidth = pageWidth - marginLeft - marginRight; // 174mm
      let currentY = marginTop;

      const checkAddPage = (neededHeight: number) => {
        if (currentY + neededHeight > pageHeight - marginBottom) {
          pdf.addPage();
          currentY = marginTop;
          return true;
        }
        return false;
      };

      // 1. Header Logo
      const logoSrc = settings?.logoUrl || LOGO_IMAGE_URL;
      if (logoSrc) {
        try {
          const logoDataUrl = await new Promise<string | null>((resolve) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => {
              try {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth || img.width;
                canvas.height = img.naturalHeight || img.height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  ctx.drawImage(img, 0, 0);
                  resolve(canvas.toDataURL('image/png'));
                } else {
                  resolve(null);
                }
              } catch (e) {
                resolve(null);
              }
            };
            img.onerror = () => resolve(null);
            img.src = logoSrc;
          });

          if (logoDataUrl) {
            const logoImg = new Image();
            logoImg.src = logoDataUrl;
            await new Promise((r) => { logoImg.onload = r; logoImg.onerror = r; });
            const aspect = logoImg.width && logoImg.height ? logoImg.width / logoImg.height : 2.5;
            const logoH = 16;
            const logoW = Math.min(65, logoH * aspect);
            const logoX = (pageWidth - logoW) / 2;

            pdf.addImage(logoDataUrl, 'PNG', logoX, currentY, logoW, logoH);
            currentY += logoH + 4;
          }
        } catch (e) {
          console.warn('Could not render logo in PDF:', e);
        }
      }

      // 2. Firm Title
      pdf.setFont('times', 'bold');
      pdf.setFontSize(14);
      pdf.setTextColor(10, 31, 68); // #0A1F44
      pdf.text(settings?.firmName || 'BIZERRA NETO ADVOCACIA', pageWidth / 2, currentY, { align: 'center' });
      currentY += 5;

      // Header Divider Line
      pdf.setDrawColor(10, 31, 68);
      pdf.setLineWidth(0.4);
      pdf.line(marginLeft, currentY, pageWidth - marginRight, currentY);
      currentY += 4.5;

      // Firm Subtitle
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8.5);
      pdf.setTextColor(100, 116, 139); // slate-500
      pdf.text((settings?.firmSubtitle || 'Direito Previdenciário').toUpperCase(), pageWidth / 2, currentY, { align: 'center' });
      currentY += 10;

      // 3. Document Body Text
      const lines = generatedDoc.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();

        const isHeader = trimmed.startsWith('#') || trimmed.includes('##');

        if (isHeader) {
          checkAddPage(12);
          const cleanText = trimmed.replace(/#+/g, '').replace(/\*\*/g, '').trim().toUpperCase();
          pdf.setFont('times', 'bold');
          pdf.setFontSize(11);
          pdf.setTextColor(10, 31, 68);

          const headerLines = pdf.splitTextToSize(cleanText, contentWidth);
          for (const hLine of headerLines) {
            checkAddPage(6);
            pdf.text(hLine, marginLeft, currentY);
            currentY += 5.5;
          }
          pdf.setDrawColor(226, 232, 240);
          pdf.setLineWidth(0.2);
          pdf.line(marginLeft, currentY - 1, pageWidth - marginRight, currentY - 1);
          currentY += 4;
        } else if (trimmed === '') {
          currentY += 3.5;
        } else {
          const cleanLine = line.replace(/\*\*/g, '');
          pdf.setFont('times', 'normal');
          pdf.setFontSize(10.5);
          pdf.setTextColor(15, 23, 42); // slate-900

          const wrappedLines = pdf.splitTextToSize(cleanLine, contentWidth);
          for (const wLine of wrappedLines) {
            checkAddPage(5.5);
            pdf.text(wLine, marginLeft, currentY);
            currentY += 5.2;
          }
          currentY += 2;
        }
      }

      // 4. Signatures
      checkAddPage(55);
      currentY += 28; // Espaçamento amplo antes da linha de assinatura física

      const colWidth = 65;
      const col1X = marginLeft + 8;
      const col2X = pageWidth - marginRight - colWidth - 8;

      // Signature lines
      pdf.setDrawColor(30, 41, 59);
      pdf.setLineWidth(0.3);
      pdf.line(col1X, currentY, col1X + colWidth, currentY);
      pdf.line(col2X, currentY, col2X + colWidth, currentY);
      currentY += 5;

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(15, 23, 42);
      pdf.text((clientName || 'CLIENTE').toUpperCase(), col1X + colWidth / 2, currentY, { align: 'center' });
      pdf.text((settings.lawyerName || 'Dr. Francisco Bizerra Neto').toUpperCase(), col2X + colWidth / 2, currentY, { align: 'center' });
      currentY += 4;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(71, 85, 105);
      pdf.text(`CPF: ${clientCpf}`, col1X + colWidth / 2, currentY, { align: 'center' });
      pdf.text(settings.oabNumber || 'OAB-PI nº 24.334', col2X + colWidth / 2, currentY, { align: 'center' });
      currentY += 4;

      pdf.setFont('helvetica', 'italic');
      pdf.setFontSize(7.5);
      pdf.setTextColor(148, 163, 184);
      pdf.text('Contratante / Outorgante', col1X + colWidth / 2, currentY, { align: 'center' });
      pdf.text('Advogado Sócio / Outorgado', col2X + colWidth / 2, currentY, { align: 'center' });
      currentY += 14;

      // 5. Footer
      checkAddPage(15);
      pdf.setDrawColor(10, 31, 68);
      pdf.setLineWidth(0.3);
      pdf.line(marginLeft, currentY, pageWidth - marginRight, currentY);
      currentY += 4;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(51, 65, 85);
      pdf.text('Rua dos Araújos, 150, Bairro Frei Higino — Parnaíba/PI', pageWidth / 2, currentY, { align: 'center' });
      currentY += 3.5;

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(10, 31, 68);
      pdf.text(settings.oabNumber || 'OAB-PI nº 24.334', pageWidth / 2, currentY, { align: 'center' });

      // Save PDF
      const title = template?.title || 'Documento';
      const cleanTitle = title.replace(/[^a-zA-Z0-9_\-]/g, '_');
      const cleanClient = (clientName || 'Cliente').replace(/[^a-zA-Z0-9_\-]/g, '_');
      pdf.save(`${cleanTitle}_${cleanClient}.pdf`);
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      alert('Iniciando impressão do documento via navegador...');
      window.print();
    } finally {
      setExportingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const renderFormattedDoc = (text: string | null) => {
    if (!text) return null;

    const lines = text.split('\n');

    return (
      <div className="space-y-1.5 font-serif text-slate-900 text-xs md:text-sm leading-relaxed text-justify">
        {lines.map((line, lineIdx) => {
          const trimmed = line.trim();

          // Check if line contains ## or starts with # or ##
          const isHeader = trimmed.startsWith('#') || trimmed.includes('##');

          if (isHeader) {
            // Remove # or ## symbols to get clean text
            const cleanText = line.replace(/#+/g, '').trim();
            const processedHeader = cleanText.replace(/\*\*/g, '');

            return (
              <div
                key={lineIdx}
                className="font-bold text-slate-950 font-serif my-3 text-xs md:text-sm uppercase tracking-wide border-b border-slate-100 pb-1 pt-1"
              >
                {processedHeader}
              </div>
            );
          }

          if (trimmed === '') {
            return <div key={lineIdx} className="h-3" />;
          }

          // If line is an explicit physical signature line in text (e.g., ____ or X___)
          if (trimmed.startsWith('X____') || trimmed.startsWith('_____') || trimmed.startsWith('X___') || (trimmed.startsWith('X') && trimmed.includes('_____'))) {
            return (
              <div key={lineIdx} className="pt-16 md:pt-20 pb-2 font-mono text-slate-800 text-center">
                {line}
              </div>
            );
          }

          // Process inline **bold** text for standard lines
          const parts = line.split(/(\*\*.*?\*\*)/g);

          return (
            <p key={lineIdx} className="min-h-[1.2em]">
              {parts.map((part, partIdx) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                  const boldContent = part.slice(2, -2);
                  return (
                    <strong key={partIdx} className="font-bold text-slate-950">
                      {boldContent}
                    </strong>
                  );
                }
                return <span key={partIdx}>{part}</span>;
              })}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-4xl rounded-3xl p-5 md:p-8 border border-slate-200 shadow-2xl relative max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-2 rounded-full hover:bg-slate-100"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-900 font-bold shrink-0">
            <span className="material-symbols-outlined">{template.icon}</span>
          </div>
          <div>
            <h2 className="font-display-lg text-xl font-extrabold text-slate-900">Gerar {template.title}</h2>
            <p className="text-xs text-slate-500">
              Inclusão automática da marca {settings.firmName} {settings.firmSubtitle} e exportação oficial em PDF.
            </p>
          </div>
        </div>

        {!generatedDoc ? (
          /* Form Step */
          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Selecione o Cliente (Ficha Cadastral)</label>
              <select
                value={selectedClientId}
                onChange={handleSelectClient}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-900"
              >
                <option value="">Selecione da lista de clientes cadastrados...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — CPF: {c.cpf}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nome do Contratante / Outorgante</label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-900"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">CPF / MF</label>
                <input
                  type="text"
                  required
                  value={clientCpf}
                  onChange={(e) => setClientCpf(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-900"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Detalhes do Objeto do Caso / Escopo</label>
              <textarea
                rows={2}
                value={caseDetails}
                onChange={(e) => setCaseDetails(e.target.value)}
                placeholder="Ex: Ação previdenciária de concessão de Auxílio-Acidente perante o INSS..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Cláusulas Especiais / Observações Adicionais</label>
              <textarea
                rows={2}
                value={customClauses}
                onChange={(e) => setCustomClauses(e.target.value)}
                placeholder="Ex: Honorários de 35%, autorização para levantamento de RPVs e requisição perante Caixa e BB..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900"
              />
            </div>

            <div className="pt-4 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={loading}
                className="flex-1 glass-btn-primary py-3 rounded-xl text-white font-bold flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                    <span>Redigindo Documento com IA...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">auto_awesome</span>
                    <span>Gerar Documento com Logo</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Result Step: Document Generated with Standard Official Letterhead */
          <div className="space-y-4">
            {/* Action Bar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1 bg-white p-1 rounded-xl border border-slate-200">
                  <button
                    onClick={() => setViewMode('preview')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      viewMode === 'preview'
                        ? 'bg-[#0A1F44] text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Papel Timbrado Oficial (PDF)
                  </button>
                  <button
                    onClick={() => setViewMode('edit')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      viewMode === 'edit'
                        ? 'bg-[#0A1F44] text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Editar Minuta
                  </button>
                </div>

                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                  docSource === 'ai'
                    ? 'bg-amber-50 text-amber-900 border-amber-200'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}>
                  <span className="material-symbols-outlined text-xs">
                    {docSource === 'ai' ? 'auto_awesome' : 'description'}
                  </span>
                  <span>{docSource === 'ai' ? 'Redigido com IA Gemini' : 'Modelo Paramétrico Padrão'}</span>
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 justify-end">
                <button
                  onClick={handleCopy}
                  className="px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 hover:bg-slate-100 text-xs font-bold flex items-center gap-1 shadow-xs"
                >
                  <span className="material-symbols-outlined text-xs">
                    {copied ? 'check' : 'content_copy'}
                  </span>
                  <span>{copied ? 'Copiado!' : 'Copiar'}</span>
                </button>

                <button
                  onClick={handleDownloadTxt}
                  className="px-3 py-2 rounded-xl bg-slate-200 text-slate-800 hover:bg-slate-300 text-xs font-bold flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-xs">description</span>
                  <span>TXT</span>
                </button>

                <button
                  onClick={handleExportPDF}
                  disabled={exportingPdf}
                  className="px-4 py-2 rounded-xl bg-[#0A1F44] hover:bg-slate-900 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition-all"
                >
                  {exportingPdf ? (
                    <>
                      <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                      <span>Gerando PDF...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
                      <span>Baixar em PDF</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handlePrint}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all"
                  title="Imprimir ou Salvar via Navegador"
                >
                  <span className="material-symbols-outlined text-sm">print</span>
                  <span>Imprimir</span>
                </button>
              </div>
            </div>

            {/* Document Content */}
            {viewMode === 'preview' ? (
              <div className="overflow-x-auto p-2 sm:p-4 bg-slate-200/80 rounded-2xl border border-slate-300 max-h-[64vh] overflow-y-auto">
                {/* Printable Document Container (Standard Official Corporate Letterhead) */}
                <div
                  ref={docPrintRef}
                  id="printable-document"
                  className="bg-white mx-auto my-2 p-8 md:p-14 text-slate-900 font-serif shadow-xl rounded-none max-w-[760px] text-justify relative overflow-hidden border border-slate-200"
                  style={{
                    minHeight: '960px',
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  {/* Document Container */}
                  <div className="relative z-10 min-h-[860px] flex flex-col justify-between space-y-8">
                    {/* HEADER */}
                    <div className="text-center space-y-2">
                      {/* Centered Office Logo Image */}
                      <div className="flex justify-center mb-2">
                        <img
                          src={settings?.logoUrl || LOGO_IMAGE_URL}
                          alt={settings?.firmName || 'Logo do Escritório'}
                          className="h-16 md:h-20 w-auto object-contain mx-auto"
                          referrerPolicy="no-referrer"
                        />
                      </div>

                      <h1
                        className="text-2xl md:text-3xl font-black tracking-widest uppercase font-serif"
                        style={{ color: '#0A1F44' }}
                      >
                        {settings?.firmName || 'BIZERRA NETO ADVOCACIA'}
                      </h1>

                      {/* Header Divider Line (Dark Blue Accent Line) */}
                      <div className="w-full h-[1.5px] my-2" style={{ backgroundColor: '#0A1F44' }} />

                      <p className="text-xs md:text-sm font-sans font-semibold tracking-wider uppercase text-slate-600">
                        {settings?.firmSubtitle || 'Direito Previdenciário'}
                      </p>
                    </div>

                    {/* BODY AREA */}
                    <div className="font-serif text-slate-900 space-y-3 text-xs md:text-sm leading-relaxed tracking-normal font-normal flex-1 py-4">
                      {renderFormattedDoc(generatedDoc)}
                    </div>

                    {/* SIGNATURES & FOOTER */}
                    <div className="pt-16 md:pt-24 space-y-10 shrink-0">
                      {/* Signatures */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-center text-xs font-sans pt-8">
                        <div className="space-y-2">
                          <div className="w-52 md:w-64 mx-auto border-b-2 border-slate-900 pb-1" />
                          <p className="font-bold text-slate-900 uppercase text-[11px]">{clientName}</p>
                          <p className="text-[10px] text-slate-600">CPF: {clientCpf}</p>
                          <p className="text-[9px] text-slate-400 italic">Contratante / Outorgante</p>
                        </div>

                        <div className="space-y-2">
                          <div className="w-52 md:w-64 mx-auto border-b-2 border-slate-900 pb-1" />
                          <p className="font-bold uppercase text-[11px]" style={{ color: '#0A1F44' }}>
                            {settings.lawyerName || 'Dr. Francisco Bizerra Neto'}
                          </p>
                          <p className="text-[10px] font-bold" style={{ color: '#0A1F44' }}>
                            OAB-PI nº 24.334
                          </p>
                          <p className="text-[9px] text-slate-400 italic">Advogado Sócio / Outorgado</p>
                        </div>
                      </div>

                      {/* Footer Section */}
                      <div className="pt-2 text-center space-y-1">
                        {/* Footer Divider Line */}
                        <div className="w-full h-[1px] mb-2" style={{ backgroundColor: '#0A1F44' }} />

                        <p className="text-[10px] md:text-[11px] font-sans font-medium text-slate-700">
                          Rua dos Araújos, 150, Bairro Frei Higino — Parnaíba/PI
                        </p>
                        <p className="text-[10px] font-sans font-bold tracking-wider" style={{ color: '#0A1F44' }}>
                          OAB-PI nº 24.334
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {templateSaveStatus && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center justify-between animate-in fade-in">
                    <div className="flex items-center space-x-2">
                      <span className="material-symbols-outlined text-sm text-emerald-600">check_circle</span>
                      <span>{templateSaveStatus}</span>
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-slate-100 p-2.5 rounded-xl border border-slate-200">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-slate-500">edit_note</span>
                    <span>Editando Texto da Minuta</span>
                  </span>

                  {template && onSaveTemplate && (
                    <button
                      onClick={handleSaveAsTemplatePattern}
                      className="px-3.5 py-1.5 bg-[#0A1F44] hover:bg-slate-900 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
                      title="Salvar estas alterações como padrão oficial do Modelo no banco de dados"
                    >
                      <span className="material-symbols-outlined text-xs">save</span>
                      <span>Salvar Alterações no Modelo (Para Uso Futuro)</span>
                    </button>
                  )}
                </div>

                <textarea
                  value={generatedDoc || ''}
                  onChange={(e) => {
                    setGeneratedDoc(e.target.value);
                    setIsTemplateModified(true);
                    setTemplateSaveStatus(null);
                  }}
                  rows={18}
                  className="w-full bg-slate-50 border border-slate-300 rounded-2xl p-4 font-mono text-xs text-slate-900 leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#0A1F44] shadow-inner"
                />
              </div>
            )}

            {/* Bottom Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setGeneratedDoc(null)}
                className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold"
              >
                Voltar e Ajustar Parâmetros
              </button>
              <button
                onClick={() => {
                  if (isTemplateModified && template && generatedDoc && onSaveTemplate) {
                    onSaveTemplate({
                      ...template,
                      contentPattern: generatedDoc,
                    });
                  }
                  onClose();
                }}
                className="flex-1 bg-[#0A1F44] hover:bg-slate-900 py-3 rounded-xl text-white text-xs font-extrabold flex items-center justify-center gap-2 transition-all shadow-md"
              >
                <span className="material-symbols-outlined text-sm">check_circle</span>
                <span>Concluir e Salvar</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
