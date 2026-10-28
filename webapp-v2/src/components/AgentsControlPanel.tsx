import React, { useState } from 'react';
import {
  Smartphone,
  Tablet,
  Monitor,
  Play,
  Copy,
  Check,
  Save,
  Send,
  AlertTriangle,
  FileText,
  Camera,
  Wrench,
} from 'lucide-react';
import {
  AttendanceRecord,
  DeviceFormFactor,
  SpecialistAgentId,
  WorkshopSettings,
} from '../types';
import { formatMissingText } from '../utils/calculations';

interface AgentsControlPanelProps {
  attendances: AttendanceRecord[];
  activeAttendance: AttendanceRecord | null;
  onSelectAttendance: (id: string) => void;
  settings: WorkshopSettings;
  onSaveSettings: (nextSettings: WorkshopSettings) => Promise<void>;
  isSavingSettings: boolean;
  onRunDefectsAgent: () => Promise<void>;
  onRunReuseAndProposalsAgent: () => Promise<void>;
  isAnalyzingDefects: boolean;
  isAnalyzingReuse: boolean;
  deviceFormFactor: DeviceFormFactor;
  stationName: string;
  onActivateStationMode: (
    formFactor: DeviceFormFactor,
    stationName: string,
    targetStep: number
  ) => void;
  onAttendanceUpdated: (updated: AttendanceRecord) => void;
}

interface AgentConsultResult {
  agentTitle: string;
  technicalAnalysis: string;
  recommendedActions: string[];
  clientMessageSuggestion: string;
  usedModel?: string;
}

export const AgentsControlPanel: React.FC<AgentsControlPanelProps> = ({
  attendances,
  activeAttendance,
  onSelectAttendance,
  settings,
  onSaveSettings,
  isSavingSettings,
  onRunDefectsAgent,
  onRunReuseAndProposalsAgent,
  isAnalyzingDefects,
  isAnalyzingReuse,
  deviceFormFactor,
  stationName,
  onActivateStationMode,
  onAttendanceUpdated,
}) => {
  const [localSettings, setLocalSettings] = useState<WorkshopSettings>(settings);
  const [savedRulesSuccess, setSavedRulesSuccess] = useState(false);

  // On-demand consultation state
  const [selectedAgent, setSelectedAgent] =
    useState<SpecialistAgentId>('vistoriador_defeitos');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [isConsulting, setIsConsulting] = useState(false);
  const [consultError, setConsultError] = useState<string | null>(null);
  const [consultResult, setConsultResult] = useState<AgentConsultResult | null>(null);
  const [copiedClientMsg, setCopiedClientMsg] = useState(false);

  const handleSaveAgentRules = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveSettings(localSettings);
    setSavedRulesSuccess(true);
    setTimeout(() => setSavedRulesSuccess(false), 3000);
  };

  const handleRunConsult = async (promptToRun?: string) => {
    const finalPrompt = (promptToRun ?? customPrompt).trim();
    if (!finalPrompt) return;
    if (promptToRun) {
      setCustomPrompt(promptToRun);
    }

    setIsConsulting(true);
    setConsultError(null);
    try {
      const res = await fetch('/api/ai/agent-consult', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendanceId: activeAttendance?.id,
          agentId: selectedAgent,
          customPrompt: finalPrompt,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.result) {
        throw new Error(
          data.error || 'Não foi possível consultar o Agente Especialista no momento.'
        );
      }
      setConsultResult({
        ...data.result,
        usedModel: data.usedModel,
      });
      if (data.attendance) {
        onAttendanceUpdated(data.attendance);
      }
    } catch (err) {
      setConsultError(
        err instanceof Error
          ? err.message
          : 'Falha ao consultar o Agente Especialista.'
      );
    } finally {
      setIsConsulting(false);
    }
  };

  const handleCopyClientMessage = async () => {
    if (!consultResult?.clientMessageSuggestion) return;
    try {
      await navigator.clipboard.writeText(consultResult.clientMessageSuggestion);
      setCopiedClientMsg(true);
      setTimeout(() => setCopiedClientMsg(false), 2500);
    } catch {
      // ignore
    }
  };

  const quickPresets: Array<{
    agentId: SpecialistAgentId;
    label: string;
    prompt: string;
  }> = [
    {
      agentId: 'vistoriador_defeitos',
      label: 'Checklist de fotos faltantes e limitações',
      prompt:
        'Examine as fotos atuais deste atendimento e liste exatamente quais ângulos ou detalhes ainda precisam ser fotografados pelo celular ou na oficina para fechar o diagnóstico sem pontos cegos.',
    },
    {
      agentId: 'especialista_reaproveitamento',
      label: 'Roteiro de desmontagem e conferência para a bancada',
      prompt:
        'Monte um roteiro técnico passo a passo para o tapeceiro na bancada da oficina conferir madeiramento, percintas, molas e espuma deste móvel durante a abertura, destacando onde há risco de retrabalho.',
    },
    {
      agentId: 'consultor_propostas',
      label: 'Mensagem técnica para WhatsApp do cliente',
      prompt:
        'Elabore uma mensagem cordial, transparente e profissional para enviar no WhatsApp do cliente explicando o diagnóstico preliminar, as 3 opções de proposta (Essencial, Recomendada e Completa) e por que a confirmação da estrutura interna ocorre na abertura do estofado na oficina.',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header & Station Agent Mode Switcher (Celular / Tablet / Computador) */}
      <section className="rounded-xl bg-white border border-[#E5DEC9] p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-[#EFECE6]">
          <div>
            <h1 className="text-2xl font-serif-display font-bold text-[#181512]">
              Central de Agentes — Castros Interiores
            </h1>
            <p className="text-xs text-[#6B6257]">
              Configure o papel deste aparelho na operação (Celular, Tablet ou Computador), acione os 3 Agentes de IA Especialistas e personalize as diretrizes técnicas da oficina.
            </p>
          </div>

          {attendances.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-[#181512]">
                Atendimento Alvo dos Agentes:
              </span>
              <select
                value={activeAttendance?.id || ''}
                onChange={(e) => onSelectAttendance(e.target.value)}
                className="rounded-lg border border-[#D6CFC5] bg-[#F9F6F0] px-3 py-1.5 text-xs font-medium text-[#181512]"
              >
                {attendances.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.attendanceNumber} — {formatMissingText(a.clientName)} ({a.furnitureType})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* PART 1: Station Role Modes for the 3 Connected Devices */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-[#181512]">
              1. Modo Operacional deste Aparelho ({stationName} · {deviceFormFactor})
            </h2>
            <span className="text-xs text-[#6B6257]">
              Clique em um posto abaixo para configurar este aparelho e abrir a etapa correspondente
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Posto 1: Agente de Campo / Vistoria (Celular) */}
            <div
              className={`p-4 rounded-xl border transition-all space-y-3 flex flex-col justify-between ${
                deviceFormFactor === 'Celular'
                  ? 'bg-[#FAF6EE] border-[#9A7138]'
                  : 'bg-[#FAF8F5] border-[#E5DEC9]'
              }`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-sm text-[#181512]">
                    <Smartphone className="w-4 h-4 text-[#9A7138]" />
                    <span>Agente de Vistoria (Celular)</span>
                  </div>
                  {deviceFormFactor === 'Celular' && (
                    <span className="text-xs font-semibold text-[#9A7138]">Ativo neste aparelho</span>
                  )}
                </div>
                <p className="text-xs text-[#57534E] leading-relaxed">
                  Focado na coleta de dados do cliente e captura fotográfica pelas 10 categorias (Frente, Costas, Laterais, Assento, Detalhes dos defeitos) com envio automático para a oficina.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  onActivateStationMode(
                    'Celular',
                    'Agente Vistoria Móvel (Celular)',
                    2
                  )
                }
                className="w-full py-2 px-3 rounded-lg bg-[#181512] hover:bg-[#2E2722] text-white text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <Camera className="w-3.5 h-3.5 text-[#9A7138]" />
                Ativar Modo Vistoria & Câmera (Etapa 2)
              </button>
            </div>

            {/* Posto 2: Agente de Bancada / Oficina (Tablet) */}
            <div
              className={`p-4 rounded-xl border transition-all space-y-3 flex flex-col justify-between ${
                deviceFormFactor === 'Tablet'
                  ? 'bg-[#FAF6EE] border-[#9A7138]'
                  : 'bg-[#FAF8F5] border-[#E5DEC9]'
              }`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-sm text-[#181512]">
                    <Tablet className="w-4 h-4 text-[#9A7138]" />
                    <span>Agente de Oficina (Tablet)</span>
                  </div>
                  {deviceFormFactor === 'Tablet' && (
                    <span className="text-xs font-semibold text-[#9A7138]">Ativo neste aparelho</span>
                  )}
                </div>
                <p className="text-xs text-[#57534E] leading-relaxed">
                  Focado na bancada da oficina: revisão técnica dos defeitos por área, foto da estrutura desmontada, teste físico da espuma e aprovação de reaproveitamento.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  onActivateStationMode(
                    'Tablet',
                    'Agente Bancada Oficina (Tablet)',
                    4
                  )
                }
                className="w-full py-2 px-3 rounded-lg bg-[#181512] hover:bg-[#2E2722] text-white text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <Wrench className="w-3.5 h-3.5 text-[#9A7138]" />
                Ativar Modo Bancada & Revisão (Etapa 4)
              </button>
            </div>

            {/* Posto 3: Agente Comercial / Orçamentista (Computador) */}
            <div
              className={`p-4 rounded-xl border transition-all space-y-3 flex flex-col justify-between ${
                deviceFormFactor === 'Computador'
                  ? 'bg-[#FAF6EE] border-[#9A7138]'
                  : 'bg-[#FAF8F5] border-[#E5DEC9]'
              }`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-sm text-[#181512]">
                    <Monitor className="w-4 h-4 text-[#9A7138]" />
                    <span>Agente Comercial (Computador)</span>
                  </div>
                  {deviceFormFactor === 'Computador' && (
                    <span className="text-xs font-semibold text-[#9A7138]">Ativo neste aparelho</span>
                  )}
                </div>
                <p className="text-xs text-[#57534E] leading-relaxed">
                  Focado na montagem das 3 propostas (Essencial, Recomendada e Completa), cálculo de custos internos, definição do preço de venda e emissão dos PDFs A4.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  onActivateStationMode(
                    'Computador',
                    'Agente Comercial Escritório (PC)',
                    6
                  )
                }
                className="w-full py-2 px-3 rounded-lg bg-[#181512] hover:bg-[#2E2722] text-white text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5 text-[#9A7138]" />
                Ativar Modo Proposta & PDF (Etapa 6)
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* PART 2: The 3 Autonomous Gemini Specialist Agents */}
      <section className="rounded-xl bg-white border border-[#E5DEC9] p-6 space-y-5">
        <div className="pb-3 border-b border-[#EFECE6]">
          <h2 className="text-lg font-serif-display font-bold text-[#181512]">
            2. Execução Direta dos 3 Agentes de IA no Atendimento Selecionado
          </h2>
          <p className="text-xs text-[#6B6257]">
            Cada Agente processa os arquivos binários das fotos e os dados reais no servidor e transmite o resultado para o Celular, Tablet e Computador.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Agente IA 1 */}
          <div className="p-5 rounded-xl bg-[#FAF8F5] border border-[#E5DEC9] flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="text-xs font-mono font-semibold text-[#9A7138]">
                AGENTE IA 01 · INSPEÇÃO MULTIMODAL
              </div>
              <h3 className="text-base font-bold text-[#181512]">
                Agente Vistoriador de Defeitos por Área
              </h3>
              <p className="text-xs text-[#57534E] leading-relaxed">
                Analisa as fotografias reais do atendimento e preenche a tabela técnica das <strong>11 áreas obrigatórias</strong> (Estrutura, Base e pés, Assento, Encosto, Braços, Tecido e costuras, Espumas, Percintas/molas, Ferragens, Mecanismos e Forro inferior).
              </p>
            </div>
            <button
              type="button"
              disabled={!activeAttendance || isAnalyzingDefects}
              onClick={onRunDefectsAgent}
              className="w-full py-2.5 px-4 rounded-lg bg-[#9A7138] hover:bg-[#845E2B] disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-2"
            >
              <Play className="w-3.5 h-3.5" />
              {isAnalyzingDefects
                ? 'Agente 01 analisando fotos...'
                : activeAttendance
                ? `Executar Agente 01 em ${activeAttendance.attendanceNumber}`
                : 'Crie um atendimento primeiro'}
            </button>
          </div>

          {/* Agente IA 2 */}
          <div className="p-5 rounded-xl bg-[#FAF8F5] border border-[#E5DEC9] flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="text-xs font-mono font-semibold text-[#9A7138]">
                AGENTE IA 02 · ENGENHARIA DE OFICINA
              </div>
              <h3 className="text-base font-bold text-[#181512]">
                Agente Avaliador de Reaproveitamento
              </h3>
              <p className="text-xs text-[#57534E] leading-relaxed">
                Avalia os <strong>10 componentes do móvel</strong> (Madeiramento, Pés, Espumas, Molas, Percintas, Ferragens, Mecanismos, Almofadas, Enchimentos e Revestimento), exigindo teste físico na bancada e apontando onde há risco de retrabalho.
              </p>
            </div>
            <button
              type="button"
              disabled={!activeAttendance || isAnalyzingReuse}
              onClick={onRunReuseAndProposalsAgent}
              className="w-full py-2.5 px-4 rounded-lg bg-[#1F5E3B] hover:bg-[#184B2F] disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-2"
            >
              <Play className="w-3.5 h-3.5" />
              {isAnalyzingReuse
                ? 'Agente 02 avaliando materiais...'
                : activeAttendance
                ? `Executar Agente 02 em ${activeAttendance.attendanceNumber}`
                : 'Crie um atendimento primeiro'}
            </button>
          </div>

          {/* Agente IA 3 */}
          <div className="p-5 rounded-xl bg-[#FAF8F5] border border-[#E5DEC9] flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="text-xs font-mono font-semibold text-[#9A7138]">
                AGENTE IA 03 · PROPOSTAS & VIABILIDADE
              </div>
              <h3 className="text-base font-bold text-[#181512]">
                Agente Consultor de Propostas e Parecer
              </h3>
              <p className="text-xs text-[#57534E] leading-relaxed">
                Estrutura as <strong>3 Propostas de Reforma</strong> (Essencial, Recomendada e Completa) e redige o <strong>Parecer Técnico e Econômico</strong> em linguagem clara para o cliente e detalhada para o relatório interno.
              </p>
            </div>
            <button
              type="button"
              disabled={!activeAttendance || isAnalyzingReuse}
              onClick={onRunReuseAndProposalsAgent}
              className="w-full py-2.5 px-4 rounded-lg bg-[#181512] hover:bg-[#2E2722] disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-2"
            >
              <Play className="w-3.5 h-3.5" />
              {isAnalyzingReuse
                ? 'Agente 03 gerando propostas...'
                : activeAttendance
                ? `Executar Agente 03 em ${activeAttendance.attendanceNumber}`
                : 'Crie um atendimento primeiro'}
            </button>
          </div>
        </div>
      </section>

      {/* PART 3: On-Demand Specialist Agent Consultation */}
      <section className="rounded-xl bg-white border border-[#E5DEC9] p-6 space-y-5">
        <div className="pb-3 border-b border-[#EFECE6]">
          <h2 className="text-lg font-serif-display font-bold text-[#181512]">
            3. Consultar Agente Especialista Sob Demanda (Com Fotos e Dados do Atendimento)
          </h2>
          <p className="text-xs text-[#6B6257]">
            Escolha qual dos 3 Agentes deseja consultar agora e envie uma tarefa específica ou clique em um comando rápido abaixo.
          </p>
        </div>

        {/* Quick Preset Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-[#181512]">Comandos Rápidos:</span>
          {quickPresets.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setSelectedAgent(preset.agentId);
                handleRunConsult(preset.prompt);
              }}
              disabled={isConsulting}
              className="px-3 py-1.5 rounded-lg border border-[#D8C5A3] bg-[#FAF6EE] hover:bg-[#F3EFE6] text-xs font-medium text-[#181512] transition-colors"
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-4 space-y-2">
            <label className="block text-xs font-semibold text-[#181512]">
              Selecionar Agente Especialista
            </label>
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value as SpecialistAgentId)}
              className="w-full rounded-lg border border-[#D6CFC5] bg-[#FAF8F5] px-3 py-2.5 text-xs font-medium text-[#181512]"
            >
              <option value="julia_marketing">
                Júlia Marketing e Divulgação
              </option>
              <option value="carla_atendimento">
                Carla Atendimento ao Cliente
              </option>
              <option value="pedro_avaliacao">
                Pedro Avaliação Técnica
              </option>
              <option value="ana_compras">
                Ana Compras e Suprimentos
              </option>
              <option value="mila_financeiro">
                Mila Administração Financeira
              </option>
              <option value="vistoriador_defeitos">
                Agente 01 — Vistoriador de Defeitos por Área
              </option>
              <option value="especialista_reaproveitamento">
                Agente 02 — Especialista de Oficina e Reaproveitamento
              </option>
              <option value="consultor_propostas">
                Agente 03 — Consultor de Propostas e Parecer Comercial
              </option>
            </select>
            <p className="text-[11px] text-[#6B6257]">
              {activeAttendance
                ? `Analisando atendimento ${activeAttendance.attendanceNumber} (${activeAttendance.photos.length} foto(s) vinculada(s)).`
                : 'Consulta técnica geral (crie ou selecione um atendimento para incluir fotos).'}
            </p>
          </div>

          <div className="md:col-span-8 space-y-2">
            <label className="block text-xs font-semibold text-[#181512]">
              Solicitação ou Comando para o Agente
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <textarea
                rows={2}
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Ex: Analise as fotos e gere uma explicação técnica para a cliente sobre o estado do assento e braço direito..."
                className="flex-1 rounded-lg border border-[#D6CFC5] px-3 py-2 text-xs"
              />
              <button
                type="button"
                onClick={() => handleRunConsult()}
                disabled={isConsulting || !customPrompt.trim()}
                className="px-5 py-2.5 rounded-lg bg-[#181512] hover:bg-[#2E2722] disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-2 shrink-0"
              >
                <Send className="w-3.5 h-3.5 text-[#9A7138]" />
                {isConsulting ? 'Consultando Agente...' : 'Acionar Agente'}
              </button>
            </div>
          </div>
        </div>

        {consultError && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-700 shrink-0" />
            <span>{consultError}</span>
          </div>
        )}

        {consultResult && (
          <div className="p-5 rounded-xl bg-[#FAF8F5] border border-[#D8C5A3] space-y-4 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5DEC9] pb-3">
              <div className="font-bold text-sm text-[#181512]">
                {consultResult.agentTitle}
              </div>
              {consultResult.usedModel && (
                <span className="font-mono text-[#6B6257]">
                  Modelo: {consultResult.usedModel}
                </span>
              )}
            </div>

            <div className="space-y-1.5">
              <h4 className="font-bold text-[#181512]">Diagnóstico / Parecer do Agente:</h4>
              <p className="text-[#292524] whitespace-pre-line leading-relaxed">
                {consultResult.technicalAnalysis}
              </p>
            </div>

            {Array.isArray(consultResult.recommendedActions) &&
              consultResult.recommendedActions.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="font-bold text-[#181512]">
                    Ações Recomendadas para a Equipe / Oficina:
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-[#292524]">
                    {consultResult.recommendedActions.map((act, i) => (
                      <li key={i}>{act}</li>
                    ))}
                  </ul>
                </div>
              )}

            {consultResult.clientMessageSuggestion && (
              <div className="p-4 rounded-xl bg-white border border-[#E5DEC9] space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-[#181512]">
                    Sugestão de Mensagem Pronta para o Cliente (WhatsApp):
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyClientMessage}
                    className="px-3 py-1 rounded-lg bg-[#181512] hover:bg-[#2E2722] text-white font-semibold flex items-center gap-1.5"
                  >
                    {copiedClientMsg ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copiar Mensagem
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[#292524] whitespace-pre-line leading-relaxed">
                  {consultResult.clientMessageSuggestion}
                </p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* PART 4: Custom Instructions for each of the 3 Specialist Agents */}
      <section className="rounded-xl bg-white border border-[#E5DEC9] p-6 space-y-5">
        <div className="pb-3 border-b border-[#EFECE6]">
          <h2 className="text-lg font-serif-display font-bold text-[#181512]">
            4. Instruções e Regras Personalizadas dos 3 Agentes da Castros Interiores
          </h2>
          <p className="text-xs text-[#6B6257]">
            Adicione critérios próprios da sua oficina para que cada Agente siga sempre que analisar fotos, avaliar reaproveitamento ou montar propostas.
          </p>
        </div>

        <form onSubmit={handleSaveAgentRules} className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#181512]">
                Regras Extras — Agente 01 (Vistoriador de Defeitos)
              </label>
              <textarea
                rows={4}
                value={localSettings.defectAgentCustomInstructions || ''}
                onChange={(e) =>
                  setLocalSettings({
                    ...localSettings,
                    defectAgentCustomInstructions: e.target.value,
                  })
                }
                placeholder="Ex: Sempre destacar se o sofá possui almofadas soltas ou fixas e se há vivo/debrum nas costuras dos braços..."
                className="w-full rounded-lg border border-[#D6CFC5] p-3 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#181512]">
                Regras Extras — Agente 02 (Especialista em Reaproveitamento)
              </label>
              <textarea
                rows={4}
                value={localSettings.reuseAgentCustomInstructions || ''}
                onChange={(e) =>
                  setLocalSettings({
                    ...localSettings,
                    reuseAgentCustomInstructions: e.target.value,
                  })
                }
                placeholder="Ex: Em sofás com mais de 5 anos de uso residencial, recomendar substituição preventiva das percintas elásticas do assento..."
                className="w-full rounded-lg border border-[#D6CFC5] p-3 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#181512]">
                Regras Extras — Agente 03 (Consultor de Propostas e Parecer)
              </label>
              <textarea
                rows={4}
                value={localSettings.proposalAgentCustomInstructions || ''}
                onChange={(e) =>
                  setLocalSettings({
                    ...localSettings,
                    proposalAgentCustomInstructions: e.target.value,
                  })
                }
                placeholder="Ex: Na Proposta Completa, sempre incluir aplicação de manta acrílica siliconada e impermeabilização opcional..."
                className="w-full rounded-lg border border-[#D6CFC5] p-3 text-xs"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-2">
            <span className="text-xs text-[#6B6257]">
              {savedRulesSuccess
                ? 'Diretrizes dos 3 Agentes salvas e sincronizadas em todos os aparelhos!'
                : 'As regras essenciais de segurança técnica (não afirmar estrutura boa sem abrir, não inventar preços/medidas) permanecem sempre ativas.'}
            </span>
            <button
              type="submit"
              disabled={isSavingSettings}
              className="px-5 py-2.5 rounded-lg bg-[#181512] hover:bg-[#2E2722] text-white text-xs font-semibold flex items-center gap-2"
            >
              <Save className="w-3.5 h-3.5 text-[#9A7138]" />
              {isSavingSettings ? 'Salvando...' : 'Salvar Diretrizes dos Agentes'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};
