import React, { useEffect, useMemo, useState } from 'react';
import { auth } from '../../lib/firebase';
import { getUserProfileInFirestore } from '../../services/firestoreService';
import { subscribeToBpcAudits } from '../../services/bpcAuditFirestoreService';
import { BpcAuditCategory, BpcAuditItem, BpcCaseItem } from '../../types/bpc';

interface BpcAuditoriasSectionProps {
  cases?: BpcCaseItem[];
}

type AuditFilter = 'Todos' | BpcAuditCategory;

const categoryStyle: Record<BpcAuditCategory, string> = {
  Caso: 'bg-slate-100 text-slate-700 border-slate-200',
  Pendência: 'bg-amber-50 text-amber-800 border-amber-200',
  Prazo: 'bg-blue-50 text-blue-800 border-blue-200',
  Avaliação: 'bg-emerald-50 text-emerald-800 border-emerald-200',
};

const categoryIcon: Record<BpcAuditCategory, string> = {
  Caso: 'folder_open',
  Pendência: 'warning',
  Prazo: 'event',
  Avaliação: 'psychology',
};

function formatOccurredAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export const BpcAuditoriasSection: React.FC<BpcAuditoriasSectionProps> = () => {
  const [audits, setAudits] = useState<BpcAuditItem[]>([]);
  const [filter, setFilter] = useState<AuditFilter>('Todos');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    const connect = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        if (active) {
          setErrorMessage('Não foi possível identificar o usuário autenticado.');
          setIsLoading(false);
        }
        return;
      }

      const profile = await getUserProfileInFirestore(currentUser.uid);
      const firmId = profile?.firmId?.trim();

      if (!firmId) {
        if (active) {
          setErrorMessage('O usuário autenticado não possui escritório vinculado.');
          setIsLoading(false);
        }
        return;
      }

      if (!active) return;

      unsubscribe = subscribeToBpcAudits(
        firmId,
        (items) => {
          if (!active) return;
          setAudits(items);
          setErrorMessage('');
          setIsLoading(false);
        },
        () => {
          if (!active) return;
          setErrorMessage('Não foi possível carregar o histórico de auditoria BPC.');
          setIsLoading(false);
        }
      );
    };

    void connect().catch((error) => {
      console.error('Erro ao inicializar auditoria BPC:', error);
      if (active) {
        setErrorMessage('Não foi possível inicializar o histórico de auditoria BPC.');
        setIsLoading(false);
      }
    });

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  const filteredAudits = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('pt-BR');

    return audits.filter((item) => {
      if (filter !== 'Todos' && item.category !== filter) return false;
      if (!normalizedSearch) return true;

      return [
        item.clientName,
        item.action,
        item.description,
        item.actorLabel,
      ].some((value) => value.toLocaleLowerCase('pt-BR').includes(normalizedSearch));
    });
  }, [audits, filter, search]);

  const filters: AuditFilter[] = ['Todos', 'Caso', 'Pendência', 'Prazo', 'Avaliação'];

  return (
    <div className="space-y-4">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-[#C9A227] text-base">history</span>
            <span>Histórico e Auditoria BPC/LOAS</span>
          </h3>
          <p className="text-slate-500 text-xs mt-0.5">
            Registro cronológico das movimentações persistidas no módulo BPC
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar requerente ou ação"
            className="w-full sm:w-64 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 outline-none focus:border-[#C9A227]"
          />
        </div>
      </div>

      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-[11px] text-blue-900">
        O histórico é append-only e passa a registrar novas movimentações a partir da ativação deste recurso. Ações anteriores não são reconstruídas artificialmente.
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-900">
          {errorMessage}
        </div>
      )}

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {filters.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setFilter(item)}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border whitespace-nowrap transition-colors ${
              filter === item
                ? 'bg-[#0D0D0D] text-white border-[#C9A227]/60'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-xs font-semibold text-slate-500">
            Carregando histórico de auditoria...
          </div>
        ) : filteredAudits.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-500 mb-3">
              <span className="material-symbols-outlined text-2xl">history_toggle_off</span>
            </div>
            <h4 className="font-bold text-slate-900 text-sm">Nenhum evento encontrado</h4>
            <p className="text-slate-500 text-xs mt-1 max-w-md mx-auto">
              Novas criações e alterações em casos, pendências, prazos e avaliações aparecerão aqui automaticamente.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredAudits.map((item) => (
              <div key={item.id} className="p-4 md:p-5 hover:bg-slate-50/70 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="material-symbols-outlined text-base">{categoryIcon[item.category]}</span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-slate-900 text-xs">{item.action}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${categoryStyle[item.category]}`}>
                            {item.category}
                          </span>
                        </div>
                        <p className="text-[11px] font-semibold text-slate-700 mt-1">{item.clientName}</p>
                      </div>

                      <span className="text-[10px] font-semibold text-slate-500 whitespace-nowrap">
                        {formatOccurredAt(item.occurredAt)}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">{item.description}</p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[10px] text-slate-500">
                      <span>Responsável: <strong className="text-slate-700">{item.actorLabel}</strong></span>
                      <span>Registro: <strong className="text-slate-700">{item.id}</strong></span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
