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

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onTabChange,
  searchQuery,
  onSearchChange,
  settings,
  user,
  onLogout,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const firmName = settings?.firmName?.trim() || 'AdvoDesk';
  const firmSubtitle = settings?.firmSubtitle?.trim() || 'Gestão Jurídica';
  const logoUrl = settings?.logoUrl?.trim() || '';
  const avatarUrl = user?.photoURL?.trim() || settings?.lawyerAvatarUrl?.trim() || '';


  const getSearchPlaceholder = () => {
    if (String(currentTab) === 'cases') {
      return 'Buscar casos, processos, clientes ou prazos...';
    }
    switch (currentTab) {
      case 'clients':
        return 'Pesquisar clientes, CPF ou contatos...';
      case 'documents':
        return 'Buscar modelos de petições e contratos...';
      case 'calendar':
        return 'Buscar prazos fatais e audiências...';
      default:
        return 'Pesquisar em toda a plataforma...';
    }
  };

  return (
    <>
      {/* Mobile Menu Toggle Button (Floating) */}
      <div className="md:hidden fixed top-3 left-3 z-40">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="flex items-center space-x-2.5 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-slate-200/90 shadow-md text-slate-800 hover:bg-slate-50 transition-all active:scale-95"
        >
          <span className="material-symbols-outlined text-[20px] text-slate-700">menu</span>
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Logo"
              className="w-6 h-6 rounded-md object-contain bg-white p-0.5 border border-slate-200"
            />
          ) : (
            <div className="w-6 h-6 rounded-md bg-slate-900 text-white flex items-center justify-center">
              <span className="material-symbols-outlined text-[14px]">account_balance</span>
            </div>
          )}
          <span className="font-title-md font-extrabold text-slate-900 text-xs tracking-tight">
            {firmName}
          </span>
        </button>
      </div>

      {/* SideNavBar Desktop */}
      <nav className="bg-white/95 backdrop-blur-xl hidden md:flex h-screen w-64 fixed left-0 top-0 flex-col p-5 space-y-3 z-40 border-r border-slate-200/80 shadow-xs">
        {/* Header / Brand */}
        <div
          className="flex items-center space-x-3 pb-2 cursor-pointer group"
          onClick={() => onTabChange('dashboard')}
        >
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-white flex items-center justify-center shrink-0 border border-slate-200 shadow-xs group-hover:scale-105 transition-transform p-1">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={`${firmName} Logo`}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-full h-full rounded-lg bg-slate-900 text-[#C9A227] flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">account_balance</span>
              </div>
            )}
          </div>
          <div>
            <h1 className="font-title-md text-xs font-black text-slate-900 tracking-tight group-hover:text-blue-900 transition-colors leading-tight uppercase">
              {firmName}
            </h1>
            <p className="font-label-sm text-[9px] text-slate-500 font-extrabold uppercase tracking-widest mt-0.5">
              {firmSubtitle}
            </p>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 space-y-1 overflow-y-auto pr-1">
          {/* Dashboard */}
          <button
            onClick={() => {
              onTabChange('dashboard');
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl transition-all font-medium text-left text-xs ${
              currentTab === 'dashboard'
                ? 'text-white bg-[#0D0D0D] font-extrabold border border-[#C9A227]/60 shadow-xs'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <span
              className={`material-symbols-outlined text-[18px] ${currentTab === 'dashboard' ? 'text-[#C9A227]' : 'text-slate-500'}`}
              style={{ fontVariationSettings: currentTab === 'dashboard' ? "'FILL' 1" : "'FILL' 0" }}
            >
              dashboard
            </span>
            <span>Painel Principal</span>
          </button>

          {/* BPC LOAS */}
          <button
            onClick={() => {
              onTabChange('bpc-loas');
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl transition-all font-medium text-left text-xs ${
              currentTab === 'bpc-loas'
                ? 'text-white bg-[#0D0D0D] font-extrabold border border-[#C9A227]/60 shadow-xs'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <span
              className={`material-symbols-outlined text-[18px] ${currentTab === 'bpc-loas' ? 'text-[#C9A227]' : 'text-slate-500'}`}
              style={{ fontVariationSettings: currentTab === 'bpc-loas' ? "'FILL' 1" : "'FILL' 0" }}
            >
              accessibility_new
            </span>
            <span>BPC LOAS</span>
          </button>

          {/* Clients */}
          <button
            onClick={() => {
              onTabChange('clients');
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl transition-all font-medium text-left text-xs ${
              currentTab === 'clients'
                ? 'text-white bg-[#0D0D0D] font-extrabold border border-[#C9A227]/60 shadow-xs'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <span
              className={`material-symbols-outlined text-[18px] ${currentTab === 'clients' ? 'text-[#C9A227]' : 'text-slate-500'}`}
              style={{ fontVariationSettings: currentTab === 'clients' ? "'FILL' 1" : "'FILL' 0" }}
            >
              group
            </span>
            <span>Clientes</span>
          </button>

          {/* Cases */}
          <button
            onClick={() => {
              onTabChange('cases' as NavigationTab);
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl transition-all font-medium text-left text-xs ${
              String(currentTab) === 'cases'
                ? 'text-white bg-[#0D0D0D] font-extrabold border border-[#C9A227]/60 shadow-xs'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <span
              className={`material-symbols-outlined text-[18px] ${String(currentTab) === 'cases' ? 'text-[#C9A227]' : 'text-slate-500'}`}
              style={{ fontVariationSettings: String(currentTab) === 'cases' ? "'FILL' 1" : "'FILL' 0" }}
            >
              folder_open
            </span>
            <span>Casos & Processos</span>
          </button>

          {/* Documents */}
          <button
            onClick={() => {
              onTabChange('documents');
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl transition-all font-medium text-left text-xs ${
              currentTab === 'documents'
                ? 'text-white bg-[#0D0D0D] font-extrabold border border-[#C9A227]/60 shadow-xs'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <span
              className={`material-symbols-outlined text-[18px] ${currentTab === 'documents' ? 'text-[#C9A227]' : 'text-slate-500'}`}
              style={{ fontVariationSettings: currentTab === 'documents' ? "'FILL' 1" : "'FILL' 0" }}
            >
              description
            </span>
            <span>Documentos & Minutas</span>
          </button>

          {/* Calendar */}
          <button
            onClick={() => {
              onTabChange('calendar');
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl transition-all font-medium text-left text-xs ${
              currentTab === 'calendar'
                ? 'text-white bg-[#0D0D0D] font-extrabold border border-[#C9A227]/60 shadow-xs'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <span
              className={`material-symbols-outlined text-[18px] ${currentTab === 'calendar' ? 'text-[#C9A227]' : 'text-slate-500'}`}
              style={{ fontVariationSettings: currentTab === 'calendar' ? "'FILL' 1" : "'FILL' 0" }}
            >
              calendar_month
            </span>
            <span>Agenda & Prazos</span>
          </button>
        </div>

        {/* Footer Links & Lawyer Profile */}
        <div className="pt-2 border-t border-slate-200/80 space-y-1">
          <button
            onClick={() => onTabChange('settings')}
            className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition-all font-medium text-left text-xs ${
              currentTab === 'settings'
                ? 'text-white bg-[#0D0D0D] font-bold border border-[#C9A227]/50'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <span className={`material-symbols-outlined text-[18px] ${currentTab === 'settings' ? 'text-[#C9A227]' : 'text-slate-500'}`}>settings</span>
            <span>Configurações</span>
          </button>
          <button
            onClick={() => onTabChange('support')}
            className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition-all font-medium text-left text-xs ${
              currentTab === 'support'
                ? 'text-white bg-[#0D0D0D] font-bold border border-[#C9A227]/50'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <span className={`material-symbols-outlined text-[18px] ${currentTab === 'support' ? 'text-[#C9A227]' : 'text-slate-500'}`}>help_outline</span>
            <span>Suporte Tecnológico</span>
          </button>

          {/* Profile Card in Sidebar Footer */}
          <div className="pt-2">
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200/80">
              <div 
                onClick={() => onTabChange('settings')}
                className="flex items-center space-x-2.5 min-w-0 cursor-pointer flex-1"
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Avatar"
                    className="w-8 h-8 rounded-full object-cover border border-slate-300 shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center shrink-0 border border-slate-300">
                    <span className="material-symbols-outlined text-[18px]">person</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 text-[11px] truncate leading-tight">
                    {user?.displayName || settings?.lawyerName}
                  </p>
                  <p className="text-[10px] text-slate-500 truncate leading-tight mt-0.5">
                    {user?.email || settings?.oabNumber}
                  </p>
                </div>
              </div>
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  title="Sair do Sistema"
                  className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors shrink-0 ml-1"
                >
                  <span className="material-symbols-outlined text-[18px]">logout</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Sidebar Modal Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[80vw] bg-white h-full p-5 flex flex-col space-y-3 border-r border-slate-200 shadow-2xl z-10">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Logo"
                    className="w-7 h-7 rounded-lg object-contain bg-white p-0.5 border border-slate-200"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-lg bg-slate-900 text-[#C9A227] flex items-center justify-center">
                    <span className="material-symbols-outlined text-[16px]">account_balance</span>
                  </div>
                )}
                <div>
                  <h2 className="font-bold text-slate-900 text-xs">{firmName}</h2>
                  <p className="text-[10px] text-slate-500 font-semibold">{firmSubtitle}</p>
                </div>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="text-slate-400 hover:text-slate-700">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex-1 space-y-1 overflow-y-auto">
              <button
                onClick={() => {
                  onTabChange('dashboard');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-medium ${
                  currentTab === 'dashboard' ? 'bg-[#0D0D0D] text-white font-extrabold border border-[#C9A227]/50' : 'text-slate-600'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">dashboard</span>
                <span>Painel Principal</span>
              </button>
              <button
                onClick={() => {
                  onTabChange('bpc-loas');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-medium ${
                  currentTab === 'bpc-loas' ? 'bg-[#0D0D0D] text-white font-extrabold border border-[#C9A227]/50' : 'text-slate-600'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">accessibility_new</span>
                <span>BPC LOAS</span>
              </button>
              <button
                onClick={() => {
                  onTabChange('clients');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-medium ${
                  currentTab === 'clients' ? 'bg-slate-100 text-slate-900 font-extrabold' : 'text-slate-600'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">group</span>
                <span>Clientes</span>
              </button>
              <button
                onClick={() => {
                  onTabChange('cases' as NavigationTab);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-medium ${
                  String(currentTab) === 'cases' ? 'bg-slate-100 text-slate-900 font-extrabold' : 'text-slate-600'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">folder_open</span>
                <span>Casos & Processos</span>
              </button>
              <button
                onClick={() => {
                  onTabChange('documents');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-medium ${
                  currentTab === 'documents' ? 'bg-slate-100 text-slate-900 font-extrabold' : 'text-slate-600'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">description</span>
                <span>Documentos & Minutas</span>
              </button>
              <button
                onClick={() => {
                  onTabChange('calendar');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-medium ${
                  currentTab === 'calendar' ? 'bg-slate-100 text-slate-900 font-extrabold' : 'text-slate-600'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                <span>Agenda & Prazos</span>
              </button>
              <button
                onClick={() => {
                  onTabChange('settings');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-medium ${
                  currentTab === 'settings' ? 'bg-slate-100 text-slate-900 font-extrabold' : 'text-slate-600'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">settings</span>
                <span>Configurações</span>
              </button>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Avatar"
                      className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                    />
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
