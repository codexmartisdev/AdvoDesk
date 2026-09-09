import React, { useState } from 'react';
import { Client } from '../../types';
import { BpcCaseItem, BpcSubTab } from '../../types/bpc';
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

  // Inicializar casos BPC sincronizados ou mock inicial se a carteira já tiver clientes BPC
  const [bpcCases, setBpcCases] = useState<BpcCaseItem[]>(() => {
    // Detectar clientes já cadastrados na categoria BPC Loas para preencher o módulo
    const bpcClients = clients.filter(
      (c) => c.typePill === 'BPC Loas' || c.name.includes('LOAS') || c.benefitNumber
    );

    if (bpcClients.length > 0) {
      return bpcClients.map((c, index) => ({
        id: `bpc-init-${c.id}`,
        caseNumber: `BPC #${1000 + index}`,
        clientId: c.id,
        clientName: c.name,
        clientCpf: c.cpf,
        clientPhone: c.phone,
        modality: index % 2 === 0 ? 'idoso' : 'pcd',
        status: index === 0 ? 'Triagem' : 'CadÚnico Pendente',
        currentStep: 'triagem',
        createdAt: c.updatedAt || 'Recente',
        updatedAt: 'Recente',
        cadUnicoStatus: index === 0 ? 'Atualizado' : 'Pendente',
        nisNumber: c.nitPisPasep || undefined,
        protocolNumber: c.benefitNumber || undefined,
      }));
    }

    return [];
  });

  const handleSaveNewCase = (newCase: BpcCaseItem) => {
    setBpcCases((prev) => [newCase, ...prev]);
    setActiveSubTab('cases');
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
