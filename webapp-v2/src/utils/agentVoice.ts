import { AgentVoiceConfig, DepartmentId } from '../types';

// Utilitário único de voz por agente, usado por toda tela que faz o app falar
// (chat de mesa, Júlia, etc.) — antes cada tela tinha sua própria lógica de
// limpeza/seleção de voz, e a da Júlia nunca lia a configuração salva por mesa.
// Esse arquivo existe pra isso nunca mais divergir.

// Sugestão de gênero por mesa — usada só para pré-selecionar uma aba na escolha
// de voz; quem decide de fato é o humano ao ouvir a amostra e salvar, nunca uma
// inferência automática a partir do nome da SpeechSynthesisVoice (a Web Speech
// API não informa gênero de verdade — ver KNOWN_VOICE_GENDER_HINTS abaixo).
export const DESK_SUGGESTED_GENDER: Record<DepartmentId, 'feminina' | 'masculina'> = {
  carla_atendimento: 'feminina',
  mila_financeiro: 'feminina',
  julia_marketing: 'feminina',
  ana_compras: 'feminina',
  supervisora_geral: 'feminina',
  pedro_avaliacao: 'masculina',
  lucas_projetos: 'masculina',
  castro_estrategia: 'masculina',
  tapeceiro_tecnico: 'masculina',
};

// A Web Speech API não expõe gênero da voz. Esta tabela é uma pista best-effort
// só para as vozes em português conhecidas de verdade (nomes reais documentados
// do Windows/Edge SAPI/Azure Neural, Google Chrome e Apple) — nunca um palpite
// genérico a partir de qualquer nome desconhecido. Voz fora desta lista entra no
// grupo "gênero não identificado" e só é usada se não houver nenhuma voz
// conhecida do gênero certo disponível no aparelho.
const KNOWN_VOICE_GENDER_HINTS: Record<string, 'feminina' | 'masculina'> = {
  // Microsoft / Edge (vozes neurais pt-BR do Windows e do Edge)
  maria: 'feminina',
  francisca: 'feminina',
  giovanna: 'feminina',
  leila: 'feminina',
  leticia: 'feminina',
  manuela: 'feminina',
  yara: 'feminina',
  brenda: 'feminina',
  elza: 'feminina',
  daniel: 'masculina',
  antonio: 'masculina',
  antónio: 'masculina',
  humberto: 'masculina',
  julio: 'masculina',
  júlio: 'masculina',
  nicolau: 'masculina',
  valerio: 'masculina',
  valério: 'masculina',
  // Apple (macOS/iOS/Safari)
  luciana: 'feminina',
  felipe: 'masculina',
  // Google (Chrome/Android) — nomes de voz variam, mas o rótulo costuma trazer
  // "português do Brasil" sem distinguir pessoa; sem pista de gênero confiável.
};

function guessVoiceGender(voiceName: string): 'feminina' | 'masculina' | undefined {
  const lower = voiceName.toLowerCase();
  for (const [knownName, gender] of Object.entries(KNOWN_VOICE_GENDER_HINTS)) {
    if (lower.includes(knownName)) return gender;
  }
  return undefined;
}

function isPortugueseVoice(v: SpeechSynthesisVoice): boolean {
  return v.lang.toLowerCase().startsWith('pt');
}

// Atribuição automática: quando a mesa não tem voz salva manualmente, escolhe uma
// voz distinta por mesa (não a mesma "primeira voz pt-BR" pra todo mundo, que era
// o bug original). Reparte o grupo de vozes do gênero certo entre as mesas desse
// gênero de forma determinística, pra duas mesas só dividirem a mesma voz quando
// o aparelho realmente não tiver vozes distintas o bastante.
function autoAssignVoice(
  deskId: DepartmentId,
  voices: SpeechSynthesisVoice[]
): SpeechSynthesisVoice | undefined {
  if (voices.length === 0) return undefined;
  const desiredGender = DESK_SUGGESTED_GENDER[deskId];
  const ptVoices = voices.filter(isPortugueseVoice);
  const pool = ptVoices.length > 0 ? ptVoices : voices;

  const matching = pool.filter((v) => guessVoiceGender(v.name) === desiredGender);
  const unknown = pool.filter((v) => guessVoiceGender(v.name) === undefined);
  const candidates = matching.length > 0 ? matching : unknown.length > 0 ? unknown : pool;

  const sorted = [...candidates].sort((a, b) => a.name.localeCompare(b.name));
  const allDesksSameGender = (Object.keys(DESK_SUGGESTED_GENDER) as DepartmentId[])
    .filter((id) => DESK_SUGGESTED_GENDER[id] === desiredGender)
    .sort();
  const positionAmongSameGender = allDesksSameGender.indexOf(deskId);
  const index = positionAmongSameGender >= 0 ? positionAmongSameGender % sorted.length : 0;
  return sorted[index];
}

export function pickVoiceForDesk(
  deskId: DepartmentId,
  voices: SpeechSynthesisVoice[],
  savedConfig?: AgentVoiceConfig | null
): SpeechSynthesisVoice | undefined {
  if (savedConfig) {
    const saved = voices.find((v) => v.voiceURI === savedConfig.voiceURI);
    if (saved) return saved;
  }
  return autoAssignVoice(deskId, voices);
}

// Limpeza de texto pra fala natural: remove marcação/formatação e links que não
// fazem sentido lidos em voz alta, mas preserva com precisão valores, medidas,
// datas e qualquer número do pedido (nunca mexe em dígitos/moeda/unidades).
export function cleanTextForSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, ' ') // blocos de código inteiros
    .replace(/`{1,3}/g, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/_{2,}/g, '')
    .replace(/#{1,6}\s?/g, '')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1') // link markdown -> só o texto do link
    .replace(/https?:\/\/\S+/gi, 'o link enviado') // URL crua inteira
    .replace(/^\s*[-*•]\s+/gm, '') // marcador de lista
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ', ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// Token global: window.speechSynthesis é um único recurso compartilhado pela
// página inteira, então "cancelar minha fala" não basta quando o usuário troca
// de mesa — é preciso um sinal global pra qualquer utterance em voo (de QUALQUER
// componente) se descartar sozinha, mesmo que o cancel() já tenha sido chamado.
let currentSpeechToken = 0;

export function stopAllAgentSpeech() {
  currentSpeechToken++;
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

export interface SpeakAsAgentParams {
  deskId: DepartmentId;
  text: string;
  savedConfig?: AgentVoiceConfig | null;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: () => void;
}

// Fala como um agente específico: limpa o texto, escolhe a voz certa (salva ou
// atribuída automaticamente) e aplica rate/pitch salvos — usado por toda tela que
// faz o app falar, pra nunca mais existir uma segunda implementação divergente
// (era exatamente o bug da Júlia).
export function speakAsAgent(params: SpeakAsAgentParams): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    params.onError?.();
    return;
  }
  const cleanText = cleanTextForSpeech(params.text);
  if (!cleanText) return;

  const myToken = ++currentSpeechToken;
  window.speechSynthesis.cancel();

  const voices = window.speechSynthesis.getVoices();
  const chosenVoice = pickVoiceForDesk(params.deskId, voices, params.savedConfig);

  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.lang = chosenVoice?.lang || 'pt-BR';
  utterance.rate = params.savedConfig?.rate ?? 1.05;
  utterance.pitch = params.savedConfig?.pitch ?? 1.0;
  if (chosenVoice) utterance.voice = chosenVoice;

  utterance.onstart = () => {
    if (myToken !== currentSpeechToken) return; // fala atrasada de uma mesa já trocada — descarta
    params.onStart?.();
  };
  utterance.onend = () => {
    if (myToken !== currentSpeechToken) return;
    params.onEnd?.();
  };
  utterance.onerror = () => {
    if (myToken !== currentSpeechToken) return;
    params.onError?.();
  };

  window.speechSynthesis.speak(utterance);
}
