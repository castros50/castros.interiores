import React, { useEffect, useState } from 'react';
import { Volume2 } from 'lucide-react';
import { AgentVoiceConfig, DepartmentId } from '../types';
import { OFFICE_DESKS } from '../utils/officeDefaults';
import { DESK_SUGGESTED_GENDER, pickVoiceForDesk, speakAsAgent, stopAllAgentSpeech } from '../utils/agentVoice';

// Tela central de voz dos agentes (Configurações): lista as 9 mesas, mostra se
// cada uma tem voz salva manualmente ou está usando a atribuição automática
// (voz distinta por mesa, nunca a mesma voz genérica para todo mundo), e deixa
// ouvir/ajustar/salvar cada uma — tudo lendo e escrevendo a mesma configuração
// usada de fato na fala (src/utils/agentVoice.ts), nunca uma cópia paralela.
export const AgentVoiceSettingsPanel: React.FC = () => {
  const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [savedConfigs, setSavedConfigs] = useState<Partial<Record<DepartmentId, AgentVoiceConfig>>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Seleções em edição por mesa, antes de salvar — nascem vazias; quando vazias,
  // a prévia e o "Ouvir exemplo" usam a atribuição automática (nunca uma voz
  // fixa única), exatamente como a fala real resolve a voz na ausência de config salva.
  const [draftVoiceURI, setDraftVoiceURI] = useState<Partial<Record<DepartmentId, string>>>({});
  const [draftRate, setDraftRate] = useState<Partial<Record<DepartmentId, number>>>({});
  const [draftPitch, setDraftPitch] = useState<Partial<Record<DepartmentId, number>>>({});
  const [savingDeskId, setSavingDeskId] = useState<DepartmentId | null>(null);
  const [noticeByDesk, setNoticeByDesk] = useState<Partial<Record<DepartmentId, string>>>({});

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const loadVoices = () => setBrowserVoices(window.speechSynthesis.getVoices());
    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/agent-voice-settings');
        if (!res.ok) throw new Error('Falha ao carregar configurações de voz.');
        const data = await res.json();
        if (active) setSavedConfigs(data?.agentVoiceSettings || {});
      } catch {
        if (active) setLoadError('Não foi possível carregar as vozes salvas agora. Tente recarregar a página.');
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const getEffectiveVoiceURI = (deskId: DepartmentId): string => {
    if (draftVoiceURI[deskId] !== undefined) return draftVoiceURI[deskId] as string;
    if (savedConfigs[deskId]) return savedConfigs[deskId]!.voiceURI;
    return pickVoiceForDesk(deskId, browserVoices)?.voiceURI || '';
  };
  const getEffectiveRate = (deskId: DepartmentId): number =>
    draftRate[deskId] ?? savedConfigs[deskId]?.rate ?? 1.05;
  const getEffectivePitch = (deskId: DepartmentId): number =>
    draftPitch[deskId] ?? savedConfigs[deskId]?.pitch ?? 1.0;

  const handleTest = (deskId: DepartmentId) => {
    const voiceURI = getEffectiveVoiceURI(deskId);
    const voice = browserVoices.find((v) => v.voiceURI === voiceURI);
    const desk = OFFICE_DESKS.find((d) => d.id === deskId);
    stopAllAgentSpeech();
    speakAsAgent({
      deskId,
      text: `Olá! Eu sou ${desk?.name || deskId}, da Castros Interiores. Esta é a minha voz.`,
      savedConfig: voice
        ? {
            voiceURI: voice.voiceURI,
            voiceName: voice.name,
            lang: voice.lang,
            rate: getEffectiveRate(deskId),
            pitch: getEffectivePitch(deskId),
            updatedAt: '',
          }
        : null,
    });
  };

  const handleSave = async (deskId: DepartmentId) => {
    const voiceURI = getEffectiveVoiceURI(deskId);
    const voice = browserVoices.find((v) => v.voiceURI === voiceURI);
    if (!voice) {
      setNoticeByDesk((prev) => ({ ...prev, [deskId]: 'Escolha uma voz disponível antes de salvar.' }));
      return;
    }
    setSavingDeskId(deskId);
    try {
      const res = await fetch(`/api/agent-voice-settings/${deskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voiceURI: voice.voiceURI,
          voiceName: voice.name,
          lang: voice.lang,
          gender: DESK_SUGGESTED_GENDER[deskId],
          rate: getEffectiveRate(deskId),
          pitch: getEffectivePitch(deskId),
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setSavedConfigs((prev) => ({ ...prev, [deskId]: data.config }));
        setNoticeByDesk((prev) => ({ ...prev, [deskId]: `Voz salva: "${voice.name}".` }));
      } else {
        setNoticeByDesk((prev) => ({ ...prev, [deskId]: 'Não foi possível salvar agora. Tente novamente.' }));
      }
    } catch {
      setNoticeByDesk((prev) => ({ ...prev, [deskId]: 'Sem conexão com o servidor — não foi salvo.' }));
    } finally {
      setSavingDeskId(null);
    }
  };

  const sortedVoiceOptions = [...browserVoices].sort((a, b) => {
    const aPt = a.lang.toLowerCase().startsWith('pt') ? 0 : 1;
    const bPt = b.lang.toLowerCase().startsWith('pt') ? 0 : 1;
    if (aPt !== bPt) return aPt - bPt;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="pt-6 border-t border-[#EFECE6] space-y-4">
      <div>
        <h2 className="text-lg font-serif-display font-bold text-[#181512]">Vozes dos Agentes</h2>
        <p className="text-xs text-[#6B6257]">
          Cada mesa fala com uma voz distinta em português — escolhida manualmente aqui ou, na ausência de
          escolha, atribuída automaticamente de forma a nunca repetir a mesma voz para agentes do mesmo gênero
          sugerido, quando o dispositivo tiver vozes suficientes para isso. A voz é do navegador/sistema operacional
          (Web Speech API) — não há serviço de voz pago ativado.
        </p>
      </div>

      {browserVoices.length === 0 && !isLoading && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Este navegador/dispositivo ainda não informou nenhuma voz disponível (ou não tem suporte a síntese de
          voz). A variedade de vozes em português depende do sistema operacional e navegador usados — em alguns
          aparelhos pode haver só uma ou duas vozes pt-BR, o que limita o quanto cada agente consegue soar
          realmente distinto.
        </p>
      )}
      {loadError && (
        <p className="text-xs text-red-800 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{loadError}</p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {OFFICE_DESKS.map((desk) => {
          const saved = savedConfigs[desk.id];
          const effectiveVoiceURI = getEffectiveVoiceURI(desk.id);
          const autoVoice = pickVoiceForDesk(desk.id, browserVoices);
          return (
            <div key={desk.id} className="p-3 rounded-xl border border-[#E5DEC9] bg-[#FAF8F5] space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-[#181512]">{desk.name}</p>
                  <p className="text-[10px] text-[#6B6257]">
                    {desk.role} · sugestão: voz {DESK_SUGGESTED_GENDER[desk.id]}
                  </p>
                </div>
                {saved ? (
                  <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                    Voz salva
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                    Atribuição automática
                  </span>
                )}
              </div>

              <p className="text-[10px] text-[#6B6257]">
                {saved ? (
                  <>
                    Salva: <strong>{saved.voiceName}</strong> ({saved.lang})
                  </>
                ) : autoVoice ? (
                  <>
                    Em uso agora (automática): <strong>{autoVoice.name}</strong> ({autoVoice.lang})
                  </>
                ) : (
                  'Nenhuma voz em português disponível neste dispositivo para atribuir automaticamente.'
                )}
              </p>

              <select
                value={effectiveVoiceURI}
                onChange={(e) => setDraftVoiceURI((prev) => ({ ...prev, [desk.id]: e.target.value }))}
                disabled={browserVoices.length === 0}
                className="w-full text-xs border border-[#D9CBAE] rounded-lg px-2 py-1.5 bg-white"
              >
                <option value="">Selecione uma voz...</option>
                {sortedVoiceOptions.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>

              <div className="grid grid-cols-2 gap-3">
                <label className="text-[11px] text-[#78716C] flex flex-col gap-1">
                  Velocidade ({getEffectiveRate(desk.id).toFixed(2)}x)
                  <input
                    type="range"
                    min={0.5}
                    max={2}
                    step={0.05}
                    value={getEffectiveRate(desk.id)}
                    onChange={(e) => setDraftRate((prev) => ({ ...prev, [desk.id]: parseFloat(e.target.value) }))}
                  />
                </label>
                <label className="text-[11px] text-[#78716C] flex flex-col gap-1">
                  Tom/expressividade ({getEffectivePitch(desk.id).toFixed(2)})
                  <input
                    type="range"
                    min={0}
                    max={2}
                    step={0.05}
                    value={getEffectivePitch(desk.id)}
                    onChange={(e) => setDraftPitch((prev) => ({ ...prev, [desk.id]: parseFloat(e.target.value) }))}
                  />
                </label>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleTest(desk.id)}
                  disabled={!effectiveVoiceURI}
                  className="px-3 py-1.5 rounded-lg border border-[#9A7138] text-[#9A7138] text-xs font-semibold hover:bg-[#9A7138]/10 disabled:opacity-40 flex items-center gap-1"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  Ouvir exemplo
                </button>
                <button
                  type="button"
                  onClick={() => handleSave(desk.id)}
                  disabled={!effectiveVoiceURI || savingDeskId === desk.id}
                  className="px-3 py-1.5 rounded-lg bg-[#9A7138] text-white text-xs font-semibold hover:bg-[#86632F] disabled:opacity-40"
                >
                  {savingDeskId === desk.id ? 'Salvando...' : 'Salvar voz'}
                </button>
              </div>

              {noticeByDesk[desk.id] && (
                <p className="text-[10px] text-[#6B6257]">{noticeByDesk[desk.id]}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
