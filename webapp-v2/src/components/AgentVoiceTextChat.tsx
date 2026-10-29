import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Square,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  ShieldAlert,
  ArrowRight,
  MessageSquare,
  User,
  Bot,
} from 'lucide-react';
import { DepartmentId, AgentChatMessage, AgentActionProposal } from '../types';
import { AgentPortrait } from './AgentPortrait';

interface AgentVoiceTextChatProps {
  deskId: DepartmentId;
  agentName: string;
  agentRole: string;
  portraitUpdatedAt?: string;
  attendanceId?: string;
  attendanceNumber?: string;
  campaignId?: string;
  campaignName?: string;
  suggestedQuestions?: string[];
  onActionExecuted?: (action: AgentActionProposal) => void;
  className?: string;
}

export const AgentVoiceTextChat: React.FC<AgentVoiceTextChatProps> = ({
  deskId,
  agentName,
  agentRole,
  portraitUpdatedAt,
  attendanceId,
  attendanceNumber,
  campaignId,
  campaignName,
  suggestedQuestions = [],
  onActionExecuted,
  className = '',
}) => {
  const [messages, setMessages] = useState<AgentChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [statusState, setStatusState] = useState<'idle' | 'enviando' | 'processando' | 'concluido' | 'falha'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastFailedMessage, setLastFailedMessage] = useState<{ text: string; modality: 'texto' | 'voz' } | null>(null);

  // Voz & Áudio
  const [voiceMode, setVoiceMode] = useState<'revisar' | 'conversa'>('revisar');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceSpeechEnabled, setVoiceSpeechEnabled] = useState(true);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);

  // Execução de ação estruturada
  const [executingActionId, setExecutingActionId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(typeof window !== 'undefined' ? window.speechSynthesis : null);
  // Garante no máximo um envio por sessão de reconhecimento de fala (evita mensagens
  // duplicadas quando o navegador segmenta uma fala longa em mais de um resultado "final").
  const sentThisSessionRef = useRef(false);

  const draftStorageKey = `draft_${deskId}_${attendanceId || 'gen'}`;

  // Carregar rascunho salvo se existir
  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem(draftStorageKey);
      if (savedDraft) {
        setInputText(savedDraft);
      }
    } catch {
      // ignore
    }
  }, [draftStorageKey]);

  // Salvar rascunho conforme o usuário digita
  const handleInputChange = (val: string) => {
    setInputText(val);
    try {
      localStorage.setItem(draftStorageKey, val);
    } catch {
      // ignore
    }
  };

  // Carregar histórico persistente do agente
  const loadChatHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const params = new URLSearchParams({
        deskId,
        ...(attendanceId ? { attendanceId } : {}),
        ...(campaignId ? { campaignId } : {}),
      });
      const res = await fetch(`/api/chat/history?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.ok && Array.isArray(data.messages)) {
          setMessages(data.messages);
        }
      }
    } catch (err) {
      console.warn('Histórico ainda não disponível no servidor, inicializando local:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadChatHistory();
  }, [deskId, attendanceId, campaignId]);

  // Sair do modo "Conversa Contínua" encerra o ciclo de escuta/fala imediatamente,
  // para que trocar de modo funcione como um "encerrar" explícito do loop de voz.
  useEffect(() => {
    if (voiceMode !== 'conversa') {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      setIsListening(false);
      if (synthRef.current) {
        synthRef.current.cancel();
      }
      setIsSpeaking(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceMode]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending, statusState]);

  // Parar fala do sintetizador imediatamente
  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    setIsSpeaking(false);
  };

  // Falar texto em voz alta com sintetizador em português do Brasil
  const speakTextInPortuguese = (text: string) => {
    if (!voiceSpeechEnabled) return;
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      setVoiceNotice('Este navegador não tem suporte a síntese de voz — a resposta só aparece em texto.');
      return;
    }

    stopSpeaking();

    // Limpar markdown e asteriscos para dicção limpa
    const cleanText = text
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/#{1,6}\s?/g, '')
      .replace(/`{1,3}/g, '')
      .trim();

    if (!cleanText) return;

    try {
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'pt-BR';
      utterance.rate = 1.05;
      utterance.pitch = 1.0;

      // Selecionar voz em português se disponível
      const voices = window.speechSynthesis.getVoices();
      const ptVoice = voices.find((v) => v.lang.includes('pt-BR') || v.lang.includes('pt'));
      if (ptVoice) {
        utterance.voice = ptVoice;
      }

      utterance.onstart = () => {
        setIsSpeaking(true);
        // Prevenir eco: interrompe reconhecimento se estiver ativo
        if (isListening && recognitionRef.current) {
          try {
            recognitionRef.current.stop();
          } catch {
            // ignore
          }
          setIsListening(false);
        }
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        // No modo conversa contínua, reativa a escuta para o próximo turno
        if (voiceMode === 'conversa') {
          setTimeout(() => {
            startListening();
          }, 400);
        }
      };

      utterance.onerror = () => {
        setIsSpeaking(false);
      };

      synthRef.current?.speak(utterance);
    } catch (err) {
      console.warn('Erro ao reproduzir síntese de voz:', err);
      setIsSpeaking(false);
    }
  };

  // Iniciar captura de voz via SpeechRecognition
  const startListening = () => {
    stopSpeaking();
    setVoiceNotice(null);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRec) {
      setVoiceNotice('Reconhecimento de fala não suportado neste navegador. Digite sua mensagem no campo de texto.');
      return;
    }

    try {
      const recognition = new SpeechRec();
      recognition.lang = 'pt-BR';
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceNotice(null);
        sentThisSessionRef.current = false;
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }

        const spokenText = (final || interim).trim();

        if (spokenText) {
          if (voiceMode === 'revisar') {
            // Preenche o input para o usuário revisar e editar antes de enviar
            handleInputChange(spokenText);
          } else if (final && voiceMode === 'conversa' && !sentThisSessionRef.current) {
            // Modo conversa contínua: envia automaticamente ao término da fala.
            // Trava o envio aqui: se o navegador emitir mais de um resultado "final"
            // para a mesma sessão de escuta, os próximos são ignorados.
            sentThisSessionRef.current = true;
            handleInputChange('');
            handleSendMessage(final.trim(), 'voz');
            try {
              recognition.stop();
            } catch {
              // ignore
            }
          }
        }
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onerror = (event: any) => {
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setVoiceNotice('Permissão de microfone negada. Conceda permissão no navegador ou continue por texto.');
        } else if (event.error === 'no-speech') {
          setVoiceNotice('Nenhuma fala detectada. Clique no microfone para falar novamente.');
        } else {
          setVoiceNotice(`Aviso no microfone (${event.error || 'indisponível'}). Digite sua mensagem abaixo.`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      setIsListening(false);
      setVoiceNotice('Não foi possível iniciar o microfone. Prossiga digitando a mensagem.');
      console.warn('Erro ao acionar SpeechRecognition:', err);
    }
  };

  // Parar captura de voz
  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    setIsListening(false);
  };

  // Enviar mensagem por texto ou voz
  const handleSendMessage = async (textToSend?: string, modality: 'texto' | 'voz' = 'texto') => {
    const messageContent = (textToSend ?? inputText).trim();
    if (!messageContent || isSending) return;

    stopSpeaking();
    stopListening();

    setIsSending(true);
    setStatusState('enviando');
    setErrorMessage(null);
    setLastFailedMessage(null);

    // Adiciona otimisticamente a mensagem do usuário
    const optimisticUserMsg: AgentChatMessage = {
      id: `usr-${Date.now()}`,
      deskId,
      sender: 'user',
      agentName: 'Você',
      text: messageContent,
      modality,
      timestamp: new Date().toISOString(),
      attendanceId,
      campaignId,
    };

    setMessages((prev) => [...prev, optimisticUserMsg]);

    // Limpa input e rascunho
    if (!textToSend) {
      setInputText('');
      try {
        localStorage.removeItem(draftStorageKey);
      } catch {
        // ignore
      }
    }

    setStatusState('processando');

    try {
      const res = await fetch('/api/chat/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deskId,
          text: messageContent,
          modality,
          attendanceId,
          campaignId,
          history: messages.slice(-8).map((m) => ({
            sender: m.sender,
            text: m.text,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Erro ao processar mensagem com o agente.');
      }

      // Adiciona resposta do agente
      const agentMsg: AgentChatMessage = data.agentMessage || {
        id: `agt-${Date.now()}`,
        deskId,
        sender: 'agent',
        agentName,
        text: data.replyText || 'Orientação registrada com sucesso.',
        modality,
        timestamp: new Date().toISOString(),
        attendanceId,
        campaignId,
        actionProposal: data.actionProposal,
      };

      setMessages((prev) => [...prev, agentMsg]);
      setStatusState('concluido');

      // Se síntese habilitada, ler resposta em voz alta
      if (voiceSpeechEnabled && agentMsg.text) {
        speakTextInPortuguese(agentMsg.text);
      }
    } catch (err) {
      console.error('Falha na comunicação com o agente:', err);
      const errText = err instanceof Error ? err.message : 'Falha na comunicação com o agente.';
      setErrorMessage(errText);
      setStatusState('falha');
      setLastFailedMessage({ text: messageContent, modality });

      // Preserva o rascunho no input caso tenha falhado
      if (!textToSend) {
        handleInputChange(messageContent);
      }
    } finally {
      setIsSending(false);
    }
  };

  // Tentar novamente a mensagem com falha sem duplicar
  const handleRetry = () => {
    if (!lastFailedMessage) return;
    // Remove a mensagem do usuário que falhou para reenviar limpamente
    setMessages((prev) => prev.slice(0, -1));
    handleSendMessage(lastFailedMessage.text, lastFailedMessage.modality);
  };

  // Confirmar e executar ação estruturada proposta pelo agente
  const handleConfirmAction = async (msgId: string, action: AgentActionProposal) => {
    setExecutingActionId(action.id);
    try {
      const res = await fetch('/api/chat/execute-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId: msgId,
          deskId,
          action,
          attendanceId,
          responsibleName: 'Operador Central',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Erro ao executar ação.');
      }

      // Atualiza visualmente na mensagem
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id === msgId && m.actionProposal) {
            return {
              ...m,
              actionProposal: {
                ...m.actionProposal,
                confirmed: true,
                executedAt: new Date().toISOString(),
                executedBy: 'Operador Central',
              },
            };
          }
          return m;
        })
      );

      if (onActionExecuted) {
        onActionExecuted(action);
      }

      // Adiciona mensagem de confirmação do agente
      const confirmAgtMsg: AgentChatMessage = {
        id: `agt-conf-${Date.now()}`,
        deskId,
        sender: 'agent',
        agentName,
        text: `Ação "${action.title}" executada com sucesso e registrada no histórico da Castros Interiores.`,
        modality: 'texto',
        timestamp: new Date().toISOString(),
        attendanceId,
      };
      setMessages((prev) => [...prev, confirmAgtMsg]);

      if (voiceSpeechEnabled) {
        speakTextInPortuguese(confirmAgtMsg.text);
      }
    } catch (err) {
      alert(`Falha ao executar ação: ${err instanceof Error ? err.message : 'Erro interno'}`);
    } finally {
      setExecutingActionId(null);
    }
  };

  return (
    <div className={`flex flex-col bg-white rounded-xl border border-[#E5DEC9] shadow-sm overflow-hidden ${className}`}>
      {/* Cabeçalho do Chat */}
      <div className="bg-[#181512] text-[#F9F6F0] p-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#2E2722]">
        <div className="flex items-center gap-3">
          <AgentPortrait deskId={deskId} name={agentName} portraitUpdatedAt={portraitUpdatedAt} size="sm" />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-serif-display font-bold text-sm text-white">{agentName}</h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#2E2722] text-[#E5DEC9] border border-[#57534E]">
                {agentRole}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-[#9A7138]/20 text-[#D8C5A3] border border-[#9A7138]/40">
                Assistente virtual
              </span>
            </div>
            <p className="text-[11px] text-[#A8A29E] mt-0.5">
              {attendanceNumber ? (
                <>Vinculado ao Pedido: <strong className="text-white">{attendanceNumber}</strong></>
              ) : campaignName ? (
                <>Campanha Ativa: <strong className="text-white">{campaignName}</strong></>
              ) : (
                <>Consulta Geral da Mesa</>
              )}
            </p>
          </div>
        </div>

        {/* Controles de Áudio e Modo de Voz */}
        <div className="flex items-center gap-2">
          {/* Alternar modo de voz */}
          <div className="flex items-center bg-[#2E2722] rounded-lg p-0.5 text-[11px] border border-[#57534E]">
            <button
              type="button"
              onClick={() => setVoiceMode('revisar')}
              className={`px-2 py-1 rounded transition-colors ${
                voiceMode === 'revisar' ? 'bg-[#9A7138] text-white font-semibold' : 'text-[#A8A29E] hover:text-white'
              }`}
              title="Transcreve a voz no campo para você revisar e editar antes de enviar"
            >
              Revisar Fala
            </button>
            <button
              type="button"
              onClick={() => setVoiceMode('conversa')}
              className={`px-2 py-1 rounded transition-colors ${
                voiceMode === 'conversa' ? 'bg-[#9A7138] text-white font-semibold' : 'text-[#A8A29E] hover:text-white'
              }`}
              title="Modo conversa fluida: envia automaticamente após a fala e responde em voz alta"
            >
              Conversa Contínua
            </button>
          </div>

          {/* Encerrar o ciclo de conversa contínua (volta pro modo Revisar Fala e para tudo) */}
          {voiceMode === 'conversa' && (
            <button
              type="button"
              onClick={() => setVoiceMode('revisar')}
              className="px-2.5 py-1.5 rounded-lg bg-[#2E2722] hover:bg-[#3D352E] border border-[#57534E] text-[#E5DEC9] text-[11px] font-semibold flex items-center gap-1"
              title="Encerrar a conversa contínua (para a escuta e a fala em andamento)"
            >
              Encerrar Conversa
            </button>
          )}

          {/* Ativar/Silenciar voz do agente */}
          <button
            type="button"
            onClick={() => {
              if (isSpeaking) stopSpeaking();
              setVoiceSpeechEnabled((prev) => !prev);
            }}
            className={`p-2 rounded-lg border text-xs flex items-center gap-1.5 transition-colors ${
              voiceSpeechEnabled
                ? 'bg-[#2E2722] border-[#9A7138] text-[#E5DEC9]'
                : 'bg-[#2E2722] border-[#57534E] text-[#78716C]'
            }`}
            title={voiceSpeechEnabled ? 'Síntese de voz ativa (clique para silenciar)' : 'Síntese de voz silenciada (clique para ouvir respostas)'}
          >
            {voiceSpeechEnabled ? <Volume2 className="w-3.5 h-3.5 text-[#D8C5A3]" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          {/* Botão Parar Reprodução */}
          {isSpeaking && (
            <button
              type="button"
              onClick={stopSpeaking}
              className="px-2.5 py-1.5 rounded-lg bg-red-800 hover:bg-red-700 text-white text-[11px] font-semibold flex items-center gap-1 shadow animate-pulse"
              title="Interromper fala do agente agora"
            >
              <Square className="w-3 h-3 fill-current" />
              <span>Reproduzindo... Parar Fala</span>
            </button>
          )}
        </div>
      </div>

      {/* Aviso de voz / Microfone */}
      {voiceNotice && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
            <span>{voiceNotice}</span>
          </div>
          <button type="button" onClick={() => setVoiceNotice(null)} className="text-amber-800 font-bold hover:underline">
            ✕
          </button>
        </div>
      )}

      {/* Área de Mensagens / Histórico */}
      <div className="flex-1 min-h-[260px] max-h-[380px] overflow-y-auto p-4 space-y-3 bg-[#FAF8F5]">
        {isLoadingHistory && (
          <div className="flex items-center justify-center py-6 text-xs text-[#78716C] gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-[#9A7138]" />
            <span>Carregando histórico do agente...</span>
          </div>
        )}

        {!isLoadingHistory && messages.length === 0 && (
          <div className="text-center py-8 px-4 space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#EFECE6] text-[#9A7138] flex items-center justify-center mx-auto shadow-inner">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#181512]">
                Converse por texto ou voz com {agentName}
              </p>
              <p className="text-[11px] text-[#78716C] max-w-sm mx-auto mt-0.5">
                {agentName} consulta dados reais de pedidos, peças, campanhas e compras da oficina. Pergunte sobre andamento, orçamentos, insumos ou solicite pareceres.
              </p>
            </div>

            {suggestedQuestions.length > 0 && (
              <div className="pt-2 flex flex-wrap justify-center gap-1.5 max-w-md mx-auto">
                {suggestedQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(q, 'texto')}
                    className="px-2.5 py-1 rounded-full text-[11px] bg-white border border-[#D6CFC5] hover:border-[#9A7138] text-[#57534E] hover:text-[#181512] transition-colors shadow-sm text-left"
                  >
                    💬 {q}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Lista de Mensagens */}
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1`}
            >
              <div className="flex items-center gap-1.5 text-[10px] text-[#78716C] px-1">
                <span className="font-semibold text-[#181512]">{msg.agentName}</span>
                <span>·</span>
                <span>{msg.modality === 'voz' ? '🎙️ Voz' : '⌨️ Texto'}</span>
                <span>·</span>
                <span className="tabular-nums">
                  {new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
                {!isUser && voiceSpeechEnabled && (
                  <button
                    type="button"
                    onClick={() => speakTextInPortuguese(msg.text)}
                    className="ml-1 text-[#9A7138] hover:underline flex items-center gap-0.5 font-medium"
                    title="Ouvir em voz alta"
                  >
                    <Volume2 className="w-3 h-3" />
                    <span>Ouvir</span>
                  </button>
                )}
              </div>

              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed whitespace-pre-line shadow-sm ${
                  isUser
                    ? 'bg-[#181512] text-[#F9F6F0] rounded-tr-none'
                    : 'bg-white text-[#181512] border border-[#E5DEC9] rounded-tl-none'
                }`}
              >
                {msg.text}

                {/* Proposta de Ação Estruturada do Agente */}
                {msg.actionProposal && (
                  <div className="mt-3 p-3 rounded-xl bg-[#FAF8F5] border border-[#D6CFC5] text-left space-y-2 text-[#181512]">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#9A7138]">
                      <Sparkles className="w-4 h-4 text-[#9A7138]" />
                      <span>{msg.actionProposal.title}</span>
                    </div>
                    <p className="text-[11px] text-[#57534E] leading-normal">{msg.actionProposal.description}</p>

                    {msg.actionProposal.confirmed ? (
                      <div className="p-2 rounded bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] flex items-center gap-1.5 font-semibold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Ação confirmada e registrada ({new Date(msg.actionProposal.executedAt || '').toLocaleTimeString('pt-BR')})</span>
                      </div>
                    ) : (
                      <div className="pt-1 flex items-center gap-2">
                        <button
                          type="button"
                          disabled={executingActionId === msg.actionProposal.id}
                          onClick={() => handleConfirmAction(msg.id, msg.actionProposal!)}
                          className="px-3.5 py-1.5 rounded-lg bg-[#9A7138] hover:bg-[#845E2B] text-white font-semibold text-xs flex items-center gap-1.5 shadow"
                        >
                          {executingActionId === msg.actionProposal.id ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Executando...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Confirmar Ação</span>
                            </>
                          )}
                        </button>
                        <span className="text-[10px] text-[#78716C] italic">Exige validação do responsável</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Indicadores de Processamento / Envio */}
        {statusState === 'processando' && (
          <div className="flex items-center gap-2 p-3 bg-white rounded-xl border border-[#E5DEC9] text-xs text-[#57534E] w-fit shadow-sm">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#9A7138]" />
            <span>{agentName} está consultando dados reais e formulando resposta...</span>
          </div>
        )}

        {/* Banner de Erro com Tentar Novamente */}
        {statusState === 'falha' && errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 space-y-2">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-700 shrink-0" />
              <span className="font-semibold">{errorMessage}</span>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleRetry}
                className="px-3 py-1 rounded bg-red-800 hover:bg-red-700 text-white font-semibold flex items-center gap-1 text-[11px] shadow-sm"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Tentar Novamente</span>
              </button>
              <span className="text-[11px] text-red-700">Seu texto foi preservado e nenhuma tarefa foi duplicada.</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Barra de Entrada de Voz e Texto */}
      <div className="p-3 bg-white border-t border-[#EFECE6] space-y-2">
        {/* Indicador quando o microfone está ouvindo */}
        {isListening && (
          <div className="p-2 rounded-lg bg-red-50 border border-red-200 flex items-center justify-between text-xs text-red-900 animate-pulse">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
              <span className="font-semibold">Ouvindo sua fala em português... Fale agora</span>
            </div>
            <button
              type="button"
              onClick={stopListening}
              className="px-2 py-0.5 rounded bg-red-800 text-white text-[10px] font-bold uppercase"
            >
              Concluir Fala
            </button>
          </div>
        )}

        <div className="flex items-end gap-2">
          {/* Botão Microfone */}
          <button
            type="button"
            onClick={isListening ? stopListening : startListening}
            className={`p-2.5 rounded-xl text-xs font-semibold flex items-center justify-center shrink-0 transition-colors shadow-sm ${
              isListening
                ? 'bg-red-700 hover:bg-red-800 text-white animate-pulse ring-2 ring-red-400'
                : 'bg-[#FAF8F5] hover:bg-[#EFECE6] border border-[#D6CFC5] text-[#181512]'
            }`}
            title={isListening ? 'Clique para encerrar a escuta' : 'Clique para falar por voz em português'}
          >
            {isListening ? <MicOff className="w-5 h-5 text-white" /> : <Mic className="w-5 h-5 text-[#9A7138]" />}
          </button>

          {/* Campo de Texto com Enter para Enviar e Shift+Enter para nova linha */}
          <div className="flex-1 relative">
            <textarea
              rows={2}
              value={inputText}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={`Mensagem para ${agentName}... (Enter envia, Shift+Enter pula linha)`}
              className="w-full rounded-xl border border-[#D6CFC5] p-2.5 text-xs text-[#181512] focus:ring-1 focus:ring-[#9A7138] focus:border-[#9A7138] outline-none resize-none bg-[#FAF8F5]"
            />
          </div>

          {/* Botão Enviar */}
          <button
            type="button"
            onClick={() => handleSendMessage()}
            disabled={isSending || !inputText.trim()}
            className="p-2.5 rounded-xl bg-[#181512] hover:bg-[#2E2722] disabled:opacity-40 text-white font-semibold text-xs flex items-center justify-center shrink-0 shadow transition-colors"
            title="Enviar mensagem (Enter)"
          >
            {isSending ? (
              <RefreshCw className="w-5 h-5 animate-spin text-[#D8C5A3]" />
            ) : (
              <Send className="w-5 h-5 text-[#D8C5A3]" />
            )}
          </button>
        </div>

        {/* Rodapé explicativo */}
        <div className="flex justify-between items-center text-[10px] text-[#78716C] px-1">
          <span>Modo atual: <strong>{voiceMode === 'revisar' ? 'Revisar fala antes de enviar' : 'Conversa contínua fluida'}</strong></span>
          <span>Histórico persistente salvo no sistema</span>
        </div>
      </div>
    </div>
  );
};
