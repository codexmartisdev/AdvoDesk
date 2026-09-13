import React, { useMemo, useState } from 'react';
import { Client } from '../types';
import { ClientDetailOperationalModal } from './ClientDetailOperationalModal';

type LifecycleClient = Client & {
  statusBeforeArchive?: string;
  archivedAt?: string;
  restoredAt?: string;
};

type SortMode = 'name-asc' | 'name-desc' | 'status' | 'category';

interface ClientsViewProps {
  clients: Client[];
  searchQuery: string;
  onOpenAddClientModal: () => void;
  onSelectClientForDoc: (client: Client) => void;
  onSaveClient?: (updatedClient: Client) => void;
  clientCategories?: string[];
}

const normalizeStatus = (status?: string) => {
  if (status === 'Active') return 'Ativo';
  if (status === 'Pending') return 'Pendente';
  if (status === 'Draft') return 'Rascunho';
  return status || 'Ativo';
};

const normalizeText = (value?: string) =>
  (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const onlyDigits = (value?: string) => (value || '').replace(/\D/g, '');

const statusOrder: Record<string, number> = {
  Ativo: 0,
  Pendente: 1,
  Rascunho: 2,
  Arquivado: 3,
};

export const ClientsView: React.FC<ClientsViewProps> = ({
  clients,
  searchQuery,
  onOpenAddClientModal,
  onSelectClientForDoc,
  onSaveClient = (_updated: Client) => {},
  clientCategories = [],
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('current');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortMode>('name-asc');
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientToArchive, setClientToArchive] = useState<Client | null>(null);

  const summary = useMemo(() => {
    const statuses = clients.map((client) => normalizeStatus(String(client.status)));
    return {
      current: statuses.filter((status) => status !== 'Arquivado').length,
      active: statuses.filter((status) => status === 'Ativo').length,
      pending: statuses.filter((status) => status === 'Pendente').length,
      archived: statuses.filter((status) => status === 'Arquivado').length,
      uncategorized: clients.filter((client) => !client.typePill?.trim()).length,
    };
  }, [clients]);

  const categoryOptions = useMemo(() => {
    const categories = new Set<string>();
    clientCategories.forEach((category) => {
      if (category?.trim()) categories.add(category.trim());
    });
    clients.forEach((client) => {
      if (client.typePill?.trim()) categories.add(client.typePill.trim());
    });
    return Array.from(categories).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [clientCategories, clients]);

  const normalizedSearch = normalizeText(searchQuery);
  const searchDigits = onlyDigits(searchQuery);

  const filteredClients = useMemo(() => clients.filter((client) => {
    const status = normalizeStatus(String(client.status));
    const category = client.typePill?.trim() || '';

    const textHaystack = [
      client.name,
      client.socialName,
      client.code,
      client.cpf,
      client.phone,
      client.phoneSecondary,
      client.email,
      client.typePill,
      client.addressCityUf,
      client.occupation,
    ]
      .map((value) => normalizeText(value))
      .join(' ');

    const digitHaystack = [client.cpf, client.phone, client.phoneSecondary, client.code]
      .map((value) => onlyDigits(value))
      .join(' ');

    const matchesSearch =
      !normalizedSearch ||
      textHaystack.includes(normalizedSearch) ||
      (!!searchDigits && digitHaystack.includes(searchDigits));

    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'current' && status !== 'Arquivado') ||
      status.toLowerCase() === filterStatus.toLowerCase();

    const matchesCategory =
      filterCategory === 'all' ||
      (filterCategory === '__none__' && !category) ||
      normalizeText(category) === normalizeText(filterCategory);

    return matchesSearch && matchesStatus && matchesCategory;
  }), [clients, filterCategory, filterStatus, normalizedSearch, searchDigits]);

  const sortedClients = useMemo(() => [...filteredClients].sort((a, b) => {
    if (sortBy === 'name-desc') return b.name.localeCompare(a.name, 'pt-BR');
    if (sortBy === 'status') {
      const statusDiff = (statusOrder[normalizeStatus(String(a.status))] ?? 99) - (statusOrder[normalizeStatus(String(b.status))] ?? 99);
      return statusDiff || a.name.localeCompare(b.name, 'pt-BR');
    }
    if (sortBy === 'category') {
      const categoryA = a.typePill?.trim() || 'Sem categoria';
      const categoryB = b.typePill?.trim() || 'Sem categoria';
      return categoryA.localeCompare(categoryB, 'pt-BR') || a.name.localeCompare(b.name, 'pt-BR');
    }
    return a.name.localeCompare(b.name, 'pt-BR');
  }), [filteredClients, sortBy]);

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

  const clearLocalFilters = () => {
    setFilterStatus('current');
    setFilterCategory('all');
    setSortBy('name-asc');
  };

  const statusLabel = filterStatus === 'current'
    ? 'Carteira atual'
    : filterStatus === 'all'
      ? 'Todos'
      : filterStatus;

  const categoryLabel = filterCategory === 'all'
    ? 'Todas as categorias'
    : filterCategory === '__none__'
      ? 'Sem categoria'
      : filterCategory;

  return (
    <main className="md:ml-64 pt-16 md:pt-8 pb-12 px-4 sm:px-6 md:px-8 min-h-screen relative z-10 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-200/60 gap-4">
        <div>
          <h2 className="font-display-lg text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Clientes</h2>
          <p className="text-slate-600 text-sm mt-1">Gestão da ficha cadastral, carteira atual e clientes arquivados da banca.</p>
        </div>
        <button
          type="button"
          onClick={onOpenAddClientModal}
          className="glass-btn-primary px-4 py-2.5 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs"
        >
          <span className="material-symbols-outlined text-lg">person_add</span>
          Novo cliente
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Carteira atual', value: summary.current, icon: 'groups', action: () => setFilterStatus('current') },
          { label: 'Ativos', value: summary.active, icon: 'check_circle', action: () => setFilterStatus('Ativo') },
          { label: 'Pendentes', value: summary.pending, icon: 'pending_actions', action: () => setFilterStatus('Pendente') },
          { label: 'Arquivados', value: summary.archived, icon: 'archive', action: () => setFilterStatus('Arquivado') },
          { label: 'Sem categoria', value: summary.uncategorized, icon: 'label_off', action: () => setFilterCategory('__none__') },
        ].map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={item.action}
            className="bg-white border border-slate-200 rounded-2xl p-3.5 text-left shadow-xs hover:border-blue-200 hover:shadow-sm transition-all"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">{item.label}</span>
              <span className="material-symbols-outlined text-base text-blue-900">{item.icon}</span>
            </div>
            <div className="text-2xl font-black text-slate-900 mt-1">{item.value}</div>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="text-xs text-slate-500 font-medium">
          Exibindo <strong className="text-slate-800">{sortedClients.length}</strong> de <strong className="text-slate-800">{clients.length}</strong> cliente(s)
          {searchQuery.trim() ? <span> para a busca “{searchQuery.trim()}”</span> : null}.
        </div>

        <div className="flex flex-wrap items-center gap-2 relative">
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setFilterDropdownOpen(!filterDropdownOpen);
                setCategoryDropdownOpen(false);
                setSortDropdownOpen(false);
              }}
              className="bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-2 rounded-xl flex items-center gap-1.5 text-slate-800 text-xs font-bold"
            >
              <span className="material-symbols-outlined text-base">filter_list</span>
              {statusLabel}
            </button>
            {filterDropdownOpen && (
              <div className="absolute left-0 top-11 w-52 bg-white rounded-2xl p-2 z-30 border border-slate-200 shadow-xl">
                {[
                  ['current', 'Carteira atual'],
                  ['all', 'Todos, inclusive arquivados'],
                  ['Ativo', 'Status: Ativo'],
                  ['Pendente', 'Status: Pendente'],
                  ['Rascunho', 'Status: Rascunho'],
                  ['Arquivado', 'Status: Arquivado'],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
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
              type="button"
              onClick={() => {
                setCategoryDropdownOpen(!categoryDropdownOpen);
                setFilterDropdownOpen(false);
                setSortDropdownOpen(false);
              }}
              className="bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-2 rounded-xl flex items-center gap-1.5 text-slate-800 text-xs font-bold max-w-[220px]"
            >
              <span className="material-symbols-outlined text-base">label</span>
              <span className="truncate">{categoryLabel}</span>
            </button>
            {categoryDropdownOpen && (
              <div className="absolute left-0 top-11 w-64 max-h-72 overflow-y-auto bg-white rounded-2xl p-2 z-30 border border-slate-200 shadow-xl">
                <button type="button" onClick={() => { setFilterCategory('all'); setCategoryDropdownOpen(false); }} className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold ${filterCategory === 'all' ? 'bg-blue-50 text-blue-900' : 'text-slate-700 hover:bg-slate-100'}`}>Todas as categorias</button>
                <button type="button" onClick={() => { setFilterCategory('__none__'); setCategoryDropdownOpen(false); }} className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold ${filterCategory === '__none__' ? 'bg-blue-50 text-blue-900' : 'text-slate-700 hover:bg-slate-100'}`}>Sem categoria</button>
                {categoryOptions.map((category) => (
                  <button key={category} type="button" onClick={() => { setFilterCategory(category); setCategoryDropdownOpen(false); }} className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold ${filterCategory === category ? 'bg-blue-50 text-blue-900' : 'text-slate-700 hover:bg-slate-100'}`}>{category}</button>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setSortDropdownOpen(!sortDropdownOpen);
                setFilterDropdownOpen(false);
                setCategoryDropdownOpen(false);
              }}
              className="bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-2 rounded-xl flex items-center gap-1.5 text-slate-800 text-xs font-bold"
            >
              <span className="material-symbols-outlined text-base">sort</span>
              Ordenar
            </button>
            {sortDropdownOpen && (
              <div className="absolute right-0 top-11 w-52 bg-white rounded-2xl p-2 z-30 border border-slate-200 shadow-xl">
                {[
                  ['name-asc', 'Nome A–Z'],
                  ['name-desc', 'Nome Z–A'],
                  ['status', 'Status'],
                  ['category', 'Categoria'],
                ].map(([value, label]) => (
                  <button key={value} type="button" onClick={() => { setSortBy(value as SortMode); setSortDropdownOpen(false); }} className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold ${sortBy === value ? 'bg-blue-50 text-blue-900' : 'text-slate-700 hover:bg-slate-100'}`}>{label}</button>
                ))}
              </div>
            )}
          </div>

          {(filterStatus !== 'current' || filterCategory !== 'all' || sortBy !== 'name-asc') && (
            <button type="button" onClick={clearLocalFilters} className="px-3 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100">Limpar filtros</button>
          )}
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
              <div className="flex items-center space-x-4 min-w-0">
                {client.avatarUrl ? (
                  <div className="w-12 h-12 rounded-full overflow-hidden border border-slate-300 shrink-0 shadow-xs"><img src={client.avatarUrl} alt={client.name} className="w-full h-full object-cover" /></div>
                ) : (
                  <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center shrink-0"><span className="font-title-md text-slate-700 font-bold text-sm">{initials || 'CL'}</span></div>
                )}
                <div className="min-w-0">
                  <h3 className="font-title-md text-base text-slate-900 font-bold group-hover:text-blue-900 transition-colors truncate">{client.name}</h3>
                  <div className="flex flex-wrap items-center mt-0.5 gap-x-3 gap-y-1 text-xs">
                    <span className="text-slate-500 font-medium">CPF: {client.cpf || '—'}</span>
                    <span className="text-slate-500 font-medium">Cód: {client.code || '—'}</span>
                    {client.phone && <span className="text-slate-500 font-medium">Tel: {client.phone}</span>}
                    <span className="text-slate-400">{client.updatedAt}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 md:gap-3 self-end md:self-center shrink-0">
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
                    onClick={(event) => {
                      event.stopPropagation();
                      if (client.id) onSelectClientForDoc(client);
                    }}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 text-xs font-bold rounded-xl flex items-center gap-1 transition-colors"
                    title={`Abrir Documentos com ${client.name} (ID ${client.id}) selecionado`}
                  >
                    <span className="material-symbols-outlined text-sm">description</span><span className="hidden sm:inline">Documentos</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={(event) => { event.stopPropagation(); setSelectedClient(client); }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1 transition-colors"
                  title="Ver ou editar ficha cadastral"
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

        {sortedClients.length === 0 && (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 space-y-2">
            <span className="material-symbols-outlined text-3xl text-slate-300">person_search</span>
            <p className="text-slate-700 font-bold">Nenhum cliente encontrado.</p>
            <p className="text-xs text-slate-500">Revise a busca global ou os filtros de status e categoria.</p>
            {(filterStatus !== 'current' || filterCategory !== 'all') && (
              <button type="button" onClick={clearLocalFilters} className="mt-2 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold">Voltar para a carteira atual</button>
            )}
          </div>
        )}
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
            <p className="text-xs text-slate-700 leading-relaxed">Arquivar <strong>{clientToArchive.name}</strong>? O cliente sairá da carteira atual, continuará armazenado no Firestore e poderá ser restaurado.</p>
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
