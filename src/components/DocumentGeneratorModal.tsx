import React, { useRef, useState } from 'react';
import { GeneratedDocument } from '../types/generatedDocument';
import { getBrasiliaISO } from '../utils/dateUtils';
import { saveGeneratedDocumentInFirestore } from '../services/generatedDocumentService';
import { DocumentGeneratorOperationalV2 } from './DocumentGeneratorOperationalV2';

type DocumentGeneratorModalProps = React.ComponentProps<typeof DocumentGeneratorOperationalV2>;

export const DocumentGeneratorModal: React.FC<DocumentGeneratorModalProps> = (props) => {
  // O modal é desmontado ao fechar. Durante uma abertura, congelamos a lista recebida
  // para que snapshots em tempo real de Clientes não apaguem texto ou estado do documento.
  const initialClients = useRef(props.clients);
  const [restoredDocument, setRestoredDocument] = useState<GeneratedDocument | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState('');
  const [copiedArchived, setCopiedArchived] = useState(false);

  const effectiveInitialDocument = restoredDocument || props.initialDocument || null;
  const archivedDocument = props.initialDocument?.status === 'Arquivado' && !restoredDocument
    ? props.initialDocument
    : null;

  const isArchivedTemplate = props.template?.status === 'Arquivado';
  const isReopeningExistingDocument = Boolean(effectiveInitialDocument);

  if (archivedDocument) {
    const restoreStatus = archivedDocument.statusBeforeArchive || 'Rascunho';

    const handleRestore = async () => {
      const linkedClient = initialClients.current.find((client) => client.id === archivedDocument.clientId);
      const firmId = archivedDocument.firmId || props.settings?.firmId || linkedClient?.firmId;
      if (!firmId) {
        setRestoreError('Não foi possível identificar o escritório deste documento.');
        return;
      }

      const restored: GeneratedDocument = {
        ...archivedDocument,
        status: restoreStatus,
        statusBeforeArchive: null,
        updatedAt: getBrasiliaISO(),
      };

      setRestoring(true);
      setRestoreError('');
      const saved = await saveGeneratedDocumentInFirestore(restored, firmId);
      setRestoring(false);

      if (!saved) {
        setRestoreError('Não foi possível restaurar o documento no Firestore.');
        return;
      }

      setRestoredDocument(restored);
    };

    const handleCopy = async () => {
      await navigator.clipboard.writeText(archivedDocument.content);
      setCopiedArchived(true);
      window.setTimeout(() => setCopiedArchived(false), 1600);
    };

    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
        <div className="bg-white w-full max-w-4xl rounded-3xl border border-slate-200 shadow-2xl p-6 max-h-[92vh] overflow-y-auto">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <div className="inline-flex px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-bold mb-2">Documento arquivado</div>
              <h3 className="text-lg font-black text-slate-900">{archivedDocument.title}</h3>
              <p className="text-xs text-slate-500 mt-1">{archivedDocument.clientName} • CPF {archivedDocument.clientCpf}</p>
            </div>
            <button type="button" onClick={props.onClose} className="p-2 rounded-full hover:bg-slate-100 text-slate-500">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          {restoreError && (
            <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-800">{restoreError}</div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 max-h-[58vh] overflow-y-auto">
            <pre className="whitespace-pre-wrap font-serif text-xs md:text-sm leading-relaxed text-slate-800">{archivedDocument.content}</pre>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row gap-2">
            <button type="button" onClick={handleCopy} className="flex-1 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-bold">
              {copiedArchived ? 'Copiado!' : 'Copiar conteúdo'}
            </button>
            <button
              type="button"
              onClick={handleRestore}
              disabled={restoring}
              className="flex-1 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold disabled:opacity-50"
            >
              {restoring ? 'Restaurando...' : `Restaurar como ${restoreStatus}`}
            </button>
            <button type="button" onClick={props.onClose} className="flex-1 py-2.5 rounded-xl bg-[#0A1F44] text-white text-xs font-bold">Fechar</button>
          </div>
        </div>
      </div>
    );
  }

  if (isArchivedTemplate && !isReopeningExistingDocument) {
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <div className="bg-white w-full max-w-md rounded-3xl border border-slate-200 shadow-2xl p-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-2xl">archive</span>
          </div>
          <h3 className="text-base font-black text-slate-900 mt-4">Modelo arquivado</h3>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            Este modelo não pode iniciar novos documentos. Restaure-o na Central de Documentos se ele voltar a fazer parte da operação do escritório.
          </p>
          <button
            type="button"
            onClick={props.onClose}
            className="mt-5 w-full py-2.5 rounded-xl bg-[#0A1F44] text-white text-xs font-bold"
          >
            Fechar
          </button>
        </div>
      </div>
    );
  }

  return (
    <DocumentGeneratorOperationalV2
      {...props}
      initialDocument={effectiveInitialDocument}
      clients={initialClients.current}
    />
  );
};
