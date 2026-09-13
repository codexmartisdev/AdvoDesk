import React, { useState } from 'react';
import { Client } from '../types';
import { ClientDetailModal } from './ClientDetailModal';

interface ClientsViewProps {
  clients: Client[];
  searchQuery: string;
  onOpenAddClientModal: () => void;
  onSelectClientForDoc: (client: Client) => void;
  onSaveClient?: (updatedClient: Client) => void;
  onDeleteClient?: (clientId: string) => void;
  clientCategories?: string[];
}

export const ClientsView: React.FC<ClientsViewProps> = ({
  clients,
  searchQuery,
  onOpenAddClientModal,
  onSelectClientForDoc,
  onSaveClient = (_updated: Client) => {},
  onDeleteClient,
  clientCategories,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'updated'>('updated');
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);

  const filteredClients = clients.filter((c) => {
    const normalizedSearch = searchQuery.toLowerCase();
    const matchesSearch =
      c.name.toLowerCase().includes(normalizedSearch) ||
      (c.code || '').toLowerCase().includes(normalizedSearch) ||
      (c.cpf || '').includes(searchQuery) ||
      (c.typePill || '').toLowerCase().includes(normalizedSearch);

    if (filterStatus === 'all') return matchesSearch;
    return matchesSearch && c.status.toLowerCase() === filterStatus.toLowerCase();
  });

  const sortedClients = [...filteredClients].sort((a, b) => {
    if (sortBy === 'name') {
      return a.name.localeCompare(b.name);
    }
    return a.updatedAt.localeCompare(b.updatedAt);
  });

  return (
    <main className="md:ml-64 pt-16 md:pt-8 pb-12 px-4 sm:px-6 md:px-8 min-h-screen relative z-10 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-200/60 gap-4">
        <div>
          <h2 className="font-display-lg text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Clientes
          </h2>
          <p className="text-slate-600 text-sm mt-1">
            Gestão e consulta da carteira de clientes ativos e assistidos da banca.
          </p>
        </div>

        {/* Filters & Actions */}
        <div className="flex items-center space-x-3 relative shrink-0">
          {/* Filter Dropdown */}
          <div className="relative">
            <button
              onClick={() => { setFilterDropdownOpen(!filterDropdownOpen); setSortDropdownOpen(false); }}
              className="bg-white hover:bg-slate-50 border border-slate-300 px-4 py-2 rounded-xl flex items-center space-x-2 text-slate-800 text-xs md:text-sm font-medium shadow-xs transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">filter_list</span>
              <span className="capitalize">
                {filterStatus === 'all' ? 'Filtrar' : `Status: ${filterStatus}`}
              </span>
            </button>

            {filterDropdownOpen && (
              <div className="absolute right-0 top-11 w-48 bg-white rounded-2xl p-2 z-30 border border-slate-200 shadow-xl">
                <button
                  onClick={() => { setFilterStatus('all'); setFilterDropdownOpen(false); }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold ${filterStatus === 'all' ? 'bg-blue-50 text-blue-900' : 'text-slate-700 hover:bg-slate-100'}`}
                >
                  Todos os Clientes
                </button>
                <button
                  onClick={() => { setFilterStatus('Ativo'); setFilterDropdownOpen(false); }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold ${filterStatus === 'Ativo' || filterStatus === 'active' ? 'bg-blue-50 text-blue-900' : 'text-slate-700 hover:bg-slate-100'}`}
                >
                  Status: Ativo
                </button>
                <button
                  onClick={() => { setFilterStatus('Pendente'); setFilterDropdownOpen(false); }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold ${filterStatus === 'Pendente' || filterStatus === 'pending' ? 'bg-blue-50 text-blue-900' : 'text-slate-700 hover:bg-slate-100'}`}
                >
                  Status: Pendente
                </button>
                <button
                  onClick={() => { setFilterStatus('Rascunho'); setFilterDropdownOpen(false); }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold ${filterStatus === 'Rascunho' || filterStatus === 'draft' ? 'bg-blue-50 text-blue-900' : 'text-slate-700 hover:bg-slate-100'}`}
                >
                  Status: Rascunho
                </button>
              </div>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="relative">
            <button
              onClick={() => { setSortDropdownOpen(!sortDropdownOpen); setFilterDropdownOpen(false); }}
              className="bg-white hover:bg-slate-50 border border-slate-300 px-4 py-2 rounded-xl flex items-center space-x-2 text-slate-800 text-xs md:text-sm font-medium shadow-xs transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">sort</span>
              <span className="capitalize">
                Ordem: {sortBy === 'name' ? 'Nome' : 'Atualização'}
              </span>
            </button>

            {sortDropdownOpen && (
              <div className="absolute right-0 top-11 w-48 bg-white rounded-2xl p-2 z-30 border border-slate-200 shadow-xl">
                <button
                  onClick={() => { setSortBy('updated'); setSortDropdownOpen(false); }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold ${sortBy === 'updated' ? 'bg-blue-50 text-blue-900' : 'text-slate-700 hover:bg-slate-100'}`}
                >
                  Mais Recentes
                </button>
                <button
                  onClick={() => { setSortBy('name'); setSortDropdownOpen(false); }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold ${sortBy === 'name' ? 'bg-blue-50 text-blue-900' : 'text-slate-700 hover:bg-slate-100'}`}
                >
                  Ordem Alfabética (A-Z)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Client List (White Frosted Rows) */}
      <div className="space-y-3.5">
        {sortedClients.map((client) => {
          const initials = client.name
            .split(' ')
            .slice(0, 2)
            .map((n) => n[0])
            .join('')
            .toUpperCase();

          return (
            <div
              key={client.id}
              onClick={() => setSelectedClient(client)}
              className="glass-panel rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white border border-slate-200/90 shadow-xs hover:shadow-md hover:border-slate-300 transition-all cursor-pointer group"
            >
              {/* Left Side: Avatar & Name */}
              <div className="flex items-center space-x-4">
                {client.avatarUrl ? (
                  <div className="w-12 h-12 rounded-full overflow-hidden border border-slate-300 shrink-0 shadow-xs">
                    <img
                      src={client.avatarUrl}
                      alt={client.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center shrink-0">
                    <span className="font-title-md text-slate-700 font-bold text-sm">{initials}</span>
                  </div>
                )}

                <div>
                  <h3 className="font-title-md text-base text-slate-900 font-bold group-hover:text-blue-900 transition-colors">
                    {client.name}
                  </h3>
                  <div className="flex items-center mt-0.5 space-x-3 text-xs">
                    <span className="text-slate-500 font-medium">CPF: {client.cpf}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                    <span className="text-slate-500 font-medium">Cód: {client.code}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                    <span className="text-slate-400">{client.updatedAt}</span>
                  </div>
                </div>
              </div>

              {/* Right Side: Type Pill, Status & Menu */}
              <div className="flex items-center space-x-4 md:space-x-6 self-end md:self-center shrink-0">
                {/* Pill */}
                <div className="px-3.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-900 text-xs font-bold">
                  <span>{client.typePill || 'Sem categoria'}</span>
                </div>

                {/* Status Indicator */}
                <div className="flex items-center space-x-2">
                  {(client.status === 'Pendente' || client.status === 'Pending') && (
                    <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold">
                      Pendente
                    </span>
                  )}
                  {(client.status === 'Ativo' || client.status === 'Active') && (
                    <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
                      Ativo
                    </span>
                  )}
                  {(client.status === 'Rascunho' || client.status === 'Draft') && (
                    <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold">
                      Rascunho
                    </span>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectClientForDoc(client);
                    }}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 text-xs font-bold rounded-xl flex items-center gap-1 transition-colors"
                    title="Preparar documentos para este cliente"
                  >
                    <span className="material-symbols-outlined text-sm">description</span>
                    <span className="hidden sm:inline">Documentos</span>
                  </button>

                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedClient(client);
                    }}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1 transition-colors"
                    title="Ver / Editar Ficha"
                  >
                    <span className="material-symbols-outlined text-sm">edit</span>
                    <span className="hidden sm:inline">Ver / Editar</span>
                  </button>

                  {onDeleteClient && (
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setClientToDelete(client);
                      }}
                      className="text-slate-400 hover:text-red-700 hover:bg-red-50 transition-colors p-2 rounded-xl"
                      title="Excluir Cliente"
                    >
                      <span className="material-symbols-outlined text-base">delete</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {sortedClients.length === 0 && (
          <div className="bg-white rounded-2xl p-8 text-center text-slate-500 border border-slate-200">
            Nenhum cliente encontrado com os filtros atuais.
          </div>
        )}
      </div>

      {/* Floating Action Button (FAB) */}
      <button
        onClick={onOpenAddClientModal}
        className="fixed bottom-8 right-8 w-14 h-14 rounded-full glass-btn-primary flex items-center justify-center z-40 group shadow-lg hover:shadow-xl transition-all"
        title="Cadastrar Novo Cliente"
      >
        <span className="material-symbols-outlined text-[28px] text-white group-hover:rotate-90 transition-transform duration-300">
          person_add
        </span>
      </button>

      {/* Client Detail & Edit Modal */}
      <ClientDetailModal
        isOpen={!!selectedClient}
        onClose={() => setSelectedClient(null)}
        client={selectedClient}
        existingClients={clients}
        onSaveClient={(updated) => {
          onSaveClient(updated);
          setSelectedClient(updated);
        }}
        onDeleteClient={onDeleteClient}
        onSelectClientForDoc={() => {
          if (selectedClient) {
            onSelectClientForDoc(selectedClient);
          }
        }}
        clientCategories={clientCategories}
      />

      {/* Direct List Delete Confirmation Modal */}
      {clientToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-red-600">
              <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-xl">warning</span>
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900">Excluir Cliente</h3>
                <p className="text-xs text-slate-500">Ação irreversível</p>
              </div>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              Tem certeza de que deseja excluir o cliente <strong className="text-slate-900">{clientToDelete.name}</strong> (CPF: {clientToDelete.cpf})? Os dados do cliente serão removidos da lista.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setClientToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteClient && clientToDelete) {
                    onDeleteClient(clientToDelete.id);
                  }
                  setClientToDelete(null);
                }}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition-colors"
              >
                <span className="material-symbols-outlined text-sm">delete</span>
                <span>Confirmar Exclusão</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
