import React, { useEffect, useState } from 'react';
import { Client, ClientDocumentChecklist, FamilyMember } from '../types';
import {
  formatCep,
  formatCpf,
  formatPhone,
  isValidCep,
  isValidCpf,
  isValidEmail,
  isValidPhone,
  normalizeWhitespace,
  onlyDigits,
} from '../utils/clientDataUtils';

type ClientTab = 'pessoal' | 'familia' | 'contato' | 'previdencia' | 'documentos';
type ClientDraft = Omit<Partial<Client>, 'status'> & { status?: string };

type Props = {
  isOpen: boolean;
  client: Client | null;
  existingClients: Client[];
  clientCategories?: string[];
  onClose: () => void;
  onSaveClient: (updatedClient: Client) => void;
  onSelectClientForDoc?: () => void;
};

const EMPTY_DOCS: ClientDocumentChecklist = {
  rgCpf: false,
  comprovanteResidencia: false,
  carteiraTrabalhoCnis: false,
  comprovantesRendaFamilia: false,
  laudosMedicos: false,
  comprovacaoRural: false,
};

const TEXT_INPUT = 'w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium';
const READ_VALUE = 'bg-slate-50 p-2.5 rounded-xl text-slate-800 font-medium border border-slate-200 min-h-[38px]';

type ClientFieldContextValue = {
  isEditing: boolean;
  formData: ClientDraft;
  setField: (field: keyof Client, value: string) => void;
};

const ClientFieldContext = React.createContext<ClientFieldContextValue | null>(null);

const useClientFieldContext = () => {
  const context = React.useContext(ClientFieldContext);
  if (!context) throw new Error('Client fields must be rendered inside ClientFieldContext.');
  return context;
};

const Field = ({
  label,
  field,
  type = 'text',
  placeholder = '',
}: {
  label: string;
  field: keyof Client;
  type?: string;
  placeholder?: string;
}) => {
  const { isEditing, formData, setField } = useClientFieldContext();

  return (
    <div>
      <label className="block font-bold text-slate-700 mb-1">{label}</label>
      {isEditing ? (
        <input
          type={type}
          value={String(formData[field] ?? '')}
          onChange={(e) => setField(field, e.target.value)}
          placeholder={placeholder}
          className={TEXT_INPUT}
        />
      ) : (
        <p className={READ_VALUE}>{String(formData[field] || '—')}</p>
      )}
    </div>
  );
};

const SelectField = ({
  label,
  field,
  options,
}: {
  label: string;
  field: keyof Client;
  options: Array<{ value: string; label: string }>;
}) => {
  const { isEditing, formData, setField } = useClientFieldContext();

  return (
    <div>
      <label className="block font-bold text-slate-700 mb-1">{label}</label>
      {isEditing ? (
        <select
          value={String(formData[field] ?? '')}
          onChange={(e) => setField(field, e.target.value)}
          className={TEXT_INPUT}
        >
          <option value="">Selecione</option>
          {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      ) : (
        <p className={READ_VALUE}>{String(formData[field] || '—')}</p>
      )}
    </div>
  );
};

export const ClientDetailOperationalModal: React.FC<Props> = ({
  isOpen,
  client,
  existingClients,
  clientCategories = ['BPC Loas', 'Auxílio Doença', 'Aposentadoria', 'Trabalhista', 'Cível'],
  onClose,
  onSaveClient,
  onSelectClientForDoc,
}) => {
  const [activeTab, setActiveTab] = useState<ClientTab>('pessoal');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<ClientDraft>({});
  const [family, setFamily] = useState<FamilyMember[]>([]);
  const [docs, setDocs] = useState<ClientDocumentChecklist>(EMPTY_DOCS);
  const [validationError, setValidationError] = useState('');
  const [familyValidationError, setFamilyValidationError] = useState('');

  const [newFmName, setNewFmName] = useState('');
  const [newFmCpf, setNewFmCpf] = useState('');
  const [newFmBirth, setNewFmBirth] = useState('');
  const [newFmKinship, setNewFmKinship] = useState('Filho(a)');
  const [newFmIncome, setNewFmIncome] = useState('');

  const loadClientDraft = (source: Client) => {
    setFormData({ ...source, status: String(source.status || 'Ativo') });
    setFamily((source.familyMembers || []).map((member) => ({ ...member })));
    setDocs({ ...(source.documentChecklist || EMPTY_DOCS) });
    setValidationError('');
    setFamilyValidationError('');
    setNewFmName('');
    setNewFmCpf('');
    setNewFmBirth('');
    setNewFmKinship('Filho(a)');
    setNewFmIncome('');
  };

  useEffect(() => {
    if (!client) return;
    loadClientDraft(client);
    setIsEditing(false);
    setActiveTab('pessoal');
  }, [client?.id]);

  if (!isOpen || !client) return null;

  const setField = (field: keyof Client, value: string) => {
    let next = value;
    if (field === 'cpf') next = formatCpf(value);
    if (field === 'phone' || field === 'phoneSecondary') next = formatPhone(value);
    if (field === 'addressZip') next = formatCep(value);
    setValidationError('');
    setFormData((current) => ({ ...current, [field]: next }));
  };

  const cancelEditing = () => {
    loadClientDraft(client);
    setIsEditing(false);
  };

  const handleAddFamilyMember = () => {
    const name = normalizeWhitespace(newFmName);
    const cpf = formatCpf(newFmCpf);

    if (!name) {
      setFamilyValidationError('Informe o nome do membro familiar.');
      return;
    }
    if (cpf && !isValidCpf(cpf)) {
      setFamilyValidationError('O CPF do membro familiar é inválido.');
      return;
    }
    if (cpf) {
      const cpfDigits = onlyDigits(cpf);
      const matchesHolder = cpfDigits === onlyDigits(formData.cpf || '');
      const repeatsFamily = family.some((member) => onlyDigits(member.cpf || '') === cpfDigits);
      if (matchesHolder || repeatsFamily) {
        setFamilyValidationError('Este CPF já está vinculado ao titular ou à composição familiar.');
        return;
      }
    }

    setFamily((current) => [
      ...current,
      {
        id: `fm-${Date.now()}`,
        name,
        cpf,
        birthDate: newFmBirth,
        kinship: newFmKinship,
        income: newFmIncome.trim(),
      },
    ]);
    setNewFmName('');
    setNewFmCpf('');
    setNewFmBirth('');
    setNewFmIncome('');
    setFamilyValidationError('');
  };

  const handleSave = () => {
    const name = normalizeWhitespace(formData.name || '');
    const cpf = formatCpf(formData.cpf || '');
    const phone = formatPhone(formData.phone || '');
    const phoneSecondary = formatPhone(formData.phoneSecondary || '');
    const email = (formData.email || '').trim();
    const cep = formatCep(formData.addressZip || '');

    if (name.length < 3) {
      setValidationError('Informe o nome completo do cliente.');
      setActiveTab('pessoal');
      return;
    }
    if (!isValidCpf(cpf)) {
      setValidationError('Informe um CPF válido.');
      setActiveTab('pessoal');
      return;
    }
    const duplicateCpf = existingClients.some(
      (item) => item.id !== client.id && onlyDigits(item.cpf || '') === onlyDigits(cpf)
    );
    if (duplicateCpf) {
      setValidationError('Já existe outro cliente cadastrado com este CPF.');
      setActiveTab('pessoal');
      return;
    }
    if (!isValidPhone(phone)) {
      setValidationError('Informe um telefone principal válido com DDD.');
      setActiveTab('contato');
      return;
    }
    if (phoneSecondary && !isValidPhone(phoneSecondary)) {
      setValidationError('O telefone secundário deve possuir DDD e 10 ou 11 dígitos.');
      setActiveTab('contato');
      return;
    }
    if (!isValidEmail(email)) {
      setValidationError('Informe um e-mail válido ou deixe o campo vazio.');
      setActiveTab('contato');
      return;
    }
    if (cep && !isValidCep(cep)) {
      setValidationError('O CEP deve possuir 8 dígitos.');
      setActiveTab('contato');
      return;
    }
    if (!formData.typePill) {
      setValidationError('Selecione a categoria ou benefício do cliente.');
      setActiveTab('pessoal');
      return;
    }

    const updated = {
      ...(formData as Client),
      name,
      socialName: normalizeWhitespace(formData.socialName || ''),
      cpf,
      email,
      phone,
      phoneSecondary,
      nationality: normalizeWhitespace(formData.nationality || ''),
      birthplace: normalizeWhitespace(formData.birthplace || ''),
      motherName: normalizeWhitespace(formData.motherName || ''),
      fatherName: normalizeWhitespace(formData.fatherName || ''),
      propertyRegime: normalizeWhitespace(formData.propertyRegime || ''),
      spouseName: normalizeWhitespace(formData.spouseName || ''),
      addressStreet: normalizeWhitespace(formData.addressStreet || ''),
      addressNumber: normalizeWhitespace(formData.addressNumber || ''),
      addressComplement: normalizeWhitespace(formData.addressComplement || ''),
      addressNeighborhood: normalizeWhitespace(formData.addressNeighborhood || ''),
      addressCityUf: normalizeWhitespace(formData.addressCityUf || ''),
      addressZip: cep,
      occupation: normalizeWhitespace(formData.occupation || ''),
      monthlyIncome: (formData.monthlyIncome || '').trim(),
      nitPisPasep: (formData.nitPisPasep || '').trim(),
      benefitNumber: (formData.benefitNumber || '').trim(),
      bankName: normalizeWhitespace(formData.bankName || ''),
      bankAgency: (formData.bankAgency || '').trim(),
      bankAccount: (formData.bankAccount || '').trim(),
      pixKey: (formData.pixKey || '').trim(),
      familyMembers: family.map((member) => ({
        ...member,
        name: normalizeWhitespace(member.name || ''),
        cpf: member.cpf ? formatCpf(member.cpf) : '',
      })),
      documentChecklist: { ...docs },
      updatedAt: `Atualizado ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
    } as Client;

    setValidationError('');
    setFormData(updated);
    onSaveClient(updated);
    setIsEditing(false);
  };

  const archived = String(formData.status) === 'Arquivado';
  const fieldContextValue: ClientFieldContextValue = { isEditing, formData, setField };

  return (
    <ClientFieldContext.Provider value={fieldContextValue}>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-900/60 backdrop-blur-xs">
        <div className="bg-white w-full max-w-5xl rounded-3xl border border-slate-200 shadow-2xl max-h-[92vh] overflow-hidden flex flex-col">
          <div className="p-5 md:p-7 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl md:text-2xl font-extrabold text-slate-900">{formData.name || 'Cliente'}</h2>
                <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${archived ? 'bg-slate-100 text-slate-700 border-slate-300' : 'bg-emerald-50 text-emerald-800 border-emerald-200'}`}>
                  {String(formData.status || 'Ativo')}
                </span>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold border bg-blue-50 text-blue-900 border-blue-200">
                  {formData.typePill || 'Sem categoria'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Cód. {formData.code || '—'} • CPF {formData.cpf || '—'}</p>
            </div>

            <div className="flex gap-2 flex-wrap justify-end">
              {!isEditing && onSelectClientForDoc && !archived && (
                <button type="button" onClick={onSelectClientForDoc} className="px-3 py-2 rounded-xl bg-blue-50 text-blue-900 border border-blue-200 text-xs font-bold flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">description</span>
                  Documentos
                </button>
              )}
              {isEditing ? (
                <>
                  <button type="button" onClick={cancelEditing} className="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold">Cancelar</button>
                  <button type="button" onClick={handleSave} className="px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold">Salvar alterações</button>
                </>
              ) : (
                <button type="button" onClick={() => setIsEditing(true)} className="px-4 py-2 rounded-xl bg-blue-900 text-white text-xs font-bold">Editar ficha</button>
              )}
              <button type="button" onClick={onClose} className="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold">Fechar</button>
            </div>
          </div>

          {validationError && (
            <div className="mx-5 md:mx-7 mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-red-800 text-xs font-semibold" role="alert">
              {validationError}
            </div>
          )}

          <div className="px-5 md:px-7 pt-4 flex gap-1 overflow-x-auto border-b border-slate-200 text-xs font-bold">
            {[
              ['pessoal', 'Identificação'],
              ['familia', 'Família'],
              ['contato', 'Contato e endereço'],
              ['previdencia', 'Previdenciário'],
              ['documentos', 'Documentos e banco'],
            ].map(([tab, label]) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab as ClientTab)}
                className={`px-4 py-3 whitespace-nowrap border-b-2 ${activeTab === tab ? 'border-blue-900 text-blue-900' : 'border-transparent text-slate-500'}`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="p-5 md:p-7 overflow-y-auto text-xs">
            {activeTab === 'pessoal' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Field label="Nome completo" field="name" />
                <Field label="Nome social" field="socialName" />
                <Field label="CPF" field="cpf" />
                <Field label="Data de nascimento" field="birthDate" type="date" />
                <Field label="Nacionalidade" field="nationality" />
                <Field label="Naturalidade (Cidade/UF)" field="birthplace" />
                <SelectField label="Sexo / Gênero (INSS)" field="gender" options={[
                  { value: 'Feminino', label: 'Feminino' },
                  { value: 'Masculino', label: 'Masculino' },
                  { value: 'Outro', label: 'Outro' },
                ]} />
                <Field label="Nome da mãe" field="motherName" />
                <Field label="Nome do pai" field="fatherName" />
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Categoria / benefício</label>
                  {isEditing ? (
                    <select value={formData.typePill || ''} onChange={(e) => setField('typePill', e.target.value)} className={TEXT_INPUT}>
                      <option value="">Selecione</option>
                      {clientCategories.map((category) => <option key={category} value={category}>{category}</option>)}
                    </select>
                  ) : <p className={READ_VALUE}>{formData.typePill || 'Sem categoria'}</p>}
                </div>
              </div>
            )}

            {activeTab === 'familia' && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <SelectField label="Estado civil" field="maritalStatus" options={[
                    { value: 'Solteiro(a)', label: 'Solteiro(a)' },
                    { value: 'Casado(a)', label: 'Casado(a)' },
                    { value: 'União Estável', label: 'União Estável' },
                    { value: 'Divorciado(a)', label: 'Divorciado(a)' },
                    { value: 'Viúvo(a)', label: 'Viúvo(a)' },
                  ]} />
                  <Field label="Regime de bens" field="propertyRegime" />
                  <Field label="Cônjuge / companheiro(a)" field="spouseName" />
                </div>

                <div className="border-t border-slate-200 pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-slate-900">Composição familiar</h3>
                    <span className="text-slate-500">{family.length} membro(s)</span>
                  </div>

                  {isEditing && (
                    <div className="space-y-2">
                      {familyValidationError && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-red-800 font-semibold">{familyValidationError}</div>}
                      <div className="grid grid-cols-1 md:grid-cols-6 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                        <input value={newFmName} onChange={(e) => { setNewFmName(e.target.value); setFamilyValidationError(''); }} placeholder="Nome" className={`md:col-span-2 ${TEXT_INPUT}`} />
                        <input value={newFmCpf} onChange={(e) => { setNewFmCpf(formatCpf(e.target.value)); setFamilyValidationError(''); }} placeholder="CPF" className={TEXT_INPUT} />
                        <input type="date" value={newFmBirth} onChange={(e) => setNewFmBirth(e.target.value)} className={TEXT_INPUT} />
                        <select value={newFmKinship} onChange={(e) => setNewFmKinship(e.target.value)} className={TEXT_INPUT}>
                          <option value="Filho(a)">Filho(a)</option><option value="Cônjuge">Cônjuge</option><option value="Pai/Mãe">Pai/Mãe</option><option value="Irmão(ã)">Irmão(ã)</option><option value="Outro">Outro</option>
                        </select>
                        <button type="button" onClick={handleAddFamilyMember} className="rounded-xl bg-blue-900 text-white font-bold">Incluir</button>
                        <input value={newFmIncome} onChange={(e) => setNewFmIncome(e.target.value)} placeholder="Renda mensal" className={`md:col-span-6 ${TEXT_INPUT}`} />
                      </div>
                    </div>
                  )}

                  <div className="overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="w-full text-left">
                      <thead className="bg-slate-100"><tr><th className="p-2.5">Nome</th><th className="p-2.5">CPF</th><th className="p-2.5">Parentesco</th><th className="p-2.5">Nascimento</th><th className="p-2.5">Renda</th>{isEditing && <th className="p-2.5">Ação</th>}</tr></thead>
                      <tbody>
                        {family.length ? family.map((member) => (
                          <tr key={member.id} className="border-t border-slate-100">
                            <td className="p-2.5 font-semibold">{member.name}</td><td className="p-2.5 font-mono">{member.cpf || '—'}</td><td className="p-2.5">{member.kinship || '—'}</td><td className="p-2.5">{member.birthDate || '—'}</td><td className="p-2.5">{member.income || '—'}</td>
                            {isEditing && <td className="p-2.5"><button type="button" onClick={() => setFamily((current) => current.filter((item) => item.id !== member.id))} className="text-red-700 font-bold">Remover</button></td>}
                          </tr>
                        )) : <tr><td colSpan={isEditing ? 6 : 5} className="p-4 text-center text-slate-400">Nenhum membro cadastrado.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'contato' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Field label="Telefone / WhatsApp" field="phone" />
                <Field label="Telefone secundário" field="phoneSecondary" />
                <Field label="E-mail" field="email" type="email" />
                <div className="md:col-span-2"><Field label="Logradouro / Rua" field="addressStreet" /></div>
                <Field label="Número" field="addressNumber" />
                <Field label="Complemento" field="addressComplement" />
                <Field label="Bairro" field="addressNeighborhood" />
                <Field label="Cidade / UF" field="addressCityUf" />
                <Field label="CEP" field="addressZip" />
                <SelectField label="Zona" field="addressZone" options={[{ value: 'Urbana', label: 'Urbana' }, { value: 'Rural', label: 'Rural' }]} />
              </div>
            )}

            {activeTab === 'previdencia' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Field label="Profissão / ocupação" field="occupation" />
                <Field label="Renda mensal" field="monthlyIncome" />
                <SelectField label="Vínculo empregatício" field="employmentStatus" options={[
                  { value: 'CLT', label: 'CLT / Empregado formal' }, { value: 'Autônomo', label: 'Autônomo / Informal' }, { value: 'Rural', label: 'Trabalhador rural' }, { value: 'Desempregado', label: 'Desempregado(a)' }, { value: 'Servidor Público', label: 'Servidor público' }, { value: 'Outro', label: 'Outro' },
                ]} />
                <SelectField label="Regime de contribuição INSS" field="inssContributionRegime" options={[
                  { value: 'Empregado', label: 'Empregado (CLT)' }, { value: 'Contribuinte Individual', label: 'Contribuinte Individual' }, { value: 'Segurado Especial', label: 'Segurado Especial' }, { value: 'Facultativo', label: 'Facultativo' }, { value: 'Nenhum', label: 'Nenhum / Sem contribuição' },
                ]} />
                <Field label="NIT / PIS / PASEP" field="nitPisPasep" />
                <Field label="Número do benefício (NB)" field="benefitNumber" />
              </div>
            )}

            {activeTab === 'documentos' && (
              <div className="space-y-5">
                <div>
                  <h3 className="font-extrabold text-slate-900 mb-3">Checklist de documentos recebidos</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {[
                      ['rgCpf', 'CPF'],
                      ['comprovanteResidencia', 'Comprovante de residência'],
                      ['carteiraTrabalhoCnis', 'CTPS / CNIS'],
                      ['comprovantesRendaFamilia', 'Comprovantes de renda familiar'],
                      ['laudosMedicos', 'Laudos médicos'],
                      ['comprovacaoRural', 'Comprovação rural'],
                    ].map(([key, label]) => {
                      const docKey = key as keyof ClientDocumentChecklist;
                      const checked = docs[docKey];
                      return (
                        <button
                          type="button"
                          key={key}
                          disabled={!isEditing}
                          onClick={() => setDocs((current) => ({ ...current, [docKey]: !current[docKey] }))}
                          className={`p-3 rounded-2xl border text-left flex items-center gap-2 ${checked ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-slate-50 border-slate-200 text-slate-600'} ${isEditing ? 'cursor-pointer' : 'cursor-default'}`}
                        >
                          <span className="material-symbols-outlined text-base">{checked ? 'check_box' : 'check_box_outline_blank'}</span>
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="border-t border-slate-200 pt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
                  <Field label="Banco" field="bankName" />
                  <Field label="Agência" field="bankAgency" />
                  <Field label="Conta" field="bankAccount" />
                  <Field label="Chave PIX" field="pixKey" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ClientFieldContext.Provider>
  );
};
