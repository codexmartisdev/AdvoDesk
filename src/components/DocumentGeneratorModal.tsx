import React, { useRef } from 'react';
import { DocumentGeneratorOperationalV2 } from './DocumentGeneratorOperationalV2';

type DocumentGeneratorModalProps = React.ComponentProps<typeof DocumentGeneratorOperationalV2>;

export const DocumentGeneratorModal: React.FC<DocumentGeneratorModalProps> = (props) => {
  // O modal é desmontado ao fechar. Durante uma abertura, congelamos a lista recebida
  // para que snapshots em tempo real de Clientes não apaguem texto ou estado do documento.
  const initialClients = useRef(props.clients);

  return (
    <DocumentGeneratorOperationalV2
      {...props}
      clients={initialClients.current}
    />
  );
};
