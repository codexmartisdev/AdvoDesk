import React, { useMemo, useState } from 'react';
import { DocumentTemplate } from '../types';
import { CLIENT_VARIABLES } from '../utils/documentReplacer';
import { BPC_DOCUMENT_VARIABLES } from '../utils/bpcDocumentVariables';
import { getBrasiliaISO } from '../utils/dateUtils';
import { VariablesGuideModal } from './VariablesGuideModal';

interface DocumentTemplatesOperationalViewProps {
  templates: DocumentTemplate[];
  searchQuery: string;
  docCategories: string[];
  docFormats: string[];
  onSelectTemplateToGenerate: (template: DocumentTemplate) => void;
  onSaveTemplate: (template: DocumentTemplate) => void;
  onArchiveTemplate: (template: DocumentTemplate) => void;
  onRestoreTemplate: (template: DocumentTemplate) => void;
  onAddCategory: (categoryName: string) => void;
  onEditCategory: (oldCategory: string, newCategory: string) => void;
  onDeleteCategory: (categoryName: string) => void;
  onAddFormat: (formatName: string) => void;
  onEditFormat: (oldFormat: string, newFormat: string) => void;
  onDeleteFormat: (formatName: string) => void;
}

type LifecycleFilter = 'active' | 'archived';

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

const normalizeText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const extractVariables = (content: string) => Array.from(new Set(content.match(/\{[A-Z0-9_]+\}/g) || []));

const KNOWN_VARIABLES = new Set([
  ...CLIENT_VARIABLES.map((item) => item.key),
  ...BPC_DOCUMENT_VARIABLES.map((item) => item.key),
]);

export const DocumentTemplatesOperationalView: React.FC<DocumentTemplatesOperationalViewProps> = ({
  templates,
  searchQuery,
  docCategories,
  docFormats,
  onSelectTemplateToGenerate,
  onSaveTemplate,
  onArchiveTemplate,
  onRestoreTemplate,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
  onAddFormat,
  onEditFormat,
  onDeleteFormat,
}) => {
  const [lifecycleFilter, setLifecycleFilter] = useState<LifecycleFilter>('active');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [selectedFormat, setSelectedFormat] = useState('Todos');
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [catalogModalOpen, setCatalogModalOpen] = useState(false);
  const [variablesGuideOpen, setVariablesGuideOpen] = useState(false);
  const [catalogTab, setCatalogTab] = useState<'categories' | 'formats'>('categories');
  const [editingTemplate, setEditingTemplate] = useState<DocumentTemplate | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formFormat, setFormFormat] = useState('');
  const [formBadge, setFormBadge] = useState('Essencial');
  const [formIcon, setFormIcon] = useState('description');
  const [formDescription, setFormDescription] = useState('');
  const [formContentPattern, setFormContentPattern] = useState('');
  const [formError, setFormError] = useState('');
  const [newCatalogValue, setNewCatalogValue] = useState('');
  const [editingCatalogValue, setEditingCatalogValue] = useState<string | null>(null);
  const [editingCatalogDraft, setEditingCatalogDraft] = useState('');

  const activeTemplates = templates.filter((item) => item.status !== 'Arquivado');
  const archivedTemplates = templates.filter((item) => item.status === 'Arquivado');

  const filteredTemplates = useMemo(() => {
    const base = lifecycleFilter === 'active' ? activeTemplates : archivedTemplates;
    const q = normalizeText(searchQuery || '');

    return base
      .filter((template) => {
        const haystack = normalizeText([
          template.title,
          template.description,
          template.category,
          template.format || '',
        ].join(' '));
        const matchesSearch = !q || haystack.includes(q);
        const matchesCategory = selectedCategory === 'Todos' || template.category === selectedCategory;
        const matchesFormat = selectedFormat === 'Todos' || template.format === selectedFormat;
        return matchesSearch && matchesCategory && matchesFormat;
      })
      .sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'));
  }, [templates, lifecycleFilter, searchQuery, selectedCategory, selectedFormat]);

  const recognizedVariables = extractVariables(formContentPattern).filter((key) => KNOWN_VARIABLES.has(key));
  const unknownVariables = extractVariables(formContentPattern).filter((key) => !KNOWN_VARIABLES.has(key));

  const openCreateModal = () => {
    setEditingTemplate(null);
    setFormTitle('');
    setFormCategory(docCategories.find((item) => item !== 'Todos') || 'Geral');
    setFormFormat(docFormats.find((item) => item !== 'Todos') || 'Outro');
    setFormBadge('Essencial');
    setFormIcon('description');
    setFormDescription('');
    setFormContentPattern('');
    setFormError('');
    setTemplateModalOpen(true);
  };

  const openEditModal = (template: DocumentTemplate) => {
    setEditingTemplate(template);
    setFormTitle(template.title);
    setFormCategory(template.category || 'Geral');
    setFormFormat(template.format || 'Outro');
    setFormBadge(template.badge || 'Essencial');
    setFormIcon(template.icon || 'description');
    setFormDescription(template.description || '');
    setFormContentPattern(template.contentPattern || '');
    setFormError('');
    setTemplateModalOpen(true);
  };

  const saveTemplate = (event: React.FormEvent) => {
    event.preventDefault();
    const title = formTitle.trim();
    const category = formCategory.trim();
    const format = formFormat.trim();
    const contentPattern = formContentPattern.trim();

    if (title.length < 3) {
      setFormError('Informe um título com pelo menos 3 caracteres.');
      return;
    }
    if (!category || !format) {
      setFormError('Informe a categoria e o formato do modelo.');
      return;
    }
    if (!contentPattern) {
      setFormError('O modelo precisa de um conteúdo base para poder gerar documentos.');
      return;
    }
    const duplicateTitle = templates.some((item) =>
      item.id !== editingTemplate?.id
      && item.status !== 'Arquivado'
      && normalizeText(item.title) === normalizeText(title)
    );
    if (duplicateTitle) {
      setFormError('Já existe um modelo ativo com este título. Edite o modelo existente ou use outro nome.');
      return;
    }
    if (unknownVariables.length > 0) {
      setFormError(`Há variáveis não reconhecidas no conteúdo: ${unknownVariables.join(', ')}. Corrija-as antes de salvar.`);
      return;
    }

    const now = getBrasiliaISO();
    const savedTemplate: DocumentTemplate = {
      id: editingTemplate?.id || `tpl-${Date.now()}`,
      title,
      category,
      format,
      badge: formBadge,
      icon: formIcon,
      description: formDescription.trim(),
      contentPattern,
      status: editingTemplate?.status || 'Ativo',
      archivedAt: editingTemplate?.archivedAt ?? null,
      createdAt: editingTemplate?.createdAt || now,
      updatedAt: now,
    };

    onSaveTemplate(savedTemplate);
    if (!docCategories.some((item) => normalizeText(item) === normalizeText(category))) onAddCategory(category);
    if (!docFormats.some((item) => normalizeText(item) === normalizeText(format))) onAddFormat(format);
    setTemplateModalOpen(false);
  };

  const catalogItems = (catalogTab === 'categories' ? docCategories : docFormats).filter((item) => item !== 'Todos');

  const addCatalogItem = (event: React.FormEvent) => {
    event.preventDefault();
    const value = newCatalogValue.trim();
    if (!value) return;
    if (catalogTab === 'categories') onAddCategory(value);
    else onAddFormat(value);
    setNewCatalogValue('');
  };

  const saveCatalogEdit = (oldValue: string) => {
    const nextValue = editingCatalogDraft.trim();
    if (!nextValue) return;
    if (catalogTab === 'categories') onEditCategory(oldValue, nextValue);
    else onEditFormat(oldValue, nextValue);
    setEditingCatalogValue(null);
    setEditingCatalogDraft('');
  };

  const deleteCatalogItem = (value: string) => {
    if (catalogTab === 'categories') onDeleteCategory(value);
    else onDeleteFormat(value);
  };

  return (
    <main className="md:ml-64 pb-12 px-4 sm:px-6 md:px-8 relative z-10 max-w-7xl mx-auto space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-900">Modelos de documentos</h2>
          <p className="text-xs text-slate-500 mt-1">Mantenha somente modelos utilizáveis na operação diária. Modelos arquivados continuam preservados para o histórico.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setVariablesGuideOpen(true)} className="px-3.5 py-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs font-bold inline-flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm">code_blocks</span>
            Variáveis
          </button>
          <button type="button" onClick={() => setCatalogModalOpen(true)} className="px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-bold inline-flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm">tune</span>
            Categorias e formatos
          </button>
          <button type="button" onClick={openCreateModal} className="px-4 py-2.5 rounded-xl bg-[#0A1F44] hover:bg-slate-900 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs">
            <span className="material-symbols-outlined text-sm">add</span>
            Novo modelo
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between">
          <div className="inline-flex p-1 rounded-xl bg-slate-100 self-start">
            <button type="button" onClick={() => setLifecycleFilter('active')} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${lifecycleFilter === 'active' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'}`}>
              Ativos ({activeTemplates.length})
            </button>
            <button type="button" onClick={() => setLifecycleFilter('archived')} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${lifecycleFilter === 'archived' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'}`}>
              Arquivados ({archivedTemplates.length})
            </button>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <select value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)} className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700">
              {docCategories.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select value={selectedFormat} onChange={(event) => setSelectedFormat(event.target.value)} className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700">
              {docFormats.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
        </div>
      </div>

      {filteredTemplates.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-xs">
          <span className="material-symbols-outlined text-3xl text-slate-300">description</span>
          <h3 className="font-bold text-slate-900 text-sm mt-2">Nenhum modelo encontrado</h3>
          <p className="text-xs text-slate-500 mt-1">Ajuste os filtros ou cadastre um novo modelo.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => {
            const templateVariables = extractVariables(template.contentPattern || '');
            return (
              <article key={template.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-900 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined">{template.icon || 'description'}</span>
                  </div>
                  <span className={`px-2 py-1 rounded-lg border text-[10px] font-bold ${template.status === 'Arquivado' ? 'bg-slate-100 border-slate-200 text-slate-500' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                    {template.status === 'Arquivado' ? 'Arquivado' : 'Ativo'}
                  </span>
                </div>
                <div className="min-w-0">
                  <h3 className="font-black text-slate-900 text-sm leading-snug">{template.title}</h3>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-900 text-[10px] font-bold">{template.category}</span>
                    {template.format && <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold">{template.format}</span>}
                    <span className="px-2 py-0.5 rounded-md bg-violet-50 text-violet-800 text-[10px] font-bold">{templateVariables.length} variáveis</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-3 line-clamp-3">{template.description || 'Sem descrição.'}</p>
                </div>
                <div className="mt-auto pt-3 border-t border-slate-100 flex flex-wrap gap-2">
                  {template.status !== 'Arquivado' ? (
                    <>
                      <button type="button" onClick={() => onSelectTemplateToGenerate(template)} className="flex-1 px-3 py-2 rounded-xl bg-[#0A1F44] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5">
                        <span className="material-symbols-outlined text-sm">description</span>
                        Gerar
                      </button>
                      <button type="button" onClick={() => openEditModal(template)} className="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold">Editar</button>
                      <button type="button" onClick={() => onArchiveTemplate(template)} className="px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">Arquivar</button>
                    </>
                  ) : (
                    <button type="button" onClick={() => onRestoreTemplate(template)} className="w-full px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold inline-flex items-center justify-center gap-1.5">
                      <span className="material-symbols-outlined text-sm">unarchive</span>
                      Restaurar modelo
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {templateModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-3xl rounded-3xl border border-slate-200 shadow-2xl max-h-[92vh] overflow-y-auto p-6">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <h3 className="text-lg font-black text-slate-900">{editingTemplate ? 'Editar modelo' : 'Novo modelo'}</h3>
                <p className="text-xs text-slate-500 mt-1">O modelo deve estar pronto para gerar um documento útil sem etapas intermediárias desnecessárias.</p>
              </div>
              <button type="button" onClick={() => setTemplateModalOpen(false)} className="p-2 rounded-full hover:bg-slate-100 text-slate-500"><span className="material-symbols-outlined">close</span></button>
            </div>

            <form onSubmit={saveTemplate} className="space-y-4">
              {formError && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-800">{formError}</div>}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Título *</label>
                <input value={formTitle} onChange={(event) => setFormTitle(event.target.value)} className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold" placeholder="Ex: Procuração previdenciária" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Categoria *</label>
                  <select value={formCategory} onChange={(event) => setFormCategory(event.target.value)} className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold">
                    {docCategories.filter((item) => item !== 'Todos').map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Formato *</label>
                  <select value={formFormat} onChange={(event) => setFormFormat(event.target.value)} className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold">
                    {docFormats.filter((item) => item !== 'Todos').map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Classificação</label>
                  <select value={formBadge} onChange={(event) => setFormBadge(event.target.value)} className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold">
                    <option value="Essencial">Essencial</option><option value="Comum">Comum</option><option value="Especial">Especial</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ícone</label>
                  <select value={formIcon} onChange={(event) => setFormIcon(event.target.value)} className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold">
                    {AVAILABLE_ICONS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Descrição</label>
                <textarea value={formDescription} onChange={(event) => setFormDescription(event.target.value)} rows={2} className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs resize-none" />
              </div>
              <div>
                <div className="flex items-center justify-between gap-3 mb-1">
                  <label className="block text-xs font-bold text-slate-700">Conteúdo base *</label>
                  <button type="button" onClick={() => setVariablesGuideOpen(true)} className="text-[11px] font-bold text-blue-900">Consultar variáveis</button>
                </div>
                <textarea value={formContentPattern} onChange={(event) => { setFormContentPattern(event.target.value); setFormError(''); }} rows={16} className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs leading-relaxed" placeholder="Use variáveis como {CLIENTE_NOME}, {CLIENTE_CPF}, {BPC_DER}..." />
                <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-semibold">
                  <span className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">{recognizedVariables.length} variáveis reconhecidas</span>
                  {unknownVariables.length > 0 && <span className="px-2 py-1 rounded-lg bg-red-50 text-red-700 border border-red-200">Não reconhecidas: {unknownVariables.join(', ')}</span>}
                </div>
              </div>
              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button type="button" onClick={() => setTemplateModalOpen(false)} className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold">Cancelar</button>
                <button type="submit" className="px-5 py-2.5 rounded-xl bg-[#0A1F44] text-white text-xs font-bold">Salvar modelo</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {catalogModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-xl rounded-3xl border border-slate-200 shadow-2xl p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900">Categorias e formatos</h3>
                <p className="text-xs text-slate-500 mt-1">Essas listas são compartilhadas pelo escritório e permanecem após recarregar o sistema.</p>
              </div>
              <button type="button" onClick={() => setCatalogModalOpen(false)} className="p-2 rounded-full hover:bg-slate-100 text-slate-500"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="inline-flex p-1 rounded-xl bg-slate-100 mb-4">
              <button type="button" onClick={() => setCatalogTab('categories')} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${catalogTab === 'categories' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-600'}`}>Categorias</button>
              <button type="button" onClick={() => setCatalogTab('formats')} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${catalogTab === 'formats' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-600'}`}>Formatos</button>
            </div>
            <form onSubmit={addCatalogItem} className="flex gap-2 mb-4">
              <input value={newCatalogValue} onChange={(event) => setNewCatalogValue(event.target.value)} className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs" placeholder={catalogTab === 'categories' ? 'Nova categoria' : 'Novo formato'} />
              <button type="submit" className="px-4 py-2.5 rounded-xl bg-[#0A1F44] text-white text-xs font-bold">Adicionar</button>
            </form>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {catalogItems.map((item) => (
                <div key={item} className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50">
                  {editingCatalogValue === item ? (
                    <input value={editingCatalogDraft} onChange={(event) => setEditingCatalogDraft(event.target.value)} className="flex-1 px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs" autoFocus />
                  ) : (
                    <span className="flex-1 text-xs font-semibold text-slate-800">{item}</span>
                  )}
                  {editingCatalogValue === item ? (
                    <button type="button" onClick={() => saveCatalogEdit(item)} className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-[11px] font-bold">Salvar</button>
                  ) : (
                    <button type="button" onClick={() => { setEditingCatalogValue(item); setEditingCatalogDraft(item); }} className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 text-[11px] font-bold">Editar</button>
                  )}
                  <button type="button" onClick={() => deleteCatalogItem(item)} className="px-2.5 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-[11px] font-bold">Remover</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <VariablesGuideModal isOpen={variablesGuideOpen} onClose={() => setVariablesGuideOpen(false)} />
    </main>
  );
};
