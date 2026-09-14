import React, { useRef } from 'react';
import { DocumentGeneratorOperationalV2 } from './DocumentGeneratorOperationalV2';

type DocumentGeneratorModalProps = React.ComponentProps<typeof DocumentGeneratorOperationalV2>;

export const DocumentGeneratorModal: React.FC<DocumentGeneratorModalProps> = (props) => {
  // O modal é desmontado ao fechar. Durante uma abertura, congelamos a lista recebida
  // para que snapshots em tempo real de Clientes não apaguem texto ou estado do documento.
  const initialClients = useRef(props.clients);

  const isArchivedTemplate = props.template?.status === 'Arquivado';
  const isReopeningExistingDocument = Boolean(props.initialDocument);

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
      clients={initialClients.current}
    />
  );
};
