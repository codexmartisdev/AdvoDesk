import React, { useEffect, useState } from 'react';
import { Client } from '../../types';
import {
  BpcAvaliacaoItem,
  BpcCaseItem,
  BpcDeadlineItem,
  BpcPendenciaItem,
  BpcSubTab,
} from '../../types/bpc';
import { auth } from '../../lib/firebase';
import { getBrasiliaFormatted } from '../../utils/dateUtils';
import { getUserProfileInFirestore } from '../../services/firestoreService';
import {
  saveBpcCaseInFirestore,
  subscribeToBpcCases,
} from '../../services/bpcFirestoreService';
import {
  saveBpcPendenciaInFirestore,
  subscribeToBpcPendencias,
} from '../../services/bpcPendenciasFirestoreService';
import {
  saveBpcDeadlineInFirestore,
  subscribeToBpcDeadlines,
} from '../../services/bpcPrazosFirestoreService';
import {
  saveBpcAvaliacaoInFirestore,
  subscribeToBpcAvaliacoes,
} from '../../services/bpcAvaliacoesFirestoreService';
import { BpcDashboardSection } from './BpcDashboardSection';
import { BpcCasesSection } from './BpcCasesSection';
import { BpcNewCaseSection } from './BpcNewCaseSection';
import { BpcEditCaseSection } from './BpcEditCaseSection';
import { BpcPendenciasSection } from './BpcPendenciasSection';
import { BpcPrazosSection } from './BpcPrazosSection';
import { BpcAvaliacoesSection } from './BpcAvaliacoesSection';
import { BpcAuditoriasSection } from './BpcAuditoriasSection';

interface BpcLoasViewProps {
  clients: Client[];
  initialSubTab?: BpcSubTab;
}

export const BpcLoasView: React.FC<BpcLoasViewProps> = ({
  clients,
  initialSubTab = 'dashboard',
}) => {
  const [activeSubTab, setActiveSubTab] = useState<BpcSubTab>(initialSubTab);
  const [bpcCases, setBpcCases] = useState<BpcCaseItem[]>([]);
  const [bpcPendencias, setBpcPendencias] = useState<BpcPendenciaItem[]>([]);
  const [bpcDeadlines, setBpcDeadlines] = useState<BpcDeadlineItem[]>([]);
  const [bpcAvaliacoes, setBpcAvaliacoes] = useState<BpcAvaliacaoItem[]>([]);
  const [editingCase, setEditingCase] = useState<BpcCaseItem | null>(null);
  const [firmId, setFirmId] = useState<string | null>(null);
  const [isLoadingCases, setIsLoadingCases] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [pendenciasError, setPendenciasError] = useState('');
  const [prazosError, setPrazosError] = useState('');
  const [avaliacoesError, setAvaliacoesError] = useState('');

  const activeBpcCases = bpcCases.filter((bpcCase) => !bpcCase.archivedAt);

  useEffect(() => {
    let active = true;
    let unsubscribeCases: (() => void) | undefined;
    let unsubscribePendencias: (() => void) | undefined;
    let unsubscribeDeadlines: (() => void) | undefined;
    let unsubscribeAvaliacoes: (() => void) | undefined;

    const connectToBpcData = async () => {
      const currentUser = auth.currentUser;

      if (!currentUser) {
        if (active) {
          setLoadError('Não foi possível identificar o usuário autenticado.');
          setIsLoadingCases(false);
        }
        return;
      }

      const userProfile = await getUserProfileInFirestore(currentUser.uid);
      const resolvedFirmId = userProfile?.firmId?.trim();

      if (!resolvedFirmId) {
        if (active) {
          setLoadError('O usuário autenticado não possui escritório vinculado.');
          setIsLoadingCases(false);
        }
        return;
      }

      if (!active) return;

      setFirmId(resolvedFirmId);

      unsubscribeCases = subscribeToBpcCases(
        resolvedFirmId,
        (persistedCases) => {
          if (!active) return;
          setBpcCases(persistedCases);
          setLoadError('');
          setIsLoadingCases(false);
        },
        () => {
          if (!active) return;
          setLoadError('Não foi possível carregar os casos BPC do Firestore.');
          setIsLoadingCases(false);
        }
      );

      unsubscribePendencias = subscribeToBpcPendencias(
        resolvedFirmId,
        (persistedPendencias) => {
          if (!active) return;
          setBpcPendencias(persistedPendencias);
          setPendenciasError('');
        },
        () => {
          if (!active) return;
          setPendenciasError('Não foi possível carregar as pendências BPC do Firestore.');
        }
      );

      unsubscribeDeadlines = subscribeToBpcDeadlines(
        resolvedFirmId,
        (persistedDeadlines) => {
          if (!active) return;
          setBpcDeadlines(persistedDeadlines);
          setPrazosError('');
        },
        () => {
          if (!active) return;
          setPrazosError('Não foi possível carregar os prazos BPC do Firestore.');
        }
      );

      unsubscribeAvaliacoes = subscribeToBpcAvaliacoes(
        resolvedFirmId,
        (persistedAvaliacoes) => {
          if (!active) return;
          setBpcAvaliacoes(persistedAvaliacoes);
          setAvaliacoesError('');
        },
        () => {
          if (!active) return;
          setAvaliacoesError('Não foi possível carregar as avaliações BPC do Firestore.');
        }
      );
    };

    void connectToBpcData().catch((error) => {
      console.error('Erro ao inicializar dados BPC:', error);
      if (active) {
        setLoadError('Não foi possível inicializar a carteira BPC.');
        setIsLoadingCases(false);
      }
    });

    return () => {
      active = false;
      unsubscribeCases?.();
      unsubscribePendencias?.();
      unsubscribeDeadlines?.();
      unsubscribeAvaliacoes?.();
    };
  }, []);

  const navigateToSubTab = (tab: BpcSubTab) => {
    setEditingCase(null);
    setActiveSubTab(tab);
  };

  const handleSaveNewCase = async (newCase: BpcCaseItem) => {
    if (!firmId) {
      window.alert('Não foi possível identificar o escritório para salvar o caso BPC.');
      throw new Error('Firm ID ausente ao salvar caso BPC.');
    }

    try {
      await saveBpcCaseInFirestore(newCase, firmId, {
        action: 'Caso criado',
        description: `Caso BPC ${newCase.modality === 'pcd' ? 'PCD' : 'Idoso'} criado com status ${newCase.status}.`,
      });
      setEditingCase(null);
      setActiveSubTab('cases');
    } catch (error) {
      console.error('Erro ao salvar caso BPC:', error);
      window.alert('Não foi possível salvar o caso BPC. Tente novamente.');
      throw error;
    }
  };

  const handleOpenCaseEditor = (bpcCase: BpcCaseItem) => {
    setEditingCase(bpcCase);
    setActiveSubTab('cases');
  };

  const handleSaveEditedCase = async (updatedCase: BpcCaseItem) => {
    if (!firmId) {
      window.alert('Não foi possível identificar o escritório para atualizar o caso BPC.');
      throw new Error('Firm ID ausente ao atualizar caso BPC.');
    }

    const statusChanged = editingCase && editingCase.status !== updatedCase.status;
    const audit = statusChanged
      ? {
          action: 'Status do caso atualizado',
          description: `Status alterado de ${editingCase.status} para ${updatedCase.status}.`,
        }
      : {
          action: 'Caso atualizado',
          description: 'Dados do caso BPC atualizados.',
        };

    try {
      await saveBpcCaseInFirestore(updatedCase, firmId, audit);
      setEditingCase(null);
    } catch (error) {
      console.error('Erro ao atualizar caso BPC:', error);
      window.alert('Não foi possível atualizar o caso BPC. Tente novamente.');
      throw error;
    }
  };

  const handleArchiveCase = async (bpcCase: BpcCaseItem) => {
    if (!firmId) {
      window.alert('Não foi possível identificar o escritório para arquivar o caso BPC.');
      return;
    }

    const confirmed = window.confirm(
      `Arquivar o caso BPC de ${bpcCase.clientName}? O registro poderá ser restaurado depois.`
    );

    if (!confirmed) return;

    const now = getBrasiliaFormatted();

    try {
      await saveBpcCaseInFirestore(
        {
          ...bpcCase,
          archivedAt: now,
          updatedAt: now,
        },
        firmId,
        {
          action: 'Caso arquivado',
          description: 'Caso BPC arquivado e retirado da operação diária.',
        }
      );
      setEditingCase(null);
    } catch (error) {
      console.error('Erro ao arquivar caso BPC:', error);
      window.alert('Não foi possível arquivar o caso BPC. Tente novamente.');
    }
  };

  const handleRestoreCase = async (bpcCase: BpcCaseItem) => {
    if (!firmId) {
      window.alert('Não foi possível identificar o escritório para restaurar o caso BPC.');
      return;
    }

    const now = getBrasiliaFormatted();

    try {
      await saveBpcCaseInFirestore(
        {
          ...bpcCase,
          archivedAt: undefined,
          updatedAt: now,
        },
        firmId,
        {
          action: 'Caso restaurado',
          description: 'Caso BPC restaurado para a operação diária.',
        }
      );
    } catch (error) {
      console.error('Erro ao restaurar caso BPC:', error);
      window.alert('Não foi possível restaurar o caso BPC. Tente novamente.');
    }
  };

  const handleSavePendencia = async (item: BpcPendenciaItem) => {
    if (!firmId) {
      window.alert('Não foi possível identificar o escritório para salvar a pendência.');
      throw new Error('Firm ID ausente ao salvar pendência BPC.');
    }

    try {
      await saveBpcPendenciaInFirestore(item, firmId, {
        action: 'Pendência criada',
        description: `${item.type}: ${item.description}`,
      });
    } catch (error) {
      console.error('Erro ao salvar pendência BPC:', error);
      window.alert('Não foi possível salvar a pendência BPC. Tente novamente.');
      throw error;
    }
  };

  const handleTogglePendenciaResolved = async (item: BpcPendenciaItem) => {
    if (!firmId) {
      window.alert('Não foi possível identificar o escritório para atualizar a pendência.');
      throw new Error('Firm ID ausente ao atualizar pendência BPC.');
    }

    const now = getBrasiliaFormatted();
    const resolved = !item.resolved;

    try {
      await saveBpcPendenciaInFirestore(
        {
          ...item,
          resolved,
          updatedAt: now,
          resolvedAt: resolved ? now : undefined,
        },
        firmId,
        {
          action: resolved ? 'Pendência resolvida' : 'Pendência reaberta',
          description: `${item.type}: ${item.description}`,
        }
      );
    } catch (error) {
      console.error('Erro ao atualizar pendência BPC:', error);
      window.alert('Não foi possível atualizar a pendência BPC. Tente novamente.');
      throw error;
    }
  };

  const handleSaveDeadline = async (item: BpcDeadlineItem) => {
    if (!firmId) {
      window.alert('Não foi possível identificar o escritório para salvar o prazo.');
      throw new Error('Firm ID ausente ao salvar prazo BPC.');
    }

    try {
      await saveBpcDeadlineInFirestore(item, firmId, {
        action: 'Prazo criado',
        description: `${item.title} — ${item.type} — data ${item.date}.`,
      });
    } catch (error) {
      console.error('Erro ao salvar prazo BPC:', error);
      window.alert('Não foi possível salvar o prazo BPC. Tente novamente.');
      throw error;
    }
  };

  const handleToggleDeadlineStatus = async (item: BpcDeadlineItem) => {
    if (!firmId) {
      window.alert('Não foi possível identificar o escritório para atualizar o prazo.');
      throw new Error('Firm ID ausente ao atualizar prazo BPC.');
    }

    const now = getBrasiliaFormatted();
    const completed = item.status !== 'Concluído';

    try {
      await saveBpcDeadlineInFirestore(
        {
          ...item,
          status: completed ? 'Concluído' : 'Pendente',
          updatedAt: now,
          completedAt: completed ? now : undefined,
        },
        firmId,
        {
          action: completed ? 'Prazo concluído' : 'Prazo reaberto',
          description: `${item.title} — ${item.type} — data ${item.date}.`,
        }
      );
    } catch (error) {
      console.error('Erro ao atualizar prazo BPC:', error);
      window.alert('Não foi possível atualizar o prazo BPC. Tente novamente.');
      throw error;
    }
  };

  const handleSaveAvaliacao = async (item: BpcAvaliacaoItem) => {
    if (!firmId) {
      window.alert('Não foi possível identificar o escritório para salvar a avaliação.');
      throw new Error('Firm ID ausente ao salvar avaliação BPC.');
    }

    try {
      await saveBpcAvaliacaoInFirestore(item, firmId, {
        action: 'Avaliação criada',
        description: `${item.type} registrada para ${item.date} com situação ${item.status}.`,
      });
    } catch (error) {
      console.error('Erro ao salvar avaliação BPC:', error);
      window.alert('Não foi possível salvar a avaliação BPC. Tente novamente.');
      throw error;
    }
  };

  const handleUpdateAvaliacaoStatus = async (
    item: BpcAvaliacaoItem,
    status: BpcAvaliacaoItem['status']
  ) => {
    if (!firmId) {
      window.alert('Não foi possível identificar o escritório para atualizar a avaliação.');
      throw new Error('Firm ID ausente ao atualizar avaliação BPC.');
    }

    const now = getBrasiliaFormatted();

    try {
      await saveBpcAvaliacaoInFirestore(
        {
          ...item,
          status,
          updatedAt: now,
          completedAt: status === 'Realizada' ? item.completedAt || now : undefined,
        },
        firmId,
        {
          action: 'Situação da avaliação atualizada',
          description: `${item.type}: situação alterada de ${item.status} para ${status}.`,
        }
      );
    } catch (error) {
      console.error('Erro ao atualizar avaliação BPC:', error);
      window.alert('Não foi possível atualizar a avaliação BPC. Tente novamente.');
      throw error;
    }
  };

  const navItems: { id: BpcSubTab; label: string; icon: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'cases', label: 'Casos', icon: 'folder_open' },
    { id: 'new-case', label: 'Novo Caso', icon: 'person_add' },
    { id: 'pendencias', label: 'Pendências', icon: 'warning' },
    { id: 'prazos', label: 'Prazos', icon: 'event' },
    { id: 'avaliacoes', label: 'Avaliações', icon: 'psychology' },
    { id: 'auditorias', label: 'Auditorias', icon: 'fact_check' },
  ];

  return (
    <main className="md:ml-64 pt-20 md:pt-6 p-4 md:p-8 min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#0D0D0D] border border-[#C9A227]/60 flex items-center justify-center text-[#C9A227] shadow-xs shrink-0">
              <span className="material-symbols-outlined text-2xl">accessibility_new</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-title-lg text-xl md:text-2xl font-black text-slate-900 tracking-tight">BPC LOAS</h1>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-[#0D0D0D] text-[#C9A227] border border-[#C9A227]/40 tracking-wider">
                  Módulo Especializado
                </span>
              </div>
              <p className="text-slate-500 text-xs md:text-sm mt-0.5 font-medium">
                Gestão de requerimentos do Benefício de Prestação Continuada
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigateToSubTab('new-case')}
              className="px-4 py-2.5 rounded-xl bg-[#0D0D0D] hover:bg-black text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md hover:shadow-lg border border-[#C9A227]/70 active:scale-95"
            >
              <span className="material-symbols-outlined text-base text-[#C9A227]">add</span>
              <span>+ Novo Caso BPC</span>
            </button>
          </div>
        </div>

        {isLoadingCases && (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-500">
            Carregando casos BPC...
          </div>
        )}

        {loadError && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-900">
            {loadError}
          </div>
        )}

        {activeSubTab === 'pendencias' && pendenciasError && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-900">
            {pendenciasError}
          </div>
        )}

        {activeSubTab === 'prazos' && prazosError && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-900">
            {prazosError}
          </div>
        )}

        {activeSubTab === 'avaliacoes' && avaliacoesError && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-900">
            {avaliacoesError}
          </div>
        )}

        <div className="flex items-center gap-1.5 p-1 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-x-auto">
          {navItems.map((tab) => {
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => navigateToSubTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-[#0D0D0D] text-white border border-[#C9A227]/60 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span className={`material-symbols-outlined text-[16px] ${isActive ? 'text-[#C9A227]' : 'text-slate-500'}`}>
                  {tab.icon}
                </span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div>
          {activeSubTab === 'dashboard' && (
            <BpcDashboardSection
              cases={activeBpcCases}
              pendencias={bpcPendencias}
              deadlines={bpcDeadlines}
              avaliacoes={bpcAvaliacoes}
              onNavigateSubTab={navigateToSubTab}
              onOpenNewCase={() => navigateToSubTab('new-case')}
            />
          )}

          {activeSubTab === 'cases' && (
            editingCase ? (
              <BpcEditCaseSection
                bpcCase={editingCase}
                onSave={handleSaveEditedCase}
                onCancel={() => setEditingCase(null)}
              />
            ) : (
              <BpcCasesSection
                cases={bpcCases}
                onOpenNewCase={() => navigateToSubTab('new-case')}
                onSelectCase={handleOpenCaseEditor}
                onArchiveCase={handleArchiveCase}
                onRestoreCase={handleRestoreCase}
              />
            )
          )}

          {activeSubTab === 'new-case' && (
            <BpcNewCaseSection
              clients={clients}
              onSaveCase={handleSaveNewCase}
              onCancel={() => navigateToSubTab('dashboard')}
            />
          )}

          {activeSubTab === 'pendencias' && (
            <BpcPendenciasSection
              cases={activeBpcCases}
              pendencias={bpcPendencias}
              onOpenNewCase={() => navigateToSubTab('new-case')}
              onSavePendencia={handleSavePendencia}
              onToggleResolved={handleTogglePendenciaResolved}
            />
          )}

          {activeSubTab === 'prazos' && (
            <BpcPrazosSection
              cases={activeBpcCases}
              deadlines={bpcDeadlines}
              onSaveDeadline={handleSaveDeadline}
              onToggleStatus={handleToggleDeadlineStatus}
            />
          )}

          {activeSubTab === 'avaliacoes' && (
            <BpcAvaliacoesSection
              cases={activeBpcCases}
              avaliacoes={bpcAvaliacoes}
              onSaveAvaliacao={handleSaveAvaliacao}
              onUpdateStatus={handleUpdateAvaliacaoStatus}
            />
          )}

          {activeSubTab === 'auditorias' && <BpcAuditoriasSection cases={activeBpcCases} />}
        </div>
      </div>
    </main>
  );
};
