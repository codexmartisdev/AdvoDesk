import React, { useState, useEffect } from 'react';
import { Client, FamilyMember, ClientDocumentChecklist } from '../types';

interface ClientDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client | null;
  onSaveClient: (updatedClient: Client) => void;
  onDeleteClient?: (clientId: string) => void;
  onSelectClientForDoc?: (clientName: string, clientCpf: string) => void;
  clientCategories?: string[];
}

export const ClientDetailModal: React.FC<ClientDetailModalProps> = ({
  isOpen,
  onClose,
  client,
  onSaveClient,
  onDeleteClient,
  onSelectClientForDoc,
  clientCategories = ['BPC Loas', 'Auxílio Doença', 'Aposentadoria', 'Trabalhista', 'Cível'],
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<'pessoal' | 'familia' | 'contato_endereco' | 'previdência' | 'docs_banco'>('pessoal');

  // Form State
  const [formData, setFormData] = useState<Partial<Client>>({});
  const [family, setFamily] = useState<FamilyMember[]>([]);
  const [docs, setDocs] = useState<ClientDocumentChecklist>({
    rgCpf: true,
    comprovanteResidencia: true,
    carteiraTrabalhoCnis: false,
    comprovantesRendaFamilia: false,
    laudosMedicos: false,
    comprovacaoRural: false,
  });

  // Family Member Temp Input
  const [newFmName, setNewFmName] = useState('');
  const [newFmCpf, setNewFmCpf] = useState('');
  const [newFmBirth, setNewFmBirth] = useState('');
  const [newFmKinship, setNewFmKinship] = useState('Filho(a)');
  const [newFmIncome, setNewFmIncome] = useState('R$ 0,00');

  useEffect(() => {
    if (client) {
      setFormData({ ...client });
      setFamily(client.familyMembers || []);
      setDocs(
        client.documentChecklist || {
          rgCpf: true,
          comprovanteResidencia: true,
          carteiraTrabalhoCnis: false,
          comprovantesRendaFamilia: false,
          laudosMedicos: false,
          comprovacaoRural: false,
        }
      );
      setIsEditing(false);
      setShowDeleteConfirm(false);
    }
  }, [client]);

  if (!isOpen || !client) return null;

  const handleChange = (field: keyof Client, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleToggleDoc = (key: keyof ClientDocumentChecklist) => {
    setDocs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleAddFamilyMember = () => {
    if (!newFmName.trim()) return;
    const newMember: FamilyMember = {
      id: `fm-${Date.now()}`,
      name: newFmName.trim(),
      cpf: newFmCpf.trim(),
      birthDate: newFmBirth,
      kinship: newFmKinship,
      income: newFmIncome || 'R$ 0,00',
    };
    setFamily([...family, newMember]);
    setNewFmName('');
    setNewFmCpf('');
    setNewFmBirth('');
    setNewFmIncome('R$ 0,00');
  };

  const handleRemoveFamilyMember = (id: string) => {
    setFamily(family.filter((f) => f.id !== id));
  };

  const handleSave = () => {
    const updated: Client = {
      ...(formData as Client),
      familyMembers: family,
      documentChecklist: docs,
      updatedAt: `Atualizado ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
    };
    onSaveClient(updated);
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (client && onDeleteClient) {
      onDeleteClient(client.id);
      setShowDeleteConfirm(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-4xl rounded-3xl p-5 md:p-8 border border-slate-200 shadow-2xl relative max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-2 rounded-full hover:bg-slate-100 transition-colors"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        {/* Modal Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-center space-x-4">
            {formData.avatarUrl ? (
              <img
                src={formData.avatarUrl}
                alt={formData.name}
                className="w-16 h-16 rounded-full object-cover border-2 border-slate-200 shrink-0 shadow-xs"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-blue-900 text-white flex items-center justify-center text-xl font-black shrink-0 shadow-xs">
                {(formData.name || 'CL').substring(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-display-lg text-xl md:text-2xl font-extrabold text-slate-900">
                  {formData.name || 'Cliente'}
                </h2>
                {formData.socialName && (
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium">
                    ({formData.socialName})
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Código: <span className="font-mono font-bold text-slate-700">{formData.code}</span> • CPF:{' '}
                <span className="font-mono font-bold text-slate-700">{formData.cpf}</span>
              </p>
              
              {isEditing ? (
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <label className="text-[11px] font-bold text-slate-500">Categoria:</label>
                  <select
                    value={formData.typePill || 'BPC Loas'}
                    onChange={(e) => handleChange('typePill', e.target.value)}
                    className="bg-blue-50 text-blue-900 border border-blue-200 rounded-lg px-2.5 py-1 text-xs font-bold"
                  >
                    {clientCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>

                  <label className="text-[11px] font-bold text-slate-500 ml-1">Status:</label>
                  <select
                    value={formData.status || 'Ativo'}
                    onChange={(e) => handleChange('status', e.target.value)}
                    className="bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-lg px-2.5 py-1 text-xs font-bold"
                  >
                    <option value="Ativo">Ativo</option>
                    <option value="Pendente">Pendente</option>
                    <option value="Rascunho">Rascunho</option>
                    <option value="Arquivado">Arquivado</option>
                  </select>
                </div>
              ) : (
                <div className="flex items-center space-x-2 mt-2">
                  <span className="px-3 py-0.5 rounded-full bg-blue-50 text-blue-900 text-xs font-bold border border-blue-200">
                    {formData.typePill || 'BPC Loas'}
                  </span>
                  <span className="px-3 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
                    {formData.status || 'Ativo'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Action Header Controls */}
          <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
            {onSelectClientForDoc && !isEditing && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onSelectClientForDoc(formData.name || '', formData.cpf || '');
                }}
                className="px-3 py-2 rounded-xl bg-blue-50 text-blue-900 border border-blue-200 hover:bg-blue-100 text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">description</span>
                <span className="hidden md:inline">Gerar Procuração</span>
              </button>
            )}

            {!isEditing ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="px-3.5 py-2 rounded-xl bg-blue-900 text-white hover:bg-blue-800 text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">edit</span>
                  <span>Editar Ficha</span>
                </button>

                {onDeleteClient && (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-3 py-2 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 text-xs font-bold flex items-center gap-1 transition-colors"
                    title="Excluir Cliente"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                    <span className="hidden sm:inline">Excluir</span>
                  </button>
                )}
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-4 py-2 rounded-xl bg-emerald-700 text-white hover:bg-emerald-800 text-xs font-bold flex items-center gap-1.5 shadow-xs"
                >
                  <span className="material-symbols-outlined text-sm">save</span>
                  <span>Salvar Alterações</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Section Navigation Tabs */}
        <div className="flex border-b border-slate-200 mt-4 overflow-x-auto text-xs font-bold">
          <button
            onClick={() => setActiveTab('pessoal')}
            className={`px-4 py-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'pessoal'
                ? 'border-blue-900 text-blue-900 bg-blue-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span className="material-symbols-outlined text-base">badge</span>
            <span>1. Identificação Pessoal</span>
          </button>
          <button
            onClick={() => setActiveTab('familia')}
            className={`px-4 py-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'familia'
                ? 'border-blue-900 text-blue-900 bg-blue-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span className="material-symbols-outlined text-base">family_restroom</span>
            <span>2. Estado Civil & Família</span>
          </button>
          <button
            onClick={() => setActiveTab('contato_endereco')}
            className={`px-4 py-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'contato_endereco'
                ? 'border-blue-900 text-blue-900 bg-blue-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span className="material-symbols-outlined text-base">contact_mail</span>
            <span>3 & 4. Contato e Endereço</span>
          </button>
          <button
            onClick={() => setActiveTab('previdência')}
            className={`px-4 py-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'previdência'
                ? 'border-blue-900 text-blue-900 bg-blue-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span className="material-symbols-outlined text-base">work_history</span>
            <span>5 & 6. Renda & Previdenciário</span>
          </button>
          <button
            onClick={() => setActiveTab('docs_banco')}
            className={`px-4 py-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'docs_banco'
                ? 'border-blue-900 text-blue-900 bg-blue-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span className="material-symbols-outlined text-base">account_balance</span>
            <span>7 & 8. Docs & Dados Bancários</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="py-5 text-xs space-y-4">
          {/* TAB 1: IDENTIFICAÇÃO PESSOAL */}
          {activeTab === 'pessoal' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-blue-900">person</span>
                  <span>Identificação Pessoal</span>
                </h3>
                {isEditing && <span className="text-[11px] text-blue-800 font-semibold">Modo Edição Ativo</span>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nome Completo</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.name || ''}
                      onChange={(e) => handleChange('name', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-semibold"
                    />
                  ) : (
                    <p className="bg-slate-50 p-2.5 rounded-xl text-slate-800 font-semibold border border-slate-200">
                      {formData.name || '—'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nome Social (se houver)</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.socialName || ''}
                      onChange={(e) => handleChange('socialName', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium"
                    />
                  ) : (
                    <p className="bg-slate-50 p-2.5 rounded-xl text-slate-800 font-medium border border-slate-200">
                      {formData.socialName || 'Não informado'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">CPF</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.cpf || ''}
                      onChange={(e) => handleChange('cpf', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold"
                    />
                  ) : (
                    <p className="bg-slate-50 p-2.5 rounded-xl text-slate-800 font-mono font-bold border border-slate-200">
                      {formData.cpf || '—'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">RG (Número)</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.rgNumber || ''}
                      onChange={(e) => handleChange('rgNumber', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium"
                    />
                  ) : (
                    <p className="bg-slate-50 p-2.5 rounded-xl text-slate-800 font-medium border border-slate-200">
                      {formData.rgNumber || '—'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Órgão Emissor / UF / Expedição</label>
                  {isEditing ? (
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        placeholder="SSP"
                        value={formData.rgIssuer || ''}
                        onChange={(e) => handleChange('rgIssuer', e.target.value)}
                        className="w-1/3 bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 text-slate-900"
                      />
                      <input
                        type="text"
                        placeholder="PI"
                        value={formData.rgUf || ''}
                        onChange={(e) => handleChange('rgUf', e.target.value)}
                        className="w-1/4 bg-slate-50 border border-slate-300 rounded-xl px-2 py-2 text-slate-900 text-center"
                      />
                      <input
                        type="date"
                        value={formData.rgIssueDate || ''}
                        onChange={(e) => handleChange('rgIssueDate', e.target.value)}
                        className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-2 py-2 text-slate-900"
                      />
                    </div>
                  ) : (
                    <p className="bg-slate-50 p-2.5 rounded-xl text-slate-800 font-medium border border-slate-200">
                      {formData.rgIssuer || '—'} / {formData.rgUf || '—'}{' '}
                      {formData.rgIssueDate ? `(${formData.rgIssueDate})` : ''}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Data de Nascimento</label>
                  {isEditing ? (
                    <input
                      type="date"
                      value={formData.birthDate || ''}
                      onChange={(e) => handleChange('birthDate', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium"
                    />
                  ) : (
                    <p className="bg-slate-50 p-2.5 rounded-xl text-slate-800 font-medium border border-slate-200">
                      {formData.birthDate || '—'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nacionalidade</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.nationality || 'Brasileiro(a)'}
                      onChange={(e) => handleChange('nationality', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium"
                    />
                  ) : (
                    <p className="bg-slate-50 p-2.5 rounded-xl text-slate-800 font-medium border border-slate-200">
                      {formData.nationality || 'Brasileiro(a)'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Naturalidade (Cidade/UF)</label>
                  {isEditing ? (
                    <input
                      type="text"
                      placeholder="Ex: Parnaíba/PI"
                      value={formData.birthplace || ''}
                      onChange={(e) => handleChange('birthplace', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium"
                    />
                  ) : (
                    <p className="bg-slate-50 p-2.5 rounded-xl text-slate-800 font-medium border border-slate-200">
                      {formData.birthplace || '—'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Sexo / Gênero (INSS)</label>
                  {isEditing ? (
                    <select
                      value={formData.gender || 'Feminino'}
                      onChange={(e) => handleChange('gender', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium"
                    >
                      <option value="Feminino">Feminino</option>
                      <option value="Masculino">Masculino</option>
                      <option value="Outro">Outro</option>
                    </select>
                  ) : (
                    <p className="bg-slate-50 p-2.5 rounded-xl text-slate-800 font-medium border border-slate-200">
                      {formData.gender || '—'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nome da Mãe (Exigido pelo INSS)</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.motherName || ''}
                      onChange={(e) => handleChange('motherName', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium"
                    />
                  ) : (
                    <p className="bg-slate-50 p-2.5 rounded-xl text-slate-800 font-medium border border-slate-200">
                      {formData.motherName || '—'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nome do Pai (Opcional)</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.fatherName || ''}
                      onChange={(e) => handleChange('fatherName', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium"
                    />
                  ) : (
                    <p className="bg-slate-50 p-2.5 rounded-xl text-slate-800 font-medium border border-slate-200">
                      {formData.fatherName || 'Não declarado'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ESTADO CIVIL E FAMÍLIA */}
          {activeTab === 'familia' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-blue-900">family_restroom</span>
                  <span>Estado Civil & Composição Familiar (Relevante BPC Loas / Pensão)</span>
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Estado Civil</label>
                  {isEditing ? (
                    <select
                      value={formData.maritalStatus || 'Solteiro(a)'}
                      onChange={(e) => handleChange('maritalStatus', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium"
                    >
                      <option value="Solteiro(a)">Solteiro(a)</option>
                      <option value="Casado(a)">Casado(a)</option>
                      <option value="União Estável">União Estável</option>
                      <option value="Divorciado(a)">Divorciado(a)</option>
                      <option value="Viúvo(a)">Viúvo(a)</option>
                    </select>
                  ) : (
                    <p className="bg-slate-50 p-2.5 rounded-xl text-slate-800 font-medium border border-slate-200">
                      {formData.maritalStatus || 'Solteiro(a)'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Regime de Bens (se casado)</label>
                  {isEditing ? (
                    <input
                      type="text"
                      placeholder="Ex: Comunhão Parcial"
                      value={formData.propertyRegime || ''}
                      onChange={(e) => handleChange('propertyRegime', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium"
                    />
                  ) : (
                    <p className="bg-slate-50 p-2.5 rounded-xl text-slate-800 font-medium border border-slate-200">
                      {formData.propertyRegime || 'Nenhum / Não aplicável'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nome do Cônjuge / Companheiro(a)</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.spouseName || ''}
                      onChange={(e) => handleChange('spouseName', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium"
                    />
                  ) : (
                    <p className="bg-slate-50 p-2.5 rounded-xl text-slate-800 font-medium border border-slate-200">
                      {formData.spouseName || 'Não consta'}
                    </p>
                  )}
                </div>
              </div>

              {/* Group Family Table for BPC Loas */}
              <div className="pt-3 border-t border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 text-xs">
                    Composição Familiar & Dependentes (Renda Per Capita BPC)
                  </h4>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {family.length} membro(s) cadastrado(s)
                  </span>
                </div>

                {isEditing && (
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-5 gap-2">
                    <input
                      type="text"
                      placeholder="Nome do dependente"
                      value={newFmName}
                      onChange={(e) => setNewFmName(e.target.value)}
                      className="sm:col-span-2 bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-slate-900"
                    />
                    <input
                      type="text"
                      placeholder="CPF"
                      value={newFmCpf}
                      onChange={(e) => setNewFmCpf(e.target.value)}
                      className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-slate-900"
                    />
                    <select
                      value={newFmKinship}
                      onChange={(e) => setNewFmKinship(e.target.value)}
                      className="bg-white border border-slate-300 rounded-xl px-2 py-1.5 text-slate-900"
                    >
                      <option value="Filho(a)">Filho(a)</option>
                      <option value="Cônjuge">Cônjuge</option>
                      <option value="Pai/Mãe">Pai/Mãe</option>
                      <option value="Irmão(ã)">Irmão(ã)</option>
                      <option value="Outro">Outro</option>
                    </select>
                    <button
                      type="button"
                      onClick={handleAddFamilyMember}
                      className="bg-blue-900 text-white font-bold rounded-xl py-1.5 px-3 hover:bg-blue-800 transition-colors flex items-center justify-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">add</span>
                      <span>Incluir</span>
                    </button>
                  </div>
                )}

                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                        <th className="p-2.5">Nome</th>
                        <th className="p-2.5">CPF</th>
                        <th className="p-2.5">Parentesco</th>
                        <th className="p-2.5">Renda Mensal</th>
                        {isEditing && <th className="p-2.5 text-right">Ação</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                      {family.length > 0 ? (
                        family.map((fm) => (
                          <tr key={fm.id} className="hover:bg-slate-50">
                            <td className="p-2.5 font-bold">{fm.name}</td>
                            <td className="p-2.5 font-mono text-slate-600">{fm.cpf || '—'}</td>
                            <td className="p-2.5">{fm.kinship || '—'}</td>
                            <td className="p-2.5 font-semibold text-emerald-800">{fm.income || 'R$ 0,00'}</td>
                            {isEditing && (
                              <td className="p-2.5 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveFamilyMember(fm.id)}
                                  className="text-red-600 hover:text-red-800 font-bold"
                                >
                                  Remover
                                </button>
                              </td>
                            )}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={isEditing ? 5 : 4} className="p-4 text-center text-slate-400">
                            Nenhum dependente/membro cadastrado nesta ficha.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3 & 4: CONTATO E ENDEREÇO */}
          {activeTab === 'contato_endereco' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-blue-900">contact_mail</span>
                  <span>Canais de Contato & Endereço Residencial</span>
                </h3>
              </div>

              {/* Contatos */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Telefone Principal (WhatsApp)</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.phone || ''}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold"
                    />
                  ) : (
                    <p className="bg-slate-50 p-2.5 rounded-xl text-slate-800 font-bold border border-slate-200">
                      {formData.phone || '—'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Telefone Secundário</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.phoneSecondary || ''}
                      onChange={(e) => handleChange('phoneSecondary', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium"
                    />
                  ) : (
                    <p className="bg-slate-50 p-2.5 rounded-xl text-slate-800 font-medium border border-slate-200">
                      {formData.phoneSecondary || 'Não informado'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">E-mail</label>
                  {isEditing ? (
                    <input
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => handleChange('email', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium"
                    />
                  ) : (
                    <p className="bg-slate-50 p-2.5 rounded-xl text-slate-800 font-medium border border-slate-200">
                      {formData.email || '—'}
                    </p>
                  )}
                </div>
              </div>

              {/* Endereço completo */}
              <div className="pt-2 space-y-3 border-t border-slate-200">
                <h4 className="font-bold text-slate-800 text-xs">Endereço Residencial & Zona de Atividade</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">Logradouro / Av. / Rua</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.addressStreet || ''}
                        onChange={(e) => handleChange('addressStreet', e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium"
                      />
                    ) : (
                      <p className="bg-slate-50 p-2.5 rounded-xl text-slate-800 font-medium border border-slate-200">
                        {formData.addressStreet || '—'}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Número</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.addressNumber || ''}
                        onChange={(e) => handleChange('addressNumber', e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium"
                      />
                    ) : (
                      <p className="bg-slate-50 p-2.5 rounded-xl text-slate-800 font-medium border border-slate-200">
                        {formData.addressNumber || 'S/N'}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Complemento</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.addressComplement || ''}
                        onChange={(e) => handleChange('addressComplement', e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium"
                      />
                    ) : (
                      <p className="bg-slate-50 p-2.5 rounded-xl text-slate-800 font-medium border border-slate-200">
                        {formData.addressComplement || '—'}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Bairro</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.addressNeighborhood || ''}
                        onChange={(e) => handleChange('addressNeighborhood', e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium"
                      />
                    ) : (
                      <p className="bg-slate-50 p-2.5 rounded-xl text-slate-800 font-medium border border-slate-200">
                        {formData.addressNeighborhood || '—'}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Cidade / UF</label>
                    {isEditing ? (
                      <input
                        type="text"
                        placeholder="Parnaíba/PI"
                        value={formData.addressCityUf || ''}
                        onChange={(e) => handleChange('addressCityUf', e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium"
                      />
                    ) : (
                      <p className="bg-slate-50 p-2.5 rounded-xl text-slate-800 font-medium border border-slate-200">
                        {formData.addressCityUf || '—'}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">CEP</label>
                    {isEditing ? (
                      <input
                        type="text"
                        placeholder="64200-000"
                        value={formData.addressZip || ''}
                        onChange={(e) => handleChange('addressZip', e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium font-mono"
                      />
                    ) : (
                      <p className="bg-slate-50 p-2.5 rounded-xl text-slate-800 font-medium border border-slate-200 font-mono">
                        {formData.addressZip || '—'}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Zona (Rural / Urbana)</label>
                    {isEditing ? (
                      <select
                        value={formData.addressZone || 'Urbana'}
                        onChange={(e) => handleChange('addressZone', e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold"
                      >
                        <option value="Urbana">Urbana</option>
                        <option value="Rural">Rural (Segurado Especial)</option>
                      </select>
                    ) : (
                      <p className="bg-slate-50 p-2.5 rounded-xl text-slate-800 font-bold border border-slate-200">
                        {formData.addressZone || 'Urbana'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5 & 6: PROFISSÃO & PREVIDENCIÁRIO */}
          {activeTab === 'previdência' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-blue-900">work_history</span>
                  <span>Profissão, Vínculo Empregatício & Dados Previdenciários INSS</span>
                </h3>
              </div>

              {/* Profissão & Vínculo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Profissão / Ocupação Atual</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.occupation || ''}
                      onChange={(e) => handleChange('occupation', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium"
                    />
                  ) : (
                    <p className="bg-slate-50 p-2.5 rounded-xl text-slate-800 font-medium border border-slate-200">
                      {formData.occupation || '—'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Renda Mensal Declarada</label>
                  {isEditing ? (
                    <input
                      type="text"
                      placeholder="R$ 1.412,00"
                      value={formData.monthlyIncome || ''}
                      onChange={(e) => handleChange('monthlyIncome', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-semibold text-emerald-800"
                    />
                  ) : (
                    <p className="bg-slate-50 p-2.5 rounded-xl text-emerald-800 font-bold border border-slate-200">
                      {formData.monthlyIncome || 'R$ 0,00'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Vínculo Empregatício Atual</label>
                  {isEditing ? (
                    <select
                      value={formData.employmentStatus || 'Desempregado'}
                      onChange={(e) => handleChange('employmentStatus', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium"
                    >
                      <option value="CLT">CLT / Empregado Formal</option>
                      <option value="Autônomo">Autônomo / Informal</option>
                      <option value="Rural">Trabalhador Rural / Lavrador</option>
                      <option value="Desempregado">Desempregado(a)</option>
                      <option value="Servidor Público">Servidor Público</option>
                      <option value="Outro">Outro</option>
                    </select>
                  ) : (
                    <p className="bg-slate-50 p-2.5 rounded-xl text-slate-800 font-medium border border-slate-200">
                      {formData.employmentStatus || '—'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Regime Contribuição INSS</label>
                  {isEditing ? (
                    <select
                      value={formData.inssContributionRegime || 'Empregado'}
                      onChange={(e) => handleChange('inssContributionRegime', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium"
                    >
                      <option value="Empregado">Empregado (CLT)</option>
                      <option value="Contribuinte Individual">Contribuinte Individual (Carnê/MEI)</option>
                      <option value="Segurado Especial">Segurado Especial (Rural)</option>
                      <option value="Facultativo">Facultativo</option>
                      <option value="Nenhum">Nenhum / Sem contribuição</option>
                    </select>
                  ) : (
                    <p className="bg-slate-50 p-2.5 rounded-xl text-slate-800 font-medium border border-slate-200">
                      {formData.inssContributionRegime || '—'}
                    </p>
                  )}
                </div>
              </div>

              {/* Dados previdenciários específicos */}
              <div className="pt-2 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">NIT / PIS / PASEP</label>
                  {isEditing ? (
                    <input
                      type="text"
                      placeholder="000.00000.00-0"
                      value={formData.nitPisPasep || ''}
                      onChange={(e) => handleChange('nitPisPasep', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold"
                    />
                  ) : (
                    <p className="bg-slate-50 p-2.5 rounded-xl text-slate-800 font-mono font-bold border border-slate-200">
                      {formData.nitPisPasep || 'Não cadastrado'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Número do Benefício (NB - se existir)</label>
                  {isEditing ? (
                    <input
                      type="text"
                      placeholder="87/000.000.000-0"
                      value={formData.benefitNumber || ''}
                      onChange={(e) => handleChange('benefitNumber', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold text-blue-900"
                    />
                  ) : (
                    <p className="bg-slate-50 p-2.5 rounded-xl text-blue-900 font-mono font-bold border border-slate-200">
                      {formData.benefitNumber || 'Sem NB vinculado'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 7 & 8: DOCS CHECKLIST & BANCO */}
          {activeTab === 'docs_banco' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-blue-900">account_balance</span>
                  <span>Checklist de Documentos Anexos & Dados Bancários</span>
                </h3>
              </div>

              {/* Checklist de documentos */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 text-xs">
                  7. Documentos Obrigatórios Entregues (Checklist)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {[
                    { key: 'rgCpf', label: 'RG e CPF (frente/verso)' },
                    { key: 'comprovanteResidencia', label: 'Comprovante de residência atualizado' },
                    { key: 'carteiraTrabalhoCnis', label: 'Carteira de Trabalho / Extrato CNIS' },
                    { key: 'comprovantesRendaFamilia', label: 'Comprovantes de renda familiar (BPC)' },
                    { key: 'laudosMedicos', label: 'Laudos médicos / Atestados / Exames' },
                    { key: 'comprovacaoRural', label: 'Comprovação de Atividade Rural' },
                  ].map((item) => {
                    const docKey = item.key as keyof ClientDocumentChecklist;
                    const isChecked = docs[docKey];
                    return (
                      <div
                        key={item.key}
                        onClick={() => handleToggleDoc(docKey)}
                        className={`p-3 rounded-2xl border flex items-center space-x-3 cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-semibold'
                            : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'
                        }`}
                      >
                        <span className={`material-symbols-outlined text-lg ${isChecked ? 'text-emerald-700' : 'text-slate-400'}`}>
                          {isChecked ? 'check_box' : 'checkbox_outline_blank'}
                        </span>
                        <span className="text-xs">{item.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Dados bancários */}
              <div className="pt-3 border-t border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-800 text-xs">
                  8. Dados Bancários (Para Pagamentos / Levantamento de Alvarás & RPVs)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Instituição Bancária</label>
                    {isEditing ? (
                      <input
                        type="text"
                        placeholder="Ex: Caixa, Banco do Brasil"
                        value={formData.bankName || ''}
                        onChange={(e) => handleChange('bankName', e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium"
                      />
                    ) : (
                      <p className="bg-slate-50 p-2.5 rounded-xl text-slate-800 font-medium border border-slate-200">
                        {formData.bankName || '—'}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Agência</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.bankAgency || ''}
                        onChange={(e) => handleChange('bankAgency', e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium font-mono"
                      />
                    ) : (
                      <p className="bg-slate-50 p-2.5 rounded-xl text-slate-800 font-medium border border-slate-200 font-mono">
                        {formData.bankAgency || '—'}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Conta (C/C ou Poupança)</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.bankAccount || ''}
                        onChange={(e) => handleChange('bankAccount', e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium font-mono"
                      />
                    ) : (
                      <p className="bg-slate-50 p-2.5 rounded-xl text-slate-800 font-medium border border-slate-200 font-mono">
                        {formData.bankAccount || '—'}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Chave PIX</label>
                    {isEditing ? (
                      <input
                        type="text"
                        placeholder="CPF/Celular/Email"
                        value={formData.pixKey || ''}
                        onChange={(e) => handleChange('pixKey', e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-semibold"
                      />
                    ) : (
                      <p className="bg-slate-50 p-2.5 rounded-xl text-slate-800 font-semibold border border-slate-200">
                        {formData.pixKey || 'Não cadastrada'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs">
          <div className="flex items-center gap-2">
            {onDeleteClient && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-3.5 py-2.5 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 font-bold flex items-center gap-1.5 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">delete</span>
                <span>Excluir Cliente</span>
              </button>
            )}
            <p className="text-slate-500 font-medium hidden md:block">
              Ficha cadastral atualizada conforme padrões previdenciários e cíveis.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  <span>Salvar Alterações</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold flex items-center gap-1.5 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">edit</span>
                  <span>Editar Ficha</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors"
                >
                  Fechar
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Delete Client Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-red-600">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-xl">warning</span>
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900">Excluir Cliente</h3>
                <p className="text-xs text-slate-500">Ação irreversível</p>
              </div>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              Tem certeza de que deseja excluir o cliente <strong className="text-slate-900">{client.name}</strong> (CPF: {client.cpf})? Todos os dados cadastrais desta ficha serão permanentemente removidos.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition-colors"
              >
                <span className="material-symbols-outlined text-sm">delete</span>
                <span>Confirmar Exclusão</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
