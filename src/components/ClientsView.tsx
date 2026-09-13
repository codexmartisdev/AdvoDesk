import React, { useState } from 'react';
import { Client } from '../types';
import { ClientDetailOperationalModal } from './ClientDetailOperationalModal';

type LifecycleClient = Client & {
  statusBeforeArchive?: string;
  archivedAt?: string;
  restoredAt?: string;
};

interface ClientsViewProps {
  clients: Client[];
  searchQuery: string;
  onOpenAddClientModal: () => void;
  onSelectClientForDoc: (client: Client) => void;
  onSaveClient?: (updatedClient: Client) => void;
  onDeleteClient?: (clientId: string) => void;
  clientCategories?: string[];
}

const normalizeStatus = (status?: string) => {
  if (status === 'Active') return 'Ativo';
  if (status === 'Pending') return 'Pendente';
  if (status === 'Draft') return 'Rascunho';
  return status || 'Ativo';
};

export const ClientsView: React.FC<ClientsViewProps> = ({
  clients,
  searchQuery,
  onOpenAddClientModal,
  onSelectClientForDoc,
  onSaveClient = (_updated: Client) => {},
  clientCategories,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'updated'>('updated');
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientToArchive, setClientToArchive] = useState<Client | null>(null);

  const filteredClients = clients.filter((client) => {
    const normalizedSearch = searchQuery.toLowerCase().trim();
    const status = normalizeStatus(String(client.status));
    const matchesSearch =
      client.name.toLowerCase().includes(normalizedSearch) ||
      (client.code || '').toLowerCase().includes(normalizedSearch) ||
      (client.cpf || '').includes(searchQuery) ||
      (client.typePill || '').toLowerCase().includes(normalizedSearch);

    if (filterStatus === 'all') return matchesSearch;
    return matchesSearch && status.toLowerCase() === filterStatus.toLowerCase();
  });

  const sortedClients = [...filteredClients].sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    return (b.updatedAt || '').localeCompare(a.updatedAt || '');
  });

  const archiveClient = (client: Client) => {
    const currentStatus = normalizeStatus(String(client.status));
    const updated: LifecycleClient = {
      ...client,
      statusBeforeArchive: currentStatus === 'Arquivado' ? 'Ativo' : currentStatus,
      status: 'Arquivado' as Client['status'],
      archivedAt: new Date().toISOString(),
      updatedAt: 'Arquivado agora',
    };
    onSaveClient(updated);
    setSelectedClient((current) => current?.id === client.id ? updated : current);
    setClientToArchive(null);
  };

  const restoreClient = (client: Client) => {
    const lifecycle = client as LifecycleClient;
    const previousStatus = lifecycle.statusBeforeArchive;
    const restoredStatus = previousStatus && previousStatus !== 'Arquivado' ? previousStatus : 'Ativo';
    const updated: LifecycleClient = {
      ...client,
      status: restoredStatus as Client['status'],
      restoredAt: new Date().toISOString(),
      updatedAt: 'Restaurado agora',
    };
    onSaveClient(updated);
    setSelectedClient((current) => current?.id === client.id ? updated : current);
  };

  return (
    <main className="md:ml-64 pt-16 md:pt-8 pb-12 px-4 sm:px-6 md:px-8 min-h-screen relative z-10 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-200/60 gap-4">
        <div>
          <h2 className="font-display-lg text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Clientes</h2>
          <p className="text-slate-600 text-sm mt-1">Gestão da ficha cadastral, carteira ativa e clientes arquivados da banca.</p>
        </div>

        <div className="flex items-center space-x-3 relative shrink-0">
          <div className="relative">
            <button
              onClick={() => { setFilterDropdownOpen(!filterDropdownOpen); setSortDropdownOpen(false); }}
              className="bg-white hover:bg-slate-50 border border-slate-300 px-4 py-2 rounded-xl flex items-center space-x-2 text-slate-800 text-xs md:text-sm font-medium shadow-xs transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">filter_list</span>
              <span>{filterStatus === 'all' ? 'Filtrar' : `Status: ${filterStatus}`}</span>
            </button>

            {filterDropdownOpen && (
              <div className="absolute right-0 top-11 w-52 bg-white rounded-2xl p-2 z-30 border border-slate-200 shadow-xl">
                {[
                  ['all', 'Todos os clientes'],
                  ['Ativo', 'Status: Ativo'],
                  ['Pendente', 'Status: Pendente'],
                  ['Rascunho', 'Status: Rascunho'],
                  ['Arquivado', 'Status: Arquivado'],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => { setFilterStatus(value); setFilterDropdownOpen(false); }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold ${filterStatus === value ? 'bg-blue-50 text-blue-900' : 'text-slate-700 hover:bg-slate-100'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => { setSortDropdownOpen(!sortDropdownOpen); setFilterDropdownOpen(false); }}
              className="bg-white hover:bg-slate-50 border border-slate-300 px-4 py-2 rounded-xl flex items-center space-x-2 text-slate-800 text-xs md:text-sm font-medium shadow-xs transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">sort</span>
              <span>Ordem: {sortBy === 'name' ? 'Nome' : 'Atualização'}</span>
            </button>

            {sortDropdownOpen && (
              <div className="absolute right-0 top-11 w-48 bg-white rounded-2xl p-2 z-30 border border-slate-200 shadow-xl">
                <button onClick={() => { setSortBy('updated'); setSortDropdownOpen(false); }} className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold ${sortBy === 'updated' ? 'bg-blue-50 text-blue-900' : 'text-slate-700 hover:bg-slate-100'}`}>Mais recentes</button>
                <button onClick={() => { setSortBy('name'); setSortDropdownOpen(false); }} className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold ${sortBy === 'name' ? 'bg-blue-50 text-blue-900' : 'text-slate-700 hover:bg-slate-100'}`}>Ordem alfabética (A-Z)</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-3.5">
        {sortedClients.map((client) => {
          const status = normalizeStatus(String(client.status));
          const archived = status === 'Arquivado';
          const initials = client.name.split(' ').filter(Boolean).slice(0, 2).map((name) => name[0]).join('').toUpperCase();

          return (
            <div
              key={client.id}
              onClick={() => setSelectedClient(client)}
              className={`glass-panel rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white border shadow-xs hover:shadow-md transition-all cursor-pointer group ${archived ? 'border-slate-300 opacity-80' : 'border-slate-200/90 hover:border-slate-300'}`}
            >
              <div className="flex items-center space-x-4">
                {client.avatarUrl ? (
                  <div className="w-12 h-12 rounded-full overflow-hidden border border-slate-300 shrink-0 shadow-xs"><img src={client.avatarUrl} alt={client.name} className="w-full h-full object-cover" /></div>
                ) : (
                  <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center shrink-0"><span className="font-title-md text-slate-700 font-bold text-sm">{initials || 'CL'}</span></div>
                )}
                <div>
                  <h3 className="font-title-md text-base text-slate-900 font-bold group-hover:text-blue-900 transition-colors">{client.name}</h3>
                  <div className="flex flex-wrap items-center mt-0.5 gap-x-3 gap-y-1 text-xs">
                    <span className="text-slate-500 font-medium">CPF: {client.cpf}</span>
                    <span className="text-slate-500 font-medium">Cód: {client.code}</span>
                    <span className="text-slate-400">{client.updatedAt}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 md:gap-4 self-end md:self-center shrink-0">
                <span className="px-3.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-900 text-xs font-bold">{client.typePill || 'Sem categoria'}</span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                  status === 'Ativo' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                  status === 'Pendente' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                  status === 'Arquivado' ? 'bg-slate-100 text-slate-700 border-slate-300' :
                  'bg-slate-100 text-slate-700 border-slate-200'
                }`}>{status}</span>

                {!archived && (
                  <button
                    type="button"
                    onClick={(event) => { event.stopPropagation(); onSelectClientForDoc(client); }}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 text-xs font-bold rounded-xl flex items-center gap-1 transition-colors"
                    title="Preparar documentos para este cliente"
                  >
                    <span className="material-symbols-outlined text-sm">description</span><span className="hidden sm:inline">Documentos</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={(event) => { event.stopPropagation(); setSelectedClient(client); }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">edit</span><span className="hidden sm:inline">Ver / Editar</span>
                </button>

                {archived ? (
                  <button
                    type="button"
                    onClick={(event) => { event.stopPropagation(); restoreClient(client); }}
                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-xl flex items-center gap-1"
                    title="Restaurar cliente"
                  >
                    <span className="material-symbols-outlined text-sm">unarchive</span><span className="hidden sm:inline">Restaurar</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={(event) => { event.stopPropagation(); setClientToArchive(client); }}
                    className="px-3 py-1.5 bg-slate-50 hover:bg-amber-50 text-slate-600 hover:text-amber-800 border border-slate-200 hover:border-amber-200 text-xs font-bold rounded-xl flex items-center gap-1"
                    title="Arquivar cliente sem excluir dados"
                  >
                    <span className="material-symbols-outlined text-sm">archive</span><span className="hidden sm:inline">Arquivar</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {sortedClients.length === 0 && <div className="bg-white rounded-2xl p-8 text-center text-slate-500 border border-slate-200">Nenhum cliente encontrado com os filtros atuais.</div>}
      </div>

      <button onClick={onOpenAddClientModal} className="fixed bottom-8 right-8 w-14 h-14 rounded-full glass-btn-primary flex items-center justify-center z-40 group shadow-lg hover:shadow-xl transition-all" title="Cadastrar Novo Cliente">
        <span className="material-symbols-outlined text-[28px] text-white group-hover:rotate-90 transition-transform duration-300">person_add</span>
      </button>

      <ClientDetailOperationalModal
        isOpen={!!selectedClient}
        onClose={() => setSelectedClient(null)}
        client={selectedClient}
        existingClients={clients}
        onSaveClient={(updated) => { onSaveClient(updated); setSelectedClient(updated); }}
        onSelectClientForDoc={selectedClient && normalizeStatus(String(selectedClient.status)) !== 'Arquivado' ? () => onSelectClientForDoc(selectedClient) : undefined}
        clientCategories={clientCategories}
      />

      {clientToArchive && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center"><span className="material-symbols-outlined">archive</span></div>
              <div><h3 className="font-extrabold text-base text-slate-900">Arquivar cliente</h3><p className="text-xs text-slate-500">Os dados e vínculos serão preservados.</p></div>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">Arquivar <strong>{clientToArchive.name}</strong>? O cliente deixará de ser tratado como ativo, mas continuará armazenado no Firestore e poderá ser restaurado.</p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button type="button" onClick={() => setClientToArchive(null)} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs">Cancelar</button>
              <button type="button" onClick={() => archiveClient(clientToArchive)} className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1"><span className="material-symbols-outlined text-sm">archive</span>Arquivar</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
