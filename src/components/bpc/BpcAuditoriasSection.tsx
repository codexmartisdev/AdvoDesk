import React from 'react';
import { BpcCaseItem } from '../../types/bpc';

interface BpcAuditoriasSectionProps {
  cases: BpcCaseItem[];
}

export const BpcAuditoriasSection: React.FC<BpcAuditoriasSectionProps> = ({ cases }) => {
  const auditChecklist = [
    {
      title: '1. Inscrição e Atualização no CadÚnico',
      desc: 'O requerente e todos os membros da família devem estar no CadÚnico com dados atualizados nos últimos 24 meses.',
      rule: 'Obrigatório conforme Dec. 6.214/2007 e Portaria Conjunta MDS/INSS.',
      icon: 'badge',
    },
    {
      title: '2. Cadastro Biométrico',
      desc: 'Validação da biometria na CIN, TSE ou Carteira de Motorista antes do protocolo administrativo.',
      rule: 'Exigência recente para evitar indeferimentos sumários pelo INSS.',
      icon: 'fingerprint',
    },
    {
      title: '3. Conferência de Renda no CNIS',
      desc: 'Verificação prévia de todos os membros do grupo familiar no extrato CNIS para evitar surpresas no cálculo de renda per capita.',
      rule: 'Excluir do cômputo outro BPC ou benefício previdenciário de até 1 salário mínimo para idoso/deficiente.',
      icon: 'receipt_long',
    },
    {
      title: '4. Comprovação de Gastos com Saúde e Medicamentos',
      desc: 'Recibos médicos, prescrições de remédios contínuos não fornecidos pelo SUS, fraldas e alimentação especial para dedução.',
      rule: 'Previsão legal do art. 20, § 11-A da Lei 8.742/93.',
      icon: 'payments',
    },
    {
      title: '5. Dossiê Médico Completo (BPC PCD)',
      desc: 'Laudos com CID legível, descrição do impedimento de longo prazo e limitações no ambiente de trabalho e vida comunitária.',
      rule: 'Critério biopsicossocial do Estatuto da Pessoa com Deficiência.',
      icon: 'medical_services',
    },
    {
      title: '6. Procuração Específica e Termo de Representação',
      desc: 'Instrumento de mandato com poderes expressos para requerer BPC/LOAS perante o INSS com termo de responsabilidade de declarações.',
      rule: 'Emitido diretamente pelo módulo de Documentos & Minutas do AdvoDesk.',
      icon: 'description',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-[#C9A227] text-base">fact_check</span>
            <span>Auditoria Pré-Protocolo BPC/LOAS</span>
          </h3>
          <p className="text-slate-500 text-xs mt-0.5">
            Checklist de consistência e conformidade antes da transmissão do requerimento no Meu INSS
          </p>
        </div>
      </div>

      {/* Grid de Itens de Auditoria */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {auditChecklist.map((item, index) => (
          <div key={index} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-sm">{item.icon}</span>
              </div>
              <h4 className="font-bold text-slate-900 text-xs">{item.title}</h4>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed pl-9.5">{item.desc}</p>
            <div className="pl-9.5 pt-1">
              <span className="text-[10px] font-semibold text-[#0D0D0D] bg-amber-50/80 px-2 py-0.5 rounded-md border border-amber-200/50 block">
                {item.rule}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Box explicativo da expansão */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0D0D0D] text-[#C9A227] flex items-center justify-center border border-[#C9A227]/40 shrink-0">
            <span className="material-symbols-outlined text-xl">verified_user</span>
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-xs">Preparado para Validações Futuras</h4>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
              Esta área receberá progressivamente os motores de auditoria automática de renda familiar, checagem cruzada de extratos do CNIS e alertas de elegibilidade sem alteração da estrutura visual.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
