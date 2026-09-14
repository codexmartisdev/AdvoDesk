import React, { useState } from 'react';
import { DocumentTemplate } from '../types';
import { VariablesGuideModal } from './VariablesGuideModal';

interface DocumentsViewProps {
  templates: DocumentTemplate[];
  searchQuery: string;
  docCategories: string[];
  docFormats: string[];
  onSelectTemplateToGenerate: (template: DocumentTemplate) => void;
  onSaveTemplate: (template: DocumentTemplate) => void;
  onDeleteTemplate: (templateId: string) => void;
  onAddCategory: (categoryName: string) => void;
  onEditCategory: (oldCategory: string, newCategory: string) => void;
  onDeleteCategory: (categoryName: string) => void;
  onAddFormat: (formatName: string) => void;
  onEditFormat: (oldFormat: string, newFormat: string) => void;
  onDeleteFormat: (formatName: string) => void;
}

const AVAILABLE_ICONS = [
  { id: 'description', label: 'Documento' },
  { id: 'gavel', label: 'Justiça / Martelo' },
  { id: 'assignment_ind', label: 'Procuração / Pessoa' },
  { id: 'account_balance', label: 'Tribunal / Banco' },
  { id: 'handshake', label: 'Acordo / Contrato' },
  { id: 'mail', label: 'Notificação' },
  { id: 'note_add', label: 'Petição / Requerimento' },
  { id: 'history_edu', label: 'Recurso / Alegações' },
  { id: 'folder', label: 'Pasta de Caso' },
  { id: 'balance', label: 'Balança do Direito' },
];

export const DocumentsView: React.FC<DocumentsViewProps> = ({
  templates,
  searchQuery,
  docCategories,
  docFormats,
  onSelectTemplateToGenerate,
  onSaveTemplate,
  onDeleteTemplate,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
  onAddFormat,
  onEditFormat,
  onDeleteFormat,
}) => {
  // Filter States
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [selectedFormat, setSelectedFormat] = useState<string>('Todos');

  // Modal States
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DocumentTemplate | null>(null);
  const [variablesGuideOpen, setVariablesGuideOpen] = useState(false);

  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{
    type: 'template' | 'category' | 'format';
    idOrName: string;
    title: string;
  } | null>(null);

  const handleConfirmDelete = () => {
    if (!deleteConfirmTarget) return;
    if (deleteConfirmTarget.type === 'template') {
      onDeleteTemplate(deleteConfirmTarget.idOrName);
    } else if (deleteConfirmTarget.type === 'category') {
      onDeleteCategory(deleteConfirmTarget.idOrName);
    } else if (deleteConfirmTarget.type === 'format') {
      onDeleteFormat(deleteConfirmTarget.idOrName);
    }
    setDeleteConfirmTarget(null);
  };

  const [typesFormatsModalOpen, setTypesFormatsModalOpen] = useState(false);
  const [managerTab, setManagerTab] = useState<'categories' | 'formats'>('categories');

  // New Category / Format Inputs
  const [newCatInput, setNewCatInput] = useState('');
  const [editingCatOldName, setEditingCatOldName] = useState<string | null>(null);
  const [editingCatNewName, setEditingCatNewName] = useState('');

  const [newFormatInput, setNewFormatInput] = useState('');
  const [editingFormatOldName, setEditingFormatOldName] = useState<string | null>(null);
  const [editingFormatNewName, setEditingFormatNewName] = useState('');

  // Template Form Fields
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formFormat, setFormFormat] = useState('');
  const [formBadge, setFormBadge] = useState<string>('Essencial');
  const [formIcon, setFormIcon] = useState('description');
  const [formDescription, setFormDescription] = useState('');
  const [formContentPattern, setFormContentPattern] = useState('');

  // Handlers for Template Modal
  const handleOpenCreateModal = () => {
    setEditingTemplate(null);
    setFormTitle('');
    setFormCategory(docCategories.find((c) => c !== 'Todos') || 'Previdenciário');
    setFormFormat(docFormats.find((f) => f !== 'Todos') || 'Petição Inicial');
    setFormBadge('Essencial');
    setFormIcon('description');
    setFormDescription('');
    setFormContentPattern('');
    setTemplateModalOpen(true);
  };

  const handleOpenEditModal = (template: DocumentTemplate) => {
    setEditingTemplate(template);
    setFormTitle(template.title);
    setFormCategory(template.category || 'Geral');
    setFormFormat(template.format || 'Petição Inicial');
    setFormBadge(template.badge || 'Essencial');
    setFormIcon(template.icon || 'description');
    setFormDescription(template.description || '');
    setFormContentPattern(template.contentPattern || '');
    setTemplateModalOpen(true);
  };

  const handleSaveTemplateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      alert('Por favor, informe o título da minuta.');
      return;
    }

    const savedDoc: DocumentTemplate = {
      id: editingTemplate ? editingTemplate.id : `tpl-${Date.now()}`,
      title: formTitle.trim(),
      category: formCategory.trim() || 'Geral',
      format: formFormat.trim() || 'Petição Inicial',
      badge: formBadge,
      icon: formIcon,
      description: formDescription.trim(),
      contentPattern: formContentPattern.trim(),
    };

    onSaveTemplate(savedDoc);

    // If new category or format was typed, add it automatically
    if (formCategory && !docCategories.includes(formCategory)) {
      onAddCategory(formCategory);
    }
    if (formFormat && !docFormats.includes(formFormat)) {
      onAddFormat(formFormat);
    }

    setTemplateModalOpen(false);
  };

  // Category Manager Handlers
  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatInput.trim()) return;
    onAddCategory(newCatInput.trim());
    setNewCatInput('');
  };

  const handleSaveEditCategory = (oldName: string) => {
    if (!editingCatNewName.trim()) return;
    onEditCategory(oldName, editingCatNewName.trim());
    setEditingCatOldName(null);
    setEditingCatNewName('');
  };

  // Format Manager Handlers
  const handleCreateFormat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFormatInput.trim()) return;
    onAddFormat(newFormatInput.trim());
    setNewFormatInput('');
  };

  const handleSaveEditFormat = (oldName: string) => {
    if (!editingFormatNewName.trim()) return;
    onEditFormat(oldName, editingFormatNewName.trim());
    setEditingFormatOldName(null);
    setEditingFormatNewName('');
  };

  // Filter Logic
  const filteredTemplates = templates.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.format && t.format.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory =
      selectedCategory === 'Todos' || t.category.toLowerCase() === selectedCategory.toLowerCase();

    const matchesFormat =
      selectedFormat === 'Todos' || (t.format && t.format.toLowerCase() === selectedFormat.toLowerCase());

    return matchesSearch && matchesCategory && matchesFormat;
  });

  return (
    <main className="md:ml-64 pt-16 md:pt-8 pb-12 px-4 sm:px-6 md:px-8 min-h-screen relative z-10 max-w-7xl mx-auto space-y-6">
      {/* Top Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-4 border-b border-slate-200/80 gap-4">
        <div>
          <h1 className="font-display-lg text-2xl md:text-3xl font-black text-slate-900 tracking-tight mb-1">
            Modelos & Minutas de Documentos
          </h1>
          <p className="text-slate-600 text-xs md:text-sm max-w-2xl font-medium">
            Cadastre, edite e organize os tipos e formatos de minutas do escritório para automatizar a geração de petições, procurações e contratos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setVariablesGuideOpen(true)}
            className="px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded-xl font-bold text-xs flex items-center gap-2 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">code_blocks</span>
            <span>Variáveis Disponíveis</span>
          </button>

          <button
            onClick={() => setTypesFormatsModalOpen(true)}
            className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-xl font-bold text-xs flex items-center gap-2 shadow-2xs transition-all"
          >
            <span className="material-symbols-outlined text-[18px] text-slate-600">tune</span>
            <span>Tipos e Formatos</span>
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="glass-btn-primary px-4 py-2.5 rounded-xl text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Novo Modelo de Minuta</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Category Filter Pills */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-slate-400 font-bold text-[11px] uppercase tracking-wider mr-1 shrink-0">
              Tipo:
            </span>
            {docCategories.map((cat) => {
              const isSelected = selectedCategory === cat;
              const count =
                cat === 'Todos'
                  ? templates.length
                  : templates.filter((t) => t.category.toLowerCase() === cat.toLowerCase()).length;

              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-blue-900 text-white shadow-2xs'
                      : 'bg-slate-100/80 hover:bg-slate-200/80 text-slate-700'
                  }`}
                >
                  <span>{cat}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Formats Dropdown Filter */}
          <div className="flex items-center space-x-2 shrink-0 self-end md:self-auto">
            <span className="text-slate-500 font-bold text-xs">Formato:</span>
            <select
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-900/20"
            >
              {docFormats.map((fmt) => (
                <option key={fmt} value={fmt}>
                  {fmt}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Grid of Templates */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredTemplates.map((tpl) => (
          <div
            key={tpl.id}
            className="glass-panel rounded-2xl p-5 flex flex-col h-full bg-white border border-slate-200/90 shadow-2xs hover:shadow-md transition-all duration-200 group relative"
          >
            {/* Top Card Bar */}
            <div className="flex items-start justify-between mb-3 gap-2">
              <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 text-blue-900 group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-2xl">{tpl.icon || 'description'}</span>
              </div>

              <div className="flex items-center space-x-1">
                {tpl.badge && (
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-bold text-[10px] border border-slate-200 uppercase tracking-wider">
                    {tpl.badge}
                  </span>
                )}
                {/* Actions Menu */}
                <button
                  onClick={() => handleOpenEditModal(tpl)}
                  className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
                  title="Editar Modelo"
                >
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                </button>
                <button
                  onClick={() => {
                    setDeleteConfirmTarget({
                      type: 'template',
                      idOrName: tpl.id,
                      title: tpl.title,
                    });
                  }}
                  className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                  title="Excluir Modelo"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
            </div>

            {/* Title & Badges */}
            <h3 className="font-title-md text-sm font-black text-slate-900 mb-1.5 group-hover:text-blue-900 transition-colors leading-snug">
              {tpl.title}
            </h3>

            {/* Category & Format Tags */}
            <div className="flex flex-wrap items-center gap-1.5 mb-3">
              <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-900 font-bold text-[10px] border border-blue-100">
                Tipo: {tpl.category}
              </span>
              {tpl.format && (
                <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-900 font-bold text-[10px] border border-emerald-100">
                  Formato: {tpl.format}
                </span>
              )}
            </div>

            {/* Description */}
            <p className="text-slate-600 text-xs leading-relaxed flex-1 mb-4 line-clamp-3">
              {tpl.description || 'Sem descrição cadastrada.'}
            </p>

            <div className="w-full h-px bg-slate-100 mb-4"></div>

            {/* Primary Action */}
            <button
              onClick={() => onSelectTemplateToGenerate(tpl)}
              className="w-full py-2.5 rounded-xl glass-btn-primary text-white font-bold text-xs flex items-center justify-center gap-2 shadow-2xs transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
              <span>Gerar Minuta Automática</span>
            </button>
          </div>
        ))}

        {filteredTemplates.length === 0 && (
          <div className="col-span-full bg-white rounded-2xl p-10 text-center border border-slate-200 shadow-2xs space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-2xl">description</span>
            </div>
            <p className="text-slate-700 font-bold text-sm">
              Nenhum modelo de minuta encontrado para os filtros selecionados.
            </p>
            <p className="text-slate-500 text-xs max-w-md mx-auto">
              Tente redefinir a busca ou cadastre um novo modelo de minuta no botão superior.
            </p>
            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-2 bg-blue-900 text-white rounded-xl font-bold text-xs inline-flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              <span>Cadastrar Novo Modelo</span>
            </button>
          </div>
        )}
      </div>

      {/* ------------------- MODAL: CADASTRAR / EDITAR MODELO DE MINUTA ------------------- */}
      {templateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-2xl rounded-3xl p-6 md:p-8 border border-slate-200 shadow-2xl relative max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95">
            <button
              onClick={() => setTemplateModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-2 rounded-full hover:bg-slate-100"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-900 border border-blue-100 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined">
                  {editingTemplate ? 'edit' : 'note_add'}
                </span>
              </div>
              <div>
                <h2 className="font-title-md text-lg font-black text-slate-900">
                  {editingTemplate ? 'Editar Modelo de Minuta' : 'Cadastrar Novo Modelo de Minuta'}
                </h2>
                <p className="text-xs text-slate-500">
                  Preencha as informações para salvar o modelo de minuta no acervo da banca.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveTemplateSubmit} className="space-y-4">
              {/* Título do Modelo */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Título da Minuta / Documento *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Petição Inicial de BPC/LOAS com Pedido Liminar"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                />
              </div>

              {/* Grid: Tipo / Categoria & Formato */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Tipo / Categoria */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Tipo / Categoria de Documento *
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                  >
                    {docCategories
                      .filter((c) => c !== 'Todos')
                      .map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Formato */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Formato do Documento *
                  </label>
                  <select
                    value={formFormat}
                    onChange={(e) => setFormFormat(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                  >
                    {docFormats
                      .filter((f) => f !== 'Todos')
                      .map((fmt) => (
                        <option key={fmt} value={fmt}>
                          {fmt}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Grid: Tag / Badge & Ícone */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Tag / Badge */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Classificação / Tag
                  </label>
                  <select
                    value={formBadge}
                    onChange={(e) => setFormBadge(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                  >
                    <option value="Essencial">Essencial</option>
                    <option value="Comum">Comum</option>
                    <option value="Especial">Especial</option>
                  </select>
                </div>

                {/* Ícone Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">Ícone</label>
                  <div className="flex items-center space-x-2">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-900 shrink-0">
                      <span className="material-symbols-outlined">{formIcon}</span>
                    </div>
                    <select
                      value={formIcon}
                      onChange={(e) => setFormIcon(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                    >
                      {AVAILABLE_ICONS.map((ico) => (
                        <option key={ico.id} value={ico.id}>
                          {ico.label} ({ico.id})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Descrição Resumida */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Descrição Resumida
                </label>
                <textarea
                  rows={2}
                  placeholder="Breve resumo da finalidade e casos de aplicação deste modelo..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 resize-none"
                />
              </div>

              {/* Texto Base / Estrutura da Minuta */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-800">
                    Estrutura ou Conteúdo Padrão da Minuta
                  </label>
                  <span className="text-[10px] text-blue-900 font-bold bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                    Salvo no Banco de Dados
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mb-2">
                  Qualquer alteração neste texto ficará salva permanentemente no sistema para todas as próximas gerações.
                </p>
                <textarea
                  rows={12}
                  placeholder="Insira o texto base da minuta aqui com as variáveis {CLIENTE_NOME}, {CLIENTE_CPF}, {CIDADE_DATA_EXTENSO}, etc..."
                  value={formContentPattern}
                  onChange={(e) => setFormContentPattern(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-900/20 leading-relaxed"
                />
              </div>

              {/* Form Buttons */}
              <div className="pt-3 flex gap-3 justify-end border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setTemplateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="glass-btn-primary px-5 py-2.5 rounded-xl text-white font-bold text-xs flex items-center gap-2 shadow-xs"
                >
                  <span className="material-symbols-outlined text-[18px]">save</span>
                  <span>{editingTemplate ? 'Salvar Alterações' : 'Cadastrar Modelo'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------- MODAL: GERENCIAR TIPOS E FORMATOS ------------------- */}
      {typesFormatsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-xl rounded-3xl p-6 md:p-8 border border-slate-200 shadow-2xl relative max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95">
            <button
              onClick={() => setTypesFormatsModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-2 rounded-full hover:bg-slate-100"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <div className="flex items-center space-x-3 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-900 border border-blue-100 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined">tune</span>
              </div>
              <div>
                <h2 className="font-title-md text-lg font-black text-slate-900">
                  Cadastrar & Gerenciar Tipos e Formatos
                </h2>
                <p className="text-xs text-slate-500">
                  Adicione ou edite os tipos e formatos de documentos disponíveis no sistema.
                </p>
              </div>
            </div>

            {/* Tab Selector */}
            <div className="flex border-b border-slate-200 mb-4">
              <button
                onClick={() => setManagerTab('categories')}
                className={`pb-2.5 px-4 font-bold text-xs border-b-2 transition-all ${
                  managerTab === 'categories'
                    ? 'border-blue-900 text-blue-900'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Tipos / Categorias de Documento ({docCategories.filter((c) => c !== 'Todos').length})
              </button>
              <button
                onClick={() => setManagerTab('formats')}
                className={`pb-2.5 px-4 font-bold text-xs border-b-2 transition-all ${
                  managerTab === 'formats'
                    ? 'border-blue-900 text-blue-900'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Formatos de Documento ({docFormats.filter((f) => f !== 'Todos').length})
              </button>
            </div>

            {/* TAB 1: CATEGORIES */}
            {managerTab === 'categories' && (
              <div className="space-y-4">
                {/* Form Add Category */}
                <form onSubmit={handleCreateCategory} className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Nome do novo tipo (ex: Trabalhista, Previdenciário)..."
                    value={newCatInput}
                    onChange={(e) => setNewCatInput(e.target.value)}
                    className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                  />
                  <button
                    type="submit"
                    className="glass-btn-primary px-4 py-2 rounded-xl text-white font-bold text-xs shrink-0 flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    <span>Adicionar</span>
                  </button>
                </form>

                {/* List of Categories */}
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {docCategories
                    .filter((c) => c !== 'Todos')
                    .map((cat) => {
                      const count = templates.filter(
                        (t) => t.category.toLowerCase() === cat.toLowerCase()
                      ).length;
                      const isEditing = editingCatOldName === cat;

                      return (
                        <div
                          key={cat}
                          className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80 hover:bg-slate-100/60 transition-colors text-xs"
                        >
                          {isEditing ? (
                            <div className="flex items-center gap-2 flex-1 mr-2">
                              <input
                                type="text"
                                value={editingCatNewName}
                                onChange={(e) => setEditingCatNewName(e.target.value)}
                                className="flex-1 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                              />
                              <button
                                onClick={() => handleSaveEditCategory(cat)}
                                className="px-2.5 py-1.5 bg-blue-900 text-white font-bold rounded-lg text-[11px]"
                              >
                                Salvar
                              </button>
                              <button
                                onClick={() => setEditingCatOldName(null)}
                                className="px-2 py-1.5 text-slate-500 font-bold text-[11px]"
                              >
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center space-x-2">
                                <span className="font-bold text-slate-800">{cat}</span>
                                <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-900 font-bold text-[10px] border border-blue-100">
                                  {count} modelos
                                </span>
                              </div>

                              <div className="flex items-center space-x-1">
                                <button
                                  onClick={() => {
                                    setEditingCatOldName(cat);
                                    setEditingCatNewName(cat);
                                  }}
                                  className="p-1 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-200/60"
                                  title="Editar Nome"
                                >
                                  <span className="material-symbols-outlined text-[16px]">edit</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setDeleteConfirmTarget({
                                      type: 'category',
                                      idOrName: cat,
                                      title: cat,
                                    });
                                  }}
                                  className="p-1 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                                  title="Excluir Tipo"
                                >
                                  <span className="material-symbols-outlined text-[16px]">delete</span>
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* TAB 2: FORMATS */}
            {managerTab === 'formats' && (
              <div className="space-y-4">
                {/* Form Add Format */}
                <form onSubmit={handleCreateFormat} className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Nome do novo formato (ex: Contestação, Réplica, Recurso Especial)..."
                    value={newFormatInput}
                    onChange={(e) => setNewFormatInput(e.target.value)}
                    className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                  />
                  <button
                    type="submit"
                    className="glass-btn-primary px-4 py-2 rounded-xl text-white font-bold text-xs shrink-0 flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    <span>Adicionar</span>
                  </button>
                </form>

                {/* List of Formats */}
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {docFormats
                    .filter((f) => f !== 'Todos')
                    .map((fmt) => {
                      const count = templates.filter(
                        (t) => t.format && t.format.toLowerCase() === fmt.toLowerCase()
                      ).length;
                      const isEditing = editingFormatOldName === fmt;

                      return (
                        <div
                          key={fmt}
                          className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80 hover:bg-slate-100/60 transition-colors text-xs"
                        >
                          {isEditing ? (
                            <div className="flex items-center gap-2 flex-1 mr-2">
                              <input
                                type="text"
                                value={editingFormatNewName}
                                onChange={(e) => setEditingFormatNewName(e.target.value)}
                                className="flex-1 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                              />
                              <button
                                onClick={() => handleSaveEditFormat(fmt)}
                                className="px-2.5 py-1.5 bg-blue-900 text-white font-bold rounded-lg text-[11px]"
                              >
                                Salvar
                              </button>
                              <button
                                onClick={() => setEditingFormatOldName(null)}
                                className="px-2 py-1.5 text-slate-500 font-bold text-[11px]"
                              >
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center space-x-2">
                                <span className="font-bold text-slate-800">{fmt}</span>
                                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-900 font-bold text-[10px] border border-emerald-100">
                                  {count} modelos
                                </span>
                              </div>

                              <div className="flex items-center space-x-1">
                                <button
                                  onClick={() => {
                                    setEditingFormatOldName(fmt);
                                    setEditingFormatNewName(fmt);
                                  }}
                                  className="p-1 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-200/60"
                                  title="Editar Nome"
                                >
                                  <span className="material-symbols-outlined text-[16px]">edit</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setDeleteConfirmTarget({
                                      type: 'format',
                                      idOrName: fmt,
                                      title: fmt,
                                    });
                                  }}
                                  className="p-1 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                                  title="Excluir Formato"
                                >
                                  <span className="material-symbols-outlined text-[16px]">delete</span>
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            <div className="pt-4 mt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setTypesFormatsModalOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-800 font-bold text-xs rounded-xl hover:bg-slate-200/80"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Variables Guide Modal */}
      <VariablesGuideModal
        isOpen={variablesGuideOpen}
        onClose={() => setVariablesGuideOpen(false)}
        onSelectVariable={(vKey) => {
          setFormContentPattern((prev) => prev + ` ${vKey}`);
        }}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200 shadow-2xl relative space-y-4">
            <div className="flex items-center space-x-3 text-red-600">
              <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center border border-red-100 shrink-0">
                <span className="material-symbols-outlined text-2xl">warning</span>
              </div>
              <div>
                <h3 className="font-title-md font-black text-slate-900 text-base">
                  Confirmar Exclusão
                </h3>
                <p className="text-xs text-slate-500 font-medium">Esta ação é irreversível.</p>
              </div>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed font-medium bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              Tem certeza que deseja excluir{' '}
              {deleteConfirmTarget.type === 'template' ? 'o modelo de minuta' : deleteConfirmTarget.type === 'category' ? 'o tipo' : 'o formato'}{' '}
              <strong className="text-slate-900">"{deleteConfirmTarget.title}"</strong>?
            </p>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmTarget(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
                <span>Excluir Definitivamente</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
