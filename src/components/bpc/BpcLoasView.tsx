import React, { useEffect, useState } from 'react';
import { Client } from '../../types';
import { BpcCaseItem, BpcSubTab } from '../../types/bpc';
import { auth } from '../../lib/firebase';
import { getUserProfileInFirestore } from '../../services/firestoreService';
import {
  saveBpcCaseInFirestore,
  subscribeToBpcCases,
} from '../../services/bpcFirestoreService';
import { BpcDashboardSection } from './BpcDashboardSection';
import { BpcCasesSection } from './BpcCasesSection';
import { BpcNewCaseSection } from './BpcNewCaseSection';
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
  const [firmId, setFirmId] = useState<string | null>(null);
  const [isLoadingCases, setIsLoadingCases] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    const connectToBpcCases = async () => {
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
      unsubscribe = subscribeToBpcCases(
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
    };

    void connectToBpcCases().catch((error) => {
      console.error('Erro ao inicializar casos BPC:', error);
      if (active) {
        setLoadError('Não foi possível inicializar a carteira BPC.');
        setIsLoadingCases(false);
      }
    });

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  const handleSaveNewCase = async (newCase: BpcCaseItem) => {
    if (!firmId) {
      window.alert('Não foi possível identificar o escritório para salvar o caso BPC.');
      return;
    }

    try {
      await saveBpcCaseInFirestore(newCase, firmId);
      setActiveSubTab('cases');
    } catch (error) {
      console.error('Erro ao salvar caso BPC:', error);
      window.alert('Não foi possível salvar o caso BPC. Tente novamente.');
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
        {/* Module Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#0D0D0D] border border-[#C9A227]/60 flex items-center justify-center text-[#C9A227] shadow-xs shrink-0">
              <span className="material-symbols-outlined text-2xl">accessibility_new</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-title-lg text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                  BPC LOAS
                </h1>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-[#0D0D0D] text-[#C9A227] border border-[#C9A227]/40 tracking-wider">
                  Módulo Especializado
                </span>
              </div>
              <p className="text-slate-500 text-xs md:text-sm mt-0.5 font-medium">
                Gestão de requerimentos do Benefício de Prestação Continuada
              </p>
            </div>
          </div>

          {/* Primary Action Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveSubTab('new-case')}
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

        {/* Sub-Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-x-auto">
          {navItems.map((tab) => {
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-[#0D0D0D] text-white border border-[#C9A227]/60 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span
                  className={`material-symbols-outlined text-[16px] ${
                    isActive ? 'text-[#C9A227]' : 'text-slate-500'
                  }`}
                >
                  {tab.icon}
                </span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Sub-Views Content */}
        <div>
          {activeSubTab === 'dashboard' && (
            <BpcDashboardSection
              cases={bpcCases}
              onNavigateSubTab={setActiveSubTab}
              onOpenNewCase={() => setActiveSubTab('new-case')}
            />
          )}

          {activeSubTab === 'cases' && (
            <BpcCasesSection
              cases={bpcCases}
              onOpenNewCase={() => setActiveSubTab('new-case')}
            />
          )}

          {activeSubTab === 'new-case' && (
            <BpcNewCaseSection
              clients={clients}
              onSaveCase={handleSaveNewCase}
              onCancel={() => setActiveSubTab('dashboard')}
            />
          )}

          {activeSubTab === 'pendencias' && (
            <BpcPendenciasSection
              cases={bpcCases}
              onOpenNewCase={() => setActiveSubTab('new-case')}
            />
          )}

          {activeSubTab === 'prazos' && (
            <BpcPrazosSection cases={bpcCases} />
          )}

          {activeSubTab === 'avaliacoes' && (
            <BpcAvaliacoesSection cases={bpcCases} />
          )}

          {activeSubTab === 'auditorias' && (
            <BpcAuditoriasSection cases={bpcCases} />
          )}
        </div>
      </div>
    </main>
  );
};
