import React, { useState } from 'react';
import { LegalCase, Client } from '../types';
import { getBrasiliaISO, getBrasiliaFormatted } from '../utils/dateUtils';

interface NewCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients?: Client[];
  onCaseCreated?: (newCase: LegalCase) => void;
  onClientCreated: (newClient: Client) => void;
  initialMode?: 'case' | 'client';
  practiceAreas?: string[];
  clientCategories?: string[];
}

export const NewCaseModal: React.FC<NewCaseModalProps> = ({
  isOpen,
  onClose,
  onClientCreated,
  clientCategories = [
    'BPC Loas',
    'Auxílio Doença',
    'Aposentadoria',
    'Trabalhista',
    'Cível',
  ],
}) => {
  // New Client State (8 Previdenciário / Legal Sections)
  const [clientName, setClientName] = useState('');
  const [socialName, setSocialName] = useState('');
  const [clientCpf, setClientCpf] = useState('');
  const [rgNumber, setRgNumber] = useState('');
  const [rgIssuer, setRgIssuer] = useState('');
  const [rgUf, setRgUf] = useState('');
  const [rgIssueDate, setRgIssueDate] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [nationality, setNationality] = useState('');
  const [birthplace, setBirthplace] = useState('');
  const [gender, setGender] = useState('');
  const [motherName, setMotherName] = useState('');
  const [fatherName, setFatherName] = useState('');

  const [maritalStatus, setMaritalStatus] = useState('');
  const [propertyRegime, setPropertyRegime] = useState('');
  const [spouseName, setSpouseName] = useState('');

  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [phoneSecondary, setPhoneSecondary] = useState('');

  const [addressStreet, setAddressStreet] = useState('');
  const [addressNumber, setAddressNumber] = useState('');
  const [addressComplement, setAddressComplement] = useState('');
  const [addressNeighborhood, setAddressNeighborhood] = useState('');
  const [addressCityUf, setAddressCityUf] = useState('');
  const [addressZip, setAddressZip] = useState('');
  const [addressZone, setAddressZone] = useState('');

  const [occupation, setOccupation] = useState('');
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [employmentStatus, setEmploymentStatus] = useState('');
  const [inssContributionRegime, setInssContributionRegime] = useState('');

  const [nitPisPasep, setNitPisPasep] = useState('');
  const [benefitNumber, setBenefitNumber] = useState('');

  const [docRgCpf, setDocRgCpf] = useState(true);
  const [docComprovanteResidencia, setDocComprovanteResidencia] = useState(true);
  const [docCarteiraTrabalho, setDocCarteiraTrabalho] = useState(false);
  const [docComprovantesRenda, setDocComprovantesRenda] = useState(false);
  const [docLaudosMedicos, setDocLaudosMedicos] = useState(false);
  const [docComprovacaoRural, setDocComprovacaoRural] = useState(false);

  const [bankName, setBankName] = useState('');
  const [bankAgency, setBankAgency] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [pixKey, setPixKey] = useState('');

  const [typePill, setTypePill] = useState(clientCategories[0] || 'BPC Loas');

  if (!isOpen) return null;

  const handleCreateClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) return;

    const newClient: Client = {
      id: `c-${Date.now()}`,
      code: `${Math.floor(100 + Math.random() * 899)}.${Math.floor(100 + Math.random() * 899)}.${Math.floor(10 + Math.random() * 89)}-X`,
      name: clientName,
      socialName,
      typePill,
      status: 'Ativo',
      updatedAt: 'Criado agora',
      cpf: clientCpf.trim(),
      rgNumber,
      rgIssuer,
      rgUf,
      rgIssueDate,
      birthDate,
      nationality,
      birthplace,
      gender,
      motherName,
      fatherName,
      maritalStatus,
      propertyRegime,
      spouseName,
      familyMembers: [],
      email: clientEmail.trim(),
      phone: clientPhone.trim(),
      phoneSecondary,
      addressStreet,
      addressNumber,
      addressComplement,
      addressNeighborhood,
      addressCityUf,
      addressZip,
      addressZone,
      occupation,
      monthlyIncome,
      employmentStatus,
      inssContributionRegime,
      nitPisPasep,
      benefitNumber,
      documentChecklist: {
        rgCpf: docRgCpf,
        comprovanteResidencia: docComprovanteResidencia,
        carteiraTrabalhoCnis: docCarteiraTrabalho,
        comprovantesRendaFamilia: docComprovantesRenda,
        laudosMedicos: docLaudosMedicos,
        comprovacaoRural: docComprovacaoRural,
      },
      bankName,
      bankAgency,
      bankAccount,
      pixKey,
      casesCount: 0,
    };

    onClientCreated(newClient);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white w-full max-w-3xl rounded-3xl p-6 md:p-8 border border-slate-200 shadow-2xl relative animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-slate-400 hover:text-slate-700 p-2 rounded-full hover:bg-slate-100"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-slate-200">
          <div className="w-10 h-10 rounded-2xl bg-[#0D0D0D] border border-[#C9A227]/50 flex items-center justify-center text-[#C9A227] shrink-0">
            <span className="material-symbols-outlined text-xl">person_add</span>
          </div>
          <div>
            <h2 className="font-title-md text-base font-bold text-slate-900">Cadastrar Novo Cliente</h2>
            <p className="text-slate-500 text-xs mt-0.5">Preencha a qualificação para emissão de procurações, contratos e atendimento</p>
          </div>
        </div>

        {/* Client Form */}
        <form onSubmit={handleCreateClient} className="space-y-4 text-xs max-h-[70vh] overflow-y-auto pr-1">
            {/* 1. Identificação Pessoal */}
            <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-3">
              <h3 className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5 border-b border-slate-200 pb-2">
                <span className="material-symbols-outlined text-blue-900 text-base">badge</span>
                <span>1. Identificação Pessoal</span>
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Nome Completo *</label>
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Ex: Roberto Alves de Souza"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nome Social (se houver)</label>
                  <input
                    type="text"
                    value={socialName}
                    onChange={(e) => setSocialName(e.target.value)}
                    placeholder="Nome social"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">CPF *</label>
                  <input
                    type="text"
                    required
                    value={clientCpf}
                    onChange={(e) => setClientCpf(e.target.value)}
                    placeholder="000.000.000-00"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">RG (Número)</label>
                  <input
                    type="text"
                    value={rgNumber}
                    onChange={(e) => setRgNumber(e.target.value)}
                    placeholder="00.000.000-0"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Órgão Emissor / UF / Expedição</label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="SSP"
                      value={rgIssuer}
                      onChange={(e) => setRgIssuer(e.target.value)}
                      className="w-1/3 bg-white border border-slate-300 rounded-xl px-2 py-2 text-slate-900"
                    />
                    <input
                      type="text"
                      placeholder="UF"
                      value={rgUf}
                      onChange={(e) => setRgUf(e.target.value)}
                      className="w-1/4 bg-white border border-slate-300 rounded-xl px-2 py-2 text-slate-900 text-center uppercase"
                    />
                    <input
                      type="date"
                      value={rgIssueDate}
                      onChange={(e) => setRgIssueDate(e.target.value)}
                      className="flex-1 bg-white border border-slate-300 rounded-xl px-2 py-2 text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Data de Nascimento</label>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nacionalidade / Naturalidade</label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={nationality}
                      onChange={(e) => setNationality(e.target.value)}
                      placeholder="Brasileiro(a)"
                      className="w-1/2 bg-white border border-slate-300 rounded-xl px-2 py-2 text-slate-900"
                    />
                    <input
                      type="text"
                      value={birthplace}
                      onChange={(e) => setBirthplace(e.target.value)}
                      placeholder="Ex: Cidade/UF"
                      className="w-1/2 bg-white border border-slate-300 rounded-xl px-2 py-2 text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Sexo / Gênero (INSS)</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium"
                  >
                    <option value="">Selecione</option>
                    <option value="Feminino">Feminino</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nome da Mãe (Exigido pelo INSS)</label>
                  <input
                    type="text"
                    value={motherName}
                    onChange={(e) => setMotherName(e.target.value)}
                    placeholder="Nome completo da mãe"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nome do Pai (Opcional)</label>
                  <input
                    type="text"
                    value={fatherName}
                    onChange={(e) => setFatherName(e.target.value)}
                    placeholder="Nome completo do pai"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium"
                  />
                </div>
              </div>

            </div>

            {/* 2. Estado Civil e Família */}
            <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-3">
              <h3 className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5 border-b border-slate-200 pb-2">
                <span className="material-symbols-outlined text-blue-900 text-base">family_restroom</span>
                <span>2. Estado Civil & Família</span>
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Estado Civil</label>
                  <select
                    value={maritalStatus}
                    onChange={(e) => setMaritalStatus(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium"
                  >
                    <option value="">Selecione</option>
                    <option value="Solteiro(a)">Solteiro(a)</option>
                    <option value="Casado(a)">Casado(a)</option>
                    <option value="União Estável">União Estável</option>
                    <option value="Divorciado(a)">Divorciado(a)</option>
                    <option value="Viúvo(a)">Viúvo(a)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Regime de Bens</label>
                  <input
                    type="text"
                    placeholder="Comunhão Parcial"
                    value={propertyRegime}
                    onChange={(e) => setPropertyRegime(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nome do Cônjuge</label>
                  <input
                    type="text"
                    placeholder="Nome do cônjuge/companheiro"
                    value={spouseName}
                    onChange={(e) => setSpouseName(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium"
                  />
                </div>
              </div>
            </div>

            {/* 3 & 4. Contato e Endereço */}
            <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-3">
              <h3 className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5 border-b border-slate-200 pb-2">
                <span className="material-symbols-outlined text-blue-900 text-base">contact_mail</span>
                <span>3 & 4. Contato e Endereço</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Telefone / WhatsApp *</label>
                  <input
                    type="text"
                    required
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="(00) 00000-0000"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Telefone Secundário</label>
                  <input
                    type="text"
                    value={phoneSecondary}
                    onChange={(e) => setPhoneSecondary(e.target.value)}
                    placeholder="(00) 00000-0000"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">E-mail</label>
                  <input
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    placeholder="nome@email.com"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-2 border-t border-slate-200">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Logradouro / Rua</label>
                  <input
                    type="text"
                    placeholder="Ex: Av. São Sebastião"
                    value={addressStreet}
                    onChange={(e) => setAddressStreet(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Número</label>
                  <input
                    type="text"
                    placeholder="120"
                    value={addressNumber}
                    onChange={(e) => setAddressNumber(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Complemento</label>
                  <input
                    type="text"
                    placeholder="Apto 102 / Casa"
                    value={addressComplement}
                    onChange={(e) => setAddressComplement(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Bairro</label>
                  <input
                    type="text"
                    placeholder="Fátima"
                    value={addressNeighborhood}
                    onChange={(e) => setAddressNeighborhood(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Cidade / UF</label>
                  <input
                    type="text"
                    placeholder="Ex: Cidade/UF"
                    value={addressCityUf}
                    onChange={(e) => setAddressCityUf(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">CEP</label>
                  <input
                    type="text"
                    placeholder="00000-000"
                    value={addressZip}
                    onChange={(e) => setAddressZip(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Zona (Urbana/Rural)</label>
                  <select
                    value={addressZone}
                    onChange={(e) => setAddressZone(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold"
                  >
                    <option value="">Selecione</option>
                    <option value="Urbana">Urbana</option>
                    <option value="Rural">Rural (Segurado Especial)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 5 & 6. Profissão & Previdenciário */}
            <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-3">
              <h3 className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5 border-b border-slate-200 pb-2">
                <span className="material-symbols-outlined text-blue-900 text-base">work_history</span>
                <span>5 & 6. Profissão, Renda & Dados Previdenciários (INSS)</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Profissão Atual</label>
                  <input
                    type="text"
                    placeholder="Ex: Lavrador(a)"
                    value={occupation}
                    onChange={(e) => setOccupation(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Renda Mensal</label>
                  <input
                    type="text"
                    placeholder="R$ 1.412,00"
                    value={monthlyIncome}
                    onChange={(e) => setMonthlyIncome(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-semibold text-emerald-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Vínculo Empregatício</label>
                  <select
                    value={employmentStatus}
                    onChange={(e) => setEmploymentStatus(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                  >
                    <option value="">Selecione</option>
                    <option value="CLT">CLT / Empregado Formal</option>
                    <option value="Autônomo">Autônomo / Informal</option>
                    <option value="Rural">Trabalhador Rural / Lavrador</option>
                    <option value="Desempregado">Desempregado(a)</option>
                    <option value="Servidor Público">Servidor Público</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Categoria / Benefício *</label>
                  <select
                    value={typePill}
                    onChange={(e) => setTypePill(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold"
                  >
                    {clientCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">NIT / PIS / PASEP</label>
                  <input
                    type="text"
                    placeholder="123.45678.90-1"
                    value={nitPisPasep}
                    onChange={(e) => setNitPisPasep(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Número do Benefício (NB)</label>
                  <input
                    type="text"
                    placeholder="87/123.456.789-0"
                    value={benefitNumber}
                    onChange={(e) => setBenefitNumber(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold text-blue-900"
                  />
                </div>
              </div>
            </div>

            {/* 7 & 8. Documentos & Banco */}
            <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-3">
              <h3 className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5 border-b border-slate-200 pb-2">
                <span className="material-symbols-outlined text-blue-900 text-base">account_balance</span>
                <span>7 & 8. Documentos Anexos & Dados Bancários</span>
              </h3>

              <div className="space-y-2">
                <label className="block font-bold text-slate-700">Checklist Inicial de Documentos</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <label className="flex items-center space-x-2 bg-white p-2 rounded-xl border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={docRgCpf}
                      onChange={(e) => setDocRgCpf(e.target.checked)}
                      className="rounded text-blue-900 focus:ring-blue-900"
                    />
                    <span>RG e CPF</span>
                  </label>

                  <label className="flex items-center space-x-2 bg-white p-2 rounded-xl border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={docComprovanteResidencia}
                      onChange={(e) => setDocComprovanteResidencia(e.target.checked)}
                      className="rounded text-blue-900 focus:ring-blue-900"
                    />
                    <span>Comp. Residência</span>
                  </label>

                  <label className="flex items-center space-x-2 bg-white p-2 rounded-xl border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={docCarteiraTrabalho}
                      onChange={(e) => setDocCarteiraTrabalho(e.target.checked)}
                      className="rounded text-blue-900 focus:ring-blue-900"
                    />
                    <span>CTPS / CNIS</span>
                  </label>

                  <label className="flex items-center space-x-2 bg-white p-2 rounded-xl border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={docComprovantesRenda}
                      onChange={(e) => setDocComprovantesRenda(e.target.checked)}
                      className="rounded text-blue-900 focus:ring-blue-900"
                    />
                    <span>Renda Familiar</span>
                  </label>

                  <label className="flex items-center space-x-2 bg-white p-2 rounded-xl border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={docLaudosMedicos}
                      onChange={(e) => setDocLaudosMedicos(e.target.checked)}
                      className="rounded text-blue-900 focus:ring-blue-900"
                    />
                    <span>Laudos Médicos</span>
                  </label>

                  <label className="flex items-center space-x-2 bg-white p-2 rounded-xl border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={docComprovacaoRural}
                      onChange={(e) => setDocComprovacaoRural(e.target.checked)}
                      className="rounded text-blue-900 focus:ring-blue-900"
                    />
                    <span>Comprovação Rural</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-200">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Banco</label>
                  <input
                    type="text"
                    placeholder="Caixa"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Agência</label>
                  <input
                    type="text"
                    placeholder="0001"
                    value={bankAgency}
                    onChange={(e) => setBankAgency(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Conta</label>
                  <input
                    type="text"
                    placeholder="12345-6"
                    value={bankAccount}
                    onChange={(e) => setBankAccount(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Chave PIX</label>
                  <input
                    type="text"
                    placeholder="CPF/Celular"
                    value={pixKey}
                    onChange={(e) => setPixKey(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 flex gap-3 sticky bottom-0 bg-white py-2 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 glass-btn-primary py-3 rounded-xl text-white font-bold"
              >
                Cadastrar Cliente Completo
              </button>
            </div>
          </form>
      </div>
    </div>
  );
};
