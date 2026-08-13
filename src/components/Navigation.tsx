import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { NavigationTab, FirmSettings } from '../types';
import { LOGO_IMAGE_URL, USER_AVATAR_URL } from '../data/mockData';

interface NavigationProps {
  currentTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  onOpenNewCaseModal: () => void;
  onOpenAddEntryModal: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  settings?: FirmSettings;
  user?: User | null;
  onLogout?: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onTabChange,
  onOpenNewCaseModal,
  onOpenAddEntryModal,
  searchQuery,
  onSearchChange,
  settings = {
    firmName: 'Bizerra Neto',
    firmSubtitle: 'Advocacia',
    logoUrl: LOGO_IMAGE_URL,
    lawyerName: 'Dr. Bizerra Neto',
    lawyerTitle: 'Advogado Sócio • OAB/SP',
    lawyerAvatarUrl: USER_AVATAR_URL,
    oabNumber: 'OAB/SP 412.001',
  },
  user,
  onLogout,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);


  const getSearchPlaceholder = () => {
    switch (currentTab) {
      case 'clients':
        return 'Pesquisar clientes, CPF ou contatos...';
      case 'documents':
        return 'Buscar modelos de petições e contratos...';
      case 'cases':
        return 'Pesquisar processos, partes ou número CNJ...';
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
          <img
            src={settings.logoUrl}
            alt="Logo"
            className="w-6 h-6 rounded-md object-contain bg-white p-0.5 border border-slate-200"
          />
          <span className="font-title-md font-extrabold text-slate-900 text-xs tracking-tight">
            {settings.firmName}
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
            <img
              src={settings.logoUrl}
              alt={`${settings.firmName} Logo`}
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <h1 className="font-title-md text-xs font-black text-slate-900 tracking-tight group-hover:text-blue-900 transition-colors leading-tight uppercase">
              {settings.firmName}
            </h1>
            <p className="font-label-sm text-[9px] text-slate-500 font-extrabold uppercase tracking-widest mt-0.5">
              {settings.firmSubtitle}
            </p>
          </div>
        </div>

        {/* Quick Actions (Novo Processo & Novo Cliente) */}
        <div className="grid grid-cols-2 gap-2 pb-1">
          <button
            onClick={() => {
              onTabChange('create-case');
              setMobileMenuOpen(false);
            }}
            className="glass-btn-primary py-2.5 px-2 rounded-xl text-white font-title-md text-xs font-bold flex items-center justify-center space-x-1.5 group transition-all shadow-xs"
            title="Cadastrar Novo Processo Previdenciário"
          >
            <span className="material-symbols-outlined text-[16px] text-[#C9A227] group-hover:rotate-90 transition-transform">
              add_circle
            </span>
            <span>+ Processo</span>
          </button>

          <button
            onClick={onOpenAddEntryModal}
            className="bg-slate-100 hover:bg-slate-200/80 text-slate-800 py-2.5 px-2 rounded-xl font-title-md text-xs font-bold flex items-center justify-center space-x-1.5 border border-slate-200/90 transition-all shadow-2xs"
            title="Cadastrar Novo Cliente"
          >
            <span className="material-symbols-outlined text-[16px] text-slate-600">person_add</span>
            <span>Cliente</span>
          </button>
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

          {/* Cadastrar Processos */}
          <button
            onClick={() => {
              onTabChange('create-case');
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl transition-all font-medium text-left text-xs ${
              currentTab === 'create-case'
                ? 'text-white bg-[#0D0D0D] font-extrabold border border-[#C9A227]/60 shadow-xs'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <span
              className={`material-symbols-outlined text-[18px] ${currentTab === 'create-case' ? 'text-[#C9A227]' : 'text-[#8c6e14]'}`}
              style={{ fontVariationSettings: currentTab === 'create-case' ? "'FILL' 1" : "'FILL' 0" }}
            >
              post_add
            </span>
            <span>Cadastrar Processos</span>
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
              onTabChange('cases');
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl transition-all font-medium text-left text-xs ${
              currentTab === 'cases'
                ? 'text-white bg-[#0D0D0D] font-extrabold border border-[#C9A227]/60 shadow-xs'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <span
              className={`material-symbols-outlined text-[18px] ${currentTab === 'cases' ? 'text-[#C9A227]' : 'text-slate-500'}`}
              style={{ fontVariationSettings: currentTab === 'cases' ? "'FILL' 1" : "'FILL' 0" }}
            >
              folder_open
            </span>
            <span>Acompanhar Processos</span>
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
                <img
                  src={user?.photoURL || settings.lawyerAvatarUrl}
                  alt="Avatar"
                  className="w-8 h-8 rounded-full object-cover border border-slate-300 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 text-[11px] truncate leading-tight">
                    {user?.displayName || settings.lawyerName}
                  </p>
                  <p className="text-[10px] text-slate-500 truncate leading-tight mt-0.5">
                    {user?.email || settings.oabNumber}
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
                <img
                  src={settings.logoUrl}
                  alt="Logo"
                  className="w-7 h-7 rounded-lg object-contain bg-white p-0.5 border border-slate-200"
                />
                <div>
                  <h2 className="font-bold text-slate-900 text-xs">{settings.firmName}</h2>
                  <p className="text-[10px] text-slate-500 font-semibold">{settings.firmSubtitle}</p>
                </div>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="text-slate-400 hover:text-slate-700">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  onOpenNewCaseModal();
                  setMobileMenuOpen(false);
                }}
                className="glass-btn-primary py-2.5 rounded-xl text-white font-bold text-xs flex items-center justify-center space-x-1"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                <span>Processo</span>
              </button>

              <button
                onClick={() => {
                  onOpenAddEntryModal();
                  setMobileMenuOpen(false);
                }}
                className="bg-slate-100 text-slate-800 py-2.5 rounded-xl font-bold text-xs border border-slate-200 flex items-center justify-center space-x-1"
              >
                <span className="material-symbols-outlined text-[16px]">person_add</span>
                <span>Cliente</span>
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
                  onTabChange('create-case');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-medium ${
                  currentTab === 'create-case' ? 'bg-[#0D0D0D] text-white font-extrabold border border-[#C9A227]/50' : 'text-slate-600'
                }`}
              >
                <span className="material-symbols-outlined text-[18px] text-[#C9A227]">post_add</span>
                <span>Cadastrar Processos</span>
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
                  onTabChange('cases');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-medium ${
                  currentTab === 'cases' ? 'bg-slate-100 text-slate-900 font-extrabold' : 'text-slate-600'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">folder_open</span>
                <span>Acompanhar Processos</span>
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
                  <img
                    src={user?.photoURL || settings.lawyerAvatarUrl}
                    alt="Avatar"
                    className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-900 text-[11px] truncate">{user?.displayName || settings.lawyerName}</p>
                    <p className="text-[10px] text-slate-500 truncate">{user?.email || settings.oabNumber}</p>
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
