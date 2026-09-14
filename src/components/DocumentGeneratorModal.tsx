import React, { useRef } from 'react';
import { DocumentGeneratorOperationalModal } from './DocumentGeneratorOperationalModal';

type DocumentGeneratorModalProps = React.ComponentProps<typeof DocumentGeneratorOperationalModal>;

export const DocumentGeneratorModal: React.FC<DocumentGeneratorModalProps> = (props) => {
  // O modal é desmontado ao fechar. Durante uma abertura, congelamos a lista recebida
  // para que snapshots em tempo real de Clientes não apaguem texto ou estado do rascunho.
  const initialClients = useRef(props.clients);

  return (
    <DocumentGeneratorOperationalModal
      {...props}
      clients={initialClients.current}
    />
  );
};
