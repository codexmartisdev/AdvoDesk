import React, { useState, ChangeEvent } from 'react';
import { FirmSettings, ProcessWorkflow } from '../types';
import { LOGO_IMAGE_URL, USER_AVATAR_URL } from '../data/mockData';
import { INITIAL_WORKFLOWS } from '../data/defaultWorkflows';
import { WorkflowAdminPanel } from './WorkflowAdminPanel';
import { saveWorkflowTemplateInFirestore } from '../services/firestoreService';

export type { FirmSettings };

interface SettingsViewProps {
  settings: FirmSettings;
  onUpdateSettings: (newSettings: FirmSettings) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
}) => {
  const [form, setForm] = useState<FirmSettings>({ ...settings });
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'workflows'>('general');

  const [newAreaInput, setNewAreaInput] = useState('');
  const [newCategoryInput, setNewCategoryInput] = useState('');

  const handleChange = (field: keyof FirmSettings, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveWorkflows = (updatedWorkflows: ProcessWorkflow[]) => {
    const updatedSettings = { ...form, workflows: updatedWorkflows };
    setForm(updatedSettings);
    onUpdateSettings(updatedSettings);
    // Save each workflow directly to modular Firestore collections
    updatedWorkflows.forEach((wf) => {
      saveWorkflowTemplateInFirestore(wf as any);
    });
  };

  // Practice Areas handlers
  const handleAddPracticeArea = () => {
    if (!newAreaInput.trim()) return;
    const trimmed = newAreaInput.trim();
    if (!form.practiceAreas.includes(trimmed)) {
      handleChange('practiceAreas', [...form.practiceAreas, trimmed]);
    }
    setNewAreaInput('');
  };

  const handleRemovePracticeArea = (index: number) => {
    const updated = form.practiceAreas.filter((_, i) => i !== index);
    handleChange('practiceAreas', updated);
  };

  // Client Categories handlers
  const handleAddClientCategory = () => {
    if (!newCategoryInput.trim()) return;
    const trimmed = newCategoryInput.trim();
    if (!form.clientCategories.includes(trimmed)) {
      handleChange('clientCategories', [...form.clientCategories, trimmed]);
    }
    setNewCategoryInput('');
  };

  const handleRemoveClientCategory = (index: number) => {
    const updated = form.clientCategories.filter((_, i) => i !== index);
    handleChange('clientCategories', updated);
  };

  const handleFileUpload = (
    e: ChangeEvent<HTMLInputElement>,
    field: 'logoUrl' | 'lawyerAvatarUrl'
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          handleChange(field, reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings(form);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 4000);
  };

  const handleResetDefaults = () => {
    const defaults: FirmSettings = {
      firmName: 'Bizerra Neto',
      firmSubtitle: 'Advocacia',
      logoUrl: LOGO_IMAGE_URL,
      lawyerName: 'Dr. Bizerra Neto',
      lawyerTitle: 'Advogado Sócio • OAB/SP',
      lawyerAvatarUrl: USER_AVATAR_URL,
      oabNumber: 'OAB/SP 412.001',
      notificationEmail: 'codex.martis.dev@gmail.com',
      practiceAreas: [
        'Contencioso Cível',
        'Direito Trabalhista',
        'Direito Previdenciário',
        'Direito de Família',
        'Direito Empresarial',
        'Direito Tributário',
        'Direito Penal',
      ],
      clientCategories: [
        'BPC Loas',
        'Auxílio Doença',
        'Aposentadoria',
        'Trabalhista',
        'Cível',
        'Empresarial',
        'Família / Sucessões',
      ],
    };
    setForm(defaults);
    onUpdateSettings(defaults);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 4000);
  };

  return (
    <main className="md:ml-64 pt-16 md:pt-8 pb-12 px-4 sm:px-6 md:px-8 min-h-screen relative z-10 max-w-6xl mx-auto space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="font-display-lg text-2xl md:text-3xl font-extrabold text-slate-900 mb-1">
            Configurações do Sistema
          </h1>
          <p className="text-slate-500 text-xs md:text-sm">
            Personalize a identidade da banca, dados cadastrais, e gerencie os workflows e etapas padronizadas dos processos.
          </p>
        </div>

        {/* Top Tab Controls */}
        <div className="flex items-center space-x-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
              activeTab === 'general'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-base">tune</span>
            <span>Identidade & Geral</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('workflows')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
              activeTab === 'workflows'
                ? 'bg-[#0D0D0D] text-white border border-[#C9A227]/60 shadow-sm'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <span className="material-symbols-outlined text-base text-[#C9A227]">account_tree</span>
            <span>Painel de Workflows</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[9px] font-black bg-[#C9A227] text-slate-950">
              Admin
            </span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {savedSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center space-x-2">
            <span className="material-symbols-outlined text-emerald-600">check_circle</span>
            <span>Configurações atualizadas e aplicadas em toda a plataforma!</span>
          </div>
          <button onClick={() => setSavedSuccess(false)} className="text-emerald-600 hover:text-emerald-900">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {/* Tab 1: General Settings Form */}
      {activeTab === 'general' && (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
          {/* Section 1: System Logo & Firm Name */}
        <section className="glass-panel rounded-2xl p-6 bg-white border border-slate-200/90 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Identidade Visual do Sistema / Logo</h3>
              <p className="text-xs text-slate-500">Logotipo exibido no menu lateral, cabeçalho e minutas.</p>
            </div>
            <span className="material-symbols-outlined text-blue-900">branding_watermark</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {/* Logo Preview */}
            <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pré-visualização</span>
              <div className="w-24 h-24 rounded-xl bg-white p-2 border border-slate-300 shadow-xs flex items-center justify-center overflow-hidden">
                <img
                  src={form.logoUrl}
                  alt="Logo Preview"
                  className="max-w-full max-h-full object-contain"
                  onError={(e) => {
                    // Fallback visual if broken image
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
              <span className="text-[10px] text-slate-400 font-medium text-center">Tamanho recomendado: PNG/SVG quadrado</span>
            </div>

            {/* Logo Controls */}
            <div className="md:col-span-2 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Alterar Imagem do Logo (Upload do Computador)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, 'logoUrl')}
                  className="w-full text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-900 hover:file:bg-blue-100 cursor-pointer"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Ou insira o Link / URL da Imagem do Logo</label>
                <input
                  type="text"
                  value={form.logoUrl}
                  onChange={(e) => handleChange('logoUrl', e.target.value)}
                  placeholder="https://exemplo.com/logo.png"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nome Principal da Banca / Sistema</label>
                  <input
                    type="text"
                    required
                    value={form.firmName}
                    onChange={(e) => handleChange('firmName', e.target.value)}
                    placeholder="Ex: Bizerra Neto"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Subtítulo / Ramo da Banca</label>
                  <input
                    type="text"
                    required
                    value={form.firmSubtitle}
                    onChange={(e) => handleChange('firmSubtitle', e.target.value)}
                    placeholder="Ex: Advocacia & Consultoria"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-900"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Lawyer Profile & Photo */}
        <section className="glass-panel rounded-2xl p-6 bg-white border border-slate-200/90 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Foto & Perfil do Advogado Usuário</h3>
              <p className="text-xs text-slate-500">Avatar do usuário, nome e título exibidos no perfil e relatórios.</p>
            </div>
            <span className="material-symbols-outlined text-blue-900">account_circle</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {/* Lawyer Avatar Preview */}
            <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Foto de Perfil</span>
              <div className="w-24 h-24 rounded-full bg-slate-200 border-2 border-slate-300 shadow-xs flex items-center justify-center overflow-hidden">
                <img
                  src={form.lawyerAvatarUrl}
                  alt="Lawyer Avatar Preview"
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="text-[10px] text-slate-400 font-medium text-center">Foto formal / corporativa</span>
            </div>

            {/* Lawyer Avatar Controls */}
            <div className="md:col-span-2 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Carregar Nova Foto do Advogado (Upload do Computador)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, 'lawyerAvatarUrl')}
                  className="w-full text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-900 hover:file:bg-blue-100 cursor-pointer"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Ou insira o Link / URL da Foto</label>
                <input
                  type="text"
                  value={form.lawyerAvatarUrl}
                  onChange={(e) => handleChange('lawyerAvatarUrl', e.target.value)}
                  placeholder="https://exemplo.com/foto-advogado.jpg"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nome do Advogado Titular</label>
                  <input
                    type="text"
                    required
                    value={form.lawyerName}
                    onChange={(e) => handleChange('lawyerName', e.target.value)}
                    placeholder="Ex: Dr. Bizerra Neto"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Cargo / Inscrição OAB</label>
                  <input
                    type="text"
                    required
                    value={form.lawyerTitle}
                    onChange={(e) => handleChange('lawyerTitle', e.target.value)}
                    placeholder="Ex: Advogado Sócio • OAB/SP 412.001"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-900"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section: Email for Google Calendar & System Notifications */}
        <section className="glass-panel rounded-2xl p-6 bg-white border border-slate-200/90 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">E-mail Cadastrado & Notificações (Google Agenda)</h3>
              <p className="text-xs text-slate-500">Endereço de e-mail principal utilizado para os avisos de prazos, compromissos e integração com o Google Agenda.</p>
            </div>
            <span className="material-symbols-outlined text-blue-900">mark_email_read</span>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                E-mail para Alertas e Google Agenda <span className="text-blue-900 font-extrabold">*</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={form.notificationEmail || ''}
                  onChange={(e) => handleChange('notificationEmail', e.target.value)}
                  placeholder="seuemail@exemplo.com"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-3.5 py-2.5 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-900"
                />
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-base">
                  mail
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-200/80 text-blue-950 space-y-1">
              <span className="font-extrabold flex items-center gap-1.5 text-xs text-blue-900">
                <span className="material-symbols-outlined text-sm">info</span>
                Como funciona o envio de avisos:
              </span>
              <p className="text-[11px] leading-relaxed text-blue-900/90 font-medium">
                Os compromissos do Calendário sincronizados com o Google Agenda enviarão notificações pop-up no seu celular e e-mails de alerta antecipados diretamente para este endereço.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: Practice Areas (Ramos de Atuação) */}
        <section className="glass-panel rounded-2xl p-6 bg-white border border-slate-200/90 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Ramos de Atuação (Processos)</h3>
              <p className="text-xs text-slate-500">Cadastre e edite as opções de áreas de direito disponíveis no formulário de Cadastro de Novo Processo.</p>
            </div>
            <span className="material-symbols-outlined text-blue-900">gavel</span>
          </div>

          <div className="space-y-3 text-xs">
            {/* Add new Practice Area Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newAreaInput}
                onChange={(e) => setNewAreaInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddPracticeArea();
                  }
                }}
                placeholder="Ex: Direito Ambiental, Direito Securitário..."
                className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-900"
              />
              <button
                type="button"
                onClick={handleAddPracticeArea}
                className="px-4 py-2 rounded-xl bg-blue-900 text-white font-bold hover:bg-blue-800 transition-colors flex items-center gap-1 shadow-xs"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                <span>Adicionar Ramo</span>
              </button>
            </div>

            {/* List of current Practice Areas */}
            <div className="flex flex-wrap gap-2 pt-1">
              {form.practiceAreas && form.practiceAreas.map((area, idx) => (
                <div
                  key={idx}
                  className="flex items-center space-x-2 bg-slate-100 border border-slate-300 text-slate-800 px-3 py-1.5 rounded-xl font-bold"
                >
                  <span>{area}</span>
                  <button
                    type="button"
                    onClick={() => handleRemovePracticeArea(idx)}
                    className="text-slate-400 hover:text-red-600 transition-colors flex items-center"
                    title="Remover este ramo"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 4: Client Categories (Categorias / Benefícios) */}
        <section className="glass-panel rounded-2xl p-6 bg-white border border-slate-200/90 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Categorias & Benefícios (Clientes)</h3>
              <p className="text-xs text-slate-500">Cadastre e edite os tipos de benefícios ou categorias de clientes vinculados no Cadastro de Novo Cliente.</p>
            </div>
            <span className="material-symbols-outlined text-blue-900">category</span>
          </div>

          <div className="space-y-3 text-xs">
            {/* Add new Client Category Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newCategoryInput}
                onChange={(e) => setNewCategoryInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddClientCategory();
                  }
                }}
                placeholder="Ex: Pensão por Morte, Seguro Defeso..."
                className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-900"
              />
              <button
                type="button"
                onClick={handleAddClientCategory}
                className="px-4 py-2 rounded-xl bg-blue-900 text-white font-bold hover:bg-blue-800 transition-colors flex items-center gap-1 shadow-xs"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                <span>Adicionar Categoria</span>
              </button>
            </div>

            {/* List of current Client Categories */}
            <div className="flex flex-wrap gap-2 pt-1">
              {form.clientCategories && form.clientCategories.map((cat, idx) => (
                <div
                  key={idx}
                  className="flex items-center space-x-2 bg-blue-50 border border-blue-200 text-blue-950 px-3 py-1.5 rounded-xl font-bold"
                >
                  <span>{cat}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveClientCategory(idx)}
                    className="text-blue-400 hover:text-red-600 transition-colors flex items-center"
                    title="Remover esta categoria"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 5: Extra Firm Details */}
        <section className="glass-panel rounded-2xl p-6 bg-white border border-slate-200/90 shadow-sm space-y-4">
          <h3 className="text-base font-extrabold text-slate-900">Registro & Chaves de API</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Número de Registro na OAB</label>
              <input
                type="text"
                value={form.oabNumber}
                onChange={(e) => handleChange('oabNumber', e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-900"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Servidor de Inteligência Artificial</label>
              <input
                type="text"
                disabled
                value="Gemini API - Servidor Seguro Cloud Run"
                className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-500 font-semibold cursor-not-allowed"
              />
            </div>
          </div>
        </section>

        {/* Submit Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 font-bold text-xs transition-colors"
          >
            Restaurar Padrões da Banca
          </button>

          <button
            type="submit"
            className="w-full sm:w-auto glass-btn-primary px-8 py-3 rounded-xl text-white font-extrabold text-xs shadow-sm flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">save</span>
            <span>Salvar Alterações</span>
          </button>
        </div>
      </form>
      )}

      {/* Tab 2: Workflow Administrative Panel */}
      {activeTab === 'workflows' && (
        <WorkflowAdminPanel
          workflows={form.workflows || INITIAL_WORKFLOWS}
          onSaveWorkflows={handleSaveWorkflows}
          practiceAreas={form.practiceAreas}
        />
      )}
    </main>
  );
};
