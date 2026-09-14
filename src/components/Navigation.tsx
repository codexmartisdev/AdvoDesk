import React, { useState } from 'react';
import { User } from '@firebase/auth';
import { NavigationTab, FirmSettings } from '../types';

interface NavigationProps {
  currentTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  settings?: FirmSettings;
  user?: User | null;
  onLogout?: () => void;
}

type NavItem = {
  id: string;
  label: string;
  icon: string;
};

const PRIMARY_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Painel Principal', icon: 'dashboard' },
  { id: 'bpc-loas', label: 'BPC LOAS', icon: 'accessibility_new' },
  { id: 'clients', label: 'Clientes', icon: 'group' },
  { id: 'cases', label: 'Casos & Processos', icon: 'folder_open' },
  { id: 'documents', label: 'Documentos & Minutas', icon: 'description' },
  { id: 'calendar', label: 'Agenda & Prazos', icon: 'calendar_month' },
];

const FOOTER_ITEMS: NavItem[] = [
  { id: 'settings', label: 'Configurações', icon: 'settings' },
  { id: 'support', label: 'Suporte Tecnológico', icon: 'help_outline' },
];

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onTabChange,
  searchQuery: _searchQuery,
  onSearchChange: _onSearchChange,
  settings,
  user,
  onLogout,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const firmName = settings?.firmName?.trim() || 'AdvoDesk';
  const firmSubtitle = settings?.firmSubtitle?.trim() || 'Gestão Jurídica';
  const logoUrl = settings?.logoUrl?.trim() || '';
  const avatarUrl = user?.photoURL?.trim() || settings?.lawyerAvatarUrl?.trim() || '';
  const activeTab = String(currentTab);

  const selectTab = (id: string) => {
    onTabChange(id as NavigationTab);
    setMobileMenuOpen(false);
  };

  const renderBrand = (compact = false) => (
    <div className="flex items-center space-x-3 min-w-0">
      <div className={`${compact ? 'w-7 h-7 rounded-lg' : 'w-10 h-10 rounded-xl'} overflow-hidden bg-white flex items-center justify-center shrink-0 border border-slate-200 shadow-xs p-1`}>
        {logoUrl ? (
          <img src={logoUrl} alt={`${firmName} Logo`} className="w-full h-full object-contain" />
        ) : (
          <div className="w-full h-full rounded-lg bg-slate-900 text-[#C9A227] flex items-center justify-center">
            <span className={`material-symbols-outlined ${compact ? 'text-[16px]' : 'text-[20px]'}`}>account_balance</span>
          </div>
        )}
      </div>
      <div className="min-w-0">
        <h1 className={`${compact ? 'text-xs' : 'text-xs'} font-black text-slate-900 tracking-tight truncate uppercase`}>{firmName}</h1>
        <p className="text-[9px] text-slate-500 font-extrabold uppercase tracking-widest mt-0.5 truncate">{firmSubtitle}</p>
      </div>
    </div>
  );

  const renderNavButton = (item: NavItem, mobile = false) => {
    const active = activeTab === item.id;
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => selectTab(item.id)}
        className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl transition-all font-medium text-left text-xs ${
          active
            ? 'text-white bg-[#0D0D0D] font-extrabold border border-[#C9A227]/60 shadow-xs'
            : mobile
              ? 'text-slate-600 hover:bg-slate-100'
              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
        }`}
      >
        <span
          className={`material-symbols-outlined text-[18px] ${active ? 'text-[#C9A227]' : 'text-slate-500'}`}
          style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
        >
          {item.icon}
        </span>
        <span>{item.label}</span>
      </button>
    );
  };

  return (
    <>
      <div className="md:hidden fixed top-3 left-3 z-40">
        <button
          type="button"
          onClick={() => setMobileMenuOpen((open) => !open)}
          className="flex items-center space-x-2.5 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-slate-200/90 shadow-md text-slate-800 hover:bg-slate-50 transition-all active:scale-95"
        >
          <span className="material-symbols-outlined text-[20px] text-slate-700">menu</span>
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="w-6 h-6 rounded-md object-contain bg-white p-0.5 border border-slate-200" />
          ) : (
            <div className="w-6 h-6 rounded-md bg-slate-900 text-white flex items-center justify-center">
              <span className="material-symbols-outlined text-[14px]">account_balance</span>
            </div>
          )}
          <span className="font-extrabold text-slate-900 text-xs tracking-tight">{firmName}</span>
        </button>
      </div>

      <nav className="bg-white/95 backdrop-blur-xl hidden md:flex h-screen w-64 fixed left-0 top-0 flex-col p-5 space-y-3 z-40 border-r border-slate-200/80 shadow-xs">
        <button type="button" onClick={() => selectTab('dashboard')} className="text-left pb-2 group">
          {renderBrand(false)}
        </button>

        <div className="flex-1 space-y-1 overflow-y-auto pr-1">
          {PRIMARY_ITEMS.map((item) => renderNavButton(item))}
        </div>

        <div className="pt-2 border-t border-slate-200/80 space-y-1">
          {FOOTER_ITEMS.map((item) => renderNavButton(item))}
          <div className="pt-2">
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200/80">
              <button type="button" onClick={() => selectTab('settings')} className="flex items-center space-x-2.5 min-w-0 cursor-pointer flex-1 text-left">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-8 h-8 rounded-full object-cover border border-slate-300 shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center shrink-0 border border-slate-300">
                    <span className="material-symbols-outlined text-[18px]">person</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 text-[11px] truncate leading-tight">{user?.displayName || settings?.lawyerName}</p>
                  <p className="text-[10px] text-slate-500 truncate leading-tight mt-0.5">{user?.email || settings?.oabNumber}</p>
                </div>
              </button>
              {onLogout && (
                <button type="button" onClick={onLogout} title="Sair do Sistema" className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors shrink-0 ml-1">
                  <span className="material-symbols-outlined text-[18px]">logout</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative w-72 max-w-[80vw] bg-white h-full p-5 flex flex-col space-y-3 border-r border-slate-200 shadow-2xl z-10">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              {renderBrand(true)}
              <button type="button" onClick={() => setMobileMenuOpen(false)} className="text-slate-400 hover:text-slate-700">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex-1 space-y-1 overflow-y-auto">
              {PRIMARY_ITEMS.map((item) => renderNavButton(item, true))}
              {FOOTER_ITEMS.map((item) => renderNavButton(item, true))}
            </div>

            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center shrink-0 border border-slate-200">
                      <span className="material-symbols-outlined text-[18px]">person</span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-900 text-[11px] truncate">{user?.displayName || settings?.lawyerName}</p>
                    <p className="text-[10px] text-slate-500 truncate">{user?.email || settings?.oabNumber}</p>
                  </div>
                </div>
                {onLogout && (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onLogout();
                    }}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors shrink-0 ml-1"
                    title="Sair do Sistema"
                  >
                    <span className="material-symbols-outlined text-[18px]">logout</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
