import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  Smartphone,
  Tablet,
  Monitor,
  QrCode,
  Copy,
  Check,
  Download,
  Share2,
  X,
  Wifi,
  WifiOff,
  Send,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';
import { CorporateDeviceSession, DeviceFormFactor } from '../types';
import { usePWAInstall } from '../hooks/usePWAInstall';

export function getDirectPublicAppUrl(sharedAppUrl?: string): string {
  if (sharedAppUrl && sharedAppUrl.startsWith('http')) {
    return sharedAppUrl;
  }
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return 'https://ais-dev-5eeb75lqrgyidj3iykztd7-90595154148.us-west2.run.app';
}

interface PWAInstallButtonProps {
  onOpenGuideModal?: () => void;
  sharedAppUrl?: string;
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  onOpenGuideModal,
  compact = false,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  // Native 1-click install when browser triggers beforeinstallprompt
  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className={`flex items-center gap-1.5 rounded-lg bg-[#1F5E3B] hover:bg-[#184B2F] text-white font-semibold transition-colors whitespace-nowrap shadow-sm ${
          compact ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-xs'
        }`}
        title="Instalar aplicativo e criar ícone na Área de Trabalho ou Tela Inicial"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Criar Ícone na Área de Trabalho</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={`flex items-center gap-1.5 rounded-lg border border-[#9A7138] bg-[#FAF6EE] hover:bg-[#F3EFE6] text-[#181512] font-semibold transition-colors whitespace-nowrap ${
            compact ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-xs'
          }`}
        >
          <Download className="w-3.5 h-3.5 text-[#9A7138]" />
          Instalar no iPhone / iPad
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-md rounded-xl bg-white border border-[#E5DEC9] p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#EFECE6] pb-3">
                <h3 className="text-base font-bold text-[#181512]">
                  Instalar no iPhone ou iPad (Safari)
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 text-[#6B6257] hover:text-[#181512]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <ol className="space-y-2.5 text-xs text-[#292524] list-decimal list-inside">
                <li>
                  Certifique-se de abrir o <strong>Link Direto do Aplicativo</strong> no Safari (fora da tela de edição do Google Studio).
                </li>
                <li>
                  Toque no botão <strong>Compartilhar</strong> na barra do Safari e depois em <strong>Adicionar à Tela de Início</strong>.
                </li>
                <li>
                  Confirme em <strong>Adicionar</strong>. O aplicativo Castros Interiores abrirá em tela cheia como aplicativo nativo.
                </li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-full rounded-lg bg-[#181512] py-2.5 text-xs font-semibold text-white hover:bg-[#2E2722]"
              >
                Entendi
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  if (onOpenGuideModal) {
    return (
      <button
        type="button"
        onClick={onOpenGuideModal}
        className={`flex items-center gap-1.5 rounded-lg bg-[#1F5E3B] hover:bg-[#184B2F] text-white font-semibold transition-colors whitespace-nowrap ${
          compact ? 'px-3 py-1.5 text-xs' : 'px-3.5 py-2 text-xs'
        }`}
        title="Como criar o ícone na Área de Trabalho do Computador ou Tela Inicial do Tablet"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Criar Ícone na Área de Trabalho</span>
      </button>
    );
  }

  return null;
};

interface CorporateSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  deviceId: string;
  formFactor: DeviceFormFactor;
  stationName: string;
  onUpdateDeviceIdentity: (formFactor: DeviceFormFactor, stationName: string) => void;
  connectedDevices: CorporateDeviceSession[];
  sseConnected: boolean;
  sharedAppUrl: string;
  activeAttendanceNumber?: string;
  activeStep?: number;
  onBroadcastFocusAttendance: () => Promise<void>;
}

export const CorporateSyncModal: React.FC<CorporateSyncModalProps> = ({
  isOpen,
  onClose,
  deviceId,
  formFactor,
  stationName,
  onUpdateDeviceIdentity,
  connectedDevices,
  sseConnected,
  sharedAppUrl,
  activeAttendanceNumber,
  activeStep,
  onBroadcastFocusAttendance,
}) => {
  const {
    isInstallable,
    isInstalled,
    isInIframe,
    isDevDomain,
    swActive,
    install,
    isOnline,
  } = usePWAInstall();
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [localFactor, setLocalFactor] = useState<DeviceFormFactor>(formFactor);
  const [localStation, setLocalStation] = useState<string>(stationName);
  const [savedStationNotice, setSavedStationNotice] = useState(false);
  const [broadcastingFocus, setBroadcastingFocus] = useState(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState(false);

  const liveActiveUrl =
    (sharedAppUrl && sharedAppUrl.startsWith('http') ? sharedAppUrl : '') ||
    (typeof window !== 'undefined' ? window.location.origin : '') ||
    'https://ais-dev-5eeb75lqrgyidj3iykztd7-90595154148.us-west2.run.app';
  const sharedPreUrl = liveActiveUrl.replace('://ais-dev-', '://ais-pre-');
  const [selectedUrlType, setSelectedUrlType] = useState<'active' | 'shared'>('active');
  const targetUrl = selectedUrlType === 'active' ? liveActiveUrl : sharedPreUrl;

  useEffect(() => {
    setLocalFactor(formFactor);
    setLocalStation(stationName);
  }, [formFactor, stationName]);

  useEffect(() => {
    if (!isOpen || !targetUrl) return;
    QRCode.toDataURL(targetUrl, {
      width: 240,
      margin: 2,
      color: {
        dark: '#181512',
        light: '#FAF8F5',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch(() => setQrDataUrl(''));
  }, [isOpen, targetUrl]);

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(targetUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2500);
    } catch {
      // ignore
    }
  };

  const handleSaveStation = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateDeviceIdentity(localFactor, localStation);
    setSavedStationNotice(true);
    setTimeout(() => setSavedStationNotice(false), 2500);
  };

  const handleTriggerBroadcast = async () => {
    setBroadcastingFocus(true);
    setBroadcastSuccess(false);
    try {
      await onBroadcastFocusAttendance();
      setBroadcastSuccess(true);
      setTimeout(() => setBroadcastSuccess(false), 3000);
    } finally {
      setBroadcastingFocus(false);
    }
  };

  const pcCount = connectedDevices.filter((d) => d.formFactor === 'Computador').length;
  const tabletCount = connectedDevices.filter((d) => d.formFactor === 'Tablet').length;
  const phoneCount = connectedDevices.filter((d) => d.formFactor === 'Celular').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-3 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-4xl rounded-xl bg-white border border-[#E5DEC9] shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-[#181512] text-[#F9F6F0] px-6 py-4 flex items-center justify-between gap-4 shrink-0">
          <div>
            <div className="flex items-center gap-2 text-xs text-[#D6CFC5]">
              <span>INSTALAÇÃO DIRETA E SINCRONIZAÇÃO EM TEMPO REAL</span>
              <span aria-hidden="true">·</span>
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                {isOnline && sseConnected ? (
                  <>
                    <Wifi className="w-3.5 h-3.5" />
                    Conectado ({swActive ? 'Instalador PWA Ativo' : 'Sincronizado'})
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                    Reconectando...
                  </>
                )}
              </span>
            </div>
            <h2 className="text-xl font-serif-display font-bold mt-0.5">
              Instalar Aplicativo no Celular e Tablet (Sem Erro 404)
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg bg-[#26211C] hover:bg-[#3A322B] text-[#F9F6F0]"
            aria-label="Fechar janela"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-[#292524]">
          {/* RESOLUÇÃO DO ERRO 404 DO TABLET */}
          <div className="p-4 rounded-xl bg-emerald-50 border-2 border-emerald-500 space-y-3">
            <div className="flex items-start gap-2.5">
              <Check className="w-5 h-5 text-emerald-800 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-emerald-950">
                  Solução de Conexão no Tablet e Celular (Resolvido)
                </h3>
                <p className="text-emerald-900 leading-relaxed text-[11px]">
                  Se o seu tablet abriu a tela com <strong>&ldquo;Não foi possível encontrar a página deste ais-pre-... (404)&rdquo;</strong>, isso acontecia porque o link tentava acessar o endereço de prévia externa antes de ser compartilhado.
                </p>
                <p className="text-emerald-950 font-semibold text-[11px]">
                  O <strong>Link Ativo Oficial</strong> abaixo acessa diretamente o servidor em tempo real da sua oficina, abrindo na hora no seu tablet e celular para instalar o aplicativo na tela inicial!
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <a
                href={targetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 rounded-lg bg-[#1F5E3B] hover:bg-[#184B2F] text-white font-semibold flex items-center gap-2 shadow-sm"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Abrir no Navegador Deste Aparelho</span>
              </a>
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                  'Link Oficial para Instalação no Tablet / Celular Castros Interiores:\n' + targetUrl
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 rounded-lg bg-[#128C7E] hover:bg-[#075E54] text-white font-semibold flex items-center gap-2 shadow-sm"
              >
                <Send className="w-4 h-4" />
                <span>Enviar Link via WhatsApp para o Tablet</span>
              </a>
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-4 py-2.5 rounded-lg bg-[#181512] hover:bg-[#2E2722] text-white font-semibold flex items-center gap-2"
              >
                {copiedUrl ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Link Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copiar Link</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Direct Install & QR Code Section */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Right-first on mobile: QR Code & Direct App Install */}
            <div className="lg:col-span-5 space-y-4">
              <div className="rounded-xl border-2 border-[#9A7138] bg-[#FAF8F5] p-5 flex flex-col items-center text-center space-y-3">
                <div className="flex items-center gap-1.5 font-bold text-sm text-[#181512]">
                  <QrCode className="w-4 h-4 text-[#9A7138]" />
                  <span>QR Code de Conexão Imediata (Sem Erro 404)</span>
                </div>
                <p className="text-[#57534E]">
                  Aponte a câmera do seu <strong>Tablet</strong> ou <strong>Celular</strong> para este QR Code. Ele abre diretamente o sistema da <strong>Castros Interiores</strong> pronto para instalar:
                </p>

                {/* Seletor de Tipo de Link */}
                <div className="flex rounded-lg bg-[#EFECE6] p-1 text-[11px] font-semibold w-full">
                  <button
                    type="button"
                    onClick={() => setSelectedUrlType('active')}
                    className={`flex-1 py-1 px-2 rounded-md transition-colors ${
                      selectedUrlType === 'active'
                        ? 'bg-white text-[#181512] shadow-sm'
                        : 'text-[#6B6257] hover:text-[#181512]'
                    }`}
                  >
                    Link Ativo Oficial (Recomendado)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedUrlType('shared')}
                    className={`flex-1 py-1 px-2 rounded-md transition-colors ${
                      selectedUrlType === 'shared'
                        ? 'bg-white text-[#181512] shadow-sm'
                        : 'text-[#6B6257] hover:text-[#181512]'
                    }`}
                  >
                    Link Compartilhado (ais-pre)
                  </button>
                </div>

                {qrDataUrl ? (
                  <div className="p-3 bg-white rounded-xl border border-[#D6CFC5] shadow-sm">
                    <img
                      src={qrDataUrl}
                      alt="QR Code de Instalação Direta Castros Interiores"
                      className="w-44 h-44 object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-44 h-44 flex items-center justify-center bg-white rounded-xl border border-[#D6CFC5] text-[#6B6257]">
                    Gerando QR Code...
                  </div>
                )}

                <div className="w-full space-y-2 pt-1 text-left">
                  <label className="block text-[11px] font-bold text-[#181512]">
                    Endereço Web Ativo:
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      readOnly
                      value={targetUrl}
                      className="w-full rounded-lg border border-[#D6CFC5] bg-white px-2.5 py-2 text-[11px] font-mono text-[#181512]"
                    />
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="px-3 py-2 rounded-lg bg-[#181512] hover:bg-[#2E2722] text-white font-semibold flex items-center gap-1 shrink-0"
                    >
                      {copiedUrl ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copiar
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Native 1-Click Install Button when opened directly on targetUrl */}
                {isInstallable && !isInstalled && (
                  <button
                    type="button"
                    onClick={install}
                    className="w-full py-3 px-4 rounded-lg bg-[#1F5E3B] hover:bg-[#184B2F] text-white text-sm font-bold flex items-center justify-center gap-2 shadow-md"
                  >
                    <Download className="w-4 h-4" />
                    Instalar Aplicativo Neste Aparelho Agora
                  </button>
                )}

                {!isInstallable && !isInstalled && (
                  <a
                    href={targetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-4 rounded-lg bg-[#1F5E3B] hover:bg-[#184B2F] text-white font-semibold flex items-center justify-center gap-2 shadow-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Abrir Link no Navegador
                  </a>
                )}

                {isInstalled && (
                  <div className="w-full py-2 px-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 font-medium flex items-center justify-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-700" />
                    Aplicativo instalado neste aparelho
                  </div>
                )}
              </div>

              {/* Passo a passo para criar o Ícone na Área de Trabalho e Tablet */}
              <div className="rounded-xl border border-[#E5DEC9] bg-white p-4 space-y-3">
                <h4 className="font-bold text-[#181512] flex items-center gap-1.5">
                  <Share2 className="w-3.5 h-3.5 text-[#9A7138]" />
                  <span>Como colocar o Ícone na Área de Trabalho (Sem precisar abrir o navegador):</span>
                </h4>
                
                <div className="space-y-2.5 text-[#57534E] text-[11px] leading-relaxed">
                  <div className="p-3 rounded-lg bg-[#FAF8F5] border border-[#E5DEC9] space-y-1">
                    <strong className="text-[#181512] flex items-center gap-1.5">
                      <Monitor className="w-3.5 h-3.5 text-[#9A7138]" />
                      <span>No Computador / Notebook (Windows ou Mac):</span>
                    </strong>
                    <ol className="list-decimal list-inside space-y-1 pl-1">
                      <li>Abra o Link Ativo no <strong>Google Chrome</strong> ou <strong>Microsoft Edge</strong>.</li>
                      <li>Clique no botão verde <strong>&ldquo;Criar Ícone na Área de Trabalho&rdquo;</strong> (ou no ícone de computador na barra de endereços do Chrome).</li>
                      <li>Se preferir pelo menu: clique nos <strong>3 pontinhos (⋮)</strong> no topo do Chrome &rarr; <strong>Salvar e compartilhar</strong> &rarr; <strong>Instalar Castros Interiores...</strong> (ou <em>Criar atalho...</em> e marque <em>&ldquo;Abrir como janela&rdquo;</em>).</li>
                      <li>Confirme em <strong>Instalar / Criar</strong>. O ícone oficial aparecerá na sua <strong>Área de Trabalho</strong> e na barra de tarefas!</li>
                    </ol>
                  </div>

                  <div className="p-3 rounded-lg bg-[#FAF8F5] border border-[#E5DEC9] space-y-1">
                    <strong className="text-[#181512] flex items-center gap-1.5">
                      <Tablet className="w-3.5 h-3.5 text-[#9A7138]" />
                      <span>No Tablet ou Celular (Android):</span>
                    </strong>
                    <ol className="list-decimal list-inside space-y-1 pl-1">
                      <li>Aponte a câmera para o QR Code acima (ou abra o Link Ativo no <strong>Chrome</strong> do tablet).</li>
                      <li>Toque no botão verde <strong>&ldquo;Instalar Aplicativo Agora&rdquo;</strong> (ou nos <strong>3 pontinhos (⋮)</strong> do Chrome &rarr; <strong>Instalar aplicativo</strong> ou <strong>Adicionar à tela inicial</strong>).</li>
                      <li>Toque em <strong>Instalar</strong>. O ícone da Castros Interiores irá direto para a tela inicial do seu tablet!</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>

            {/* Left column: Active Connected Devices + Handoff + Current Device Config */}
            <div className="lg:col-span-7 space-y-5">
              {/* 3-Device Status Strip */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E5DEC9]">
                  <div className="flex items-center gap-1.5 font-bold text-[#181512]">
                    <Smartphone className="w-4 h-4 text-[#9A7138]" />
                    <span>Celular</span>
                  </div>
                  <p className="text-lg font-bold font-mono text-[#181512] mt-1">
                    {phoneCount} online
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E5DEC9]">
                  <div className="flex items-center gap-1.5 font-bold text-[#181512]">
                    <Tablet className="w-4 h-4 text-[#9A7138]" />
                    <span>Tablet</span>
                  </div>
                  <p className="text-lg font-bold font-mono text-[#181512] mt-1">
                    {tabletCount} online
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E5DEC9]">
                  <div className="flex items-center gap-1.5 font-bold text-[#181512]">
                    <Monitor className="w-4 h-4 text-[#9A7138]" />
                    <span>Computador</span>
                  </div>
                  <p className="text-lg font-bold font-mono text-[#181512] mt-1">
                    {pcCount} online
                  </p>
                </div>
              </div>

              {/* Handoff Bar */}
              <div className="p-4 rounded-xl bg-[#FAF6EE] border border-[#D8C5A3] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="font-bold text-[#181512] text-sm">
                    Sincronizar Tela entre os 3 Aparelhos Agora
                  </div>
                  <p className="text-[#57534E]">
                    Atendimento ativo: <strong>{activeAttendanceNumber || 'Painel Geral'}</strong>. Ao clicar ao lado, o Celular, o Tablet e o Computador abrirão imediatamente este mesmo atendimento.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleTriggerBroadcast}
                  disabled={broadcastingFocus || !activeAttendanceNumber}
                  className="px-4 py-2.5 rounded-lg bg-[#9A7138] hover:bg-[#845E2B] disabled:opacity-50 text-white font-semibold flex items-center gap-2 shrink-0 self-start sm:self-center"
                >
                  <Send className="w-3.5 h-3.5" />
                  {broadcastingFocus
                    ? 'Transmitindo...'
                    : broadcastSuccess
                    ? 'Aberto nos Aparelhos!'
                    : 'Abrir nos Outros Aparelhos'}
                </button>
              </div>

              {/* Connected Devices List */}
              <div className="rounded-xl border border-[#E5DEC9] bg-white p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-[#EFECE6] pb-2.5">
                  <h3 className="font-bold text-sm text-[#181512]">
                    Aparelhos Conectados em Tempo Real ({connectedDevices.length})
                  </h3>
                  <span className="text-[#6B6257]">
                    Sincronização automática sem configurar nada
                  </span>
                </div>

                <div className="divide-y divide-[#EFECE6]">
                  {connectedDevices.map((dev) => {
                    const isThisDevice = dev.deviceId === deviceId;
                    const Icon =
                      dev.formFactor === 'Celular'
                        ? Smartphone
                        : dev.formFactor === 'Tablet'
                        ? Tablet
                        : Monitor;

                    return (
                      <div
                        key={dev.deviceId}
                        className="py-2.5 flex flex-wrap items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-lg bg-[#F9F6F0] border border-[#E5DEC9]">
                            <Icon className="w-4 h-4 text-[#9A7138]" />
                          </div>
                          <div>
                            <div className="font-semibold text-[#181512] flex items-center gap-2">
                              <span>{dev.stationName}</span>
                              <span aria-hidden="true">·</span>
                              <span className="text-[#6B6257] font-normal">
                                {dev.formFactor}
                              </span>
                              {isThisDevice && (
                                <span className="text-emerald-800 font-bold">
                                  (Este aparelho)
                                </span>
                              )}
                            </div>
                            <div className="text-[#6B6257]">
                              Visualizando:{' '}
                              <span className="font-mono font-medium text-[#181512]">
                                {dev.activeAttendanceNumber || 'Painel Geral'}
                              </span>
                              {dev.activeStep ? ` · Etapa ${dev.activeStep}` : ''}
                            </div>
                          </div>
                        </div>

                        <div className="text-right text-[#6B6257]">
                          <span className="text-emerald-700 font-medium">● Online</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Identify This Device Form */}
              <form
                onSubmit={handleSaveStation}
                className="rounded-xl border border-[#E5DEC9] bg-[#FAF8F5] p-4 space-y-3"
              >
                <h3 className="font-bold text-sm text-[#181512]">
                  Identificação deste Aparelho na Rede Corporativa
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-[#57534E] mb-1">
                      Tipo de Aparelho
                    </label>
                    <select
                      value={localFactor}
                      onChange={(e) => setLocalFactor(e.target.value as DeviceFormFactor)}
                      className="w-full rounded-lg border border-[#D6CFC5] bg-white px-3 py-2 text-xs font-medium"
                    >
                      <option value="Computador">Computador (Escritório / Gestão)</option>
                      <option value="Tablet">Tablet (Bancada da Oficina)</option>
                      <option value="Celular">Celular (Vistoria / Câmera)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium text-[#57534E] mb-1">
                      Nome do Posto de Trabalho
                    </label>
                    <input
                      type="text"
                      value={localStation}
                      onChange={(e) => setLocalStation(e.target.value)}
                      placeholder="Ex: Tablet Oficina, Celular Vistoria..."
                      className="w-full rounded-lg border border-[#D6CFC5] bg-white px-3 py-2 text-xs"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 pt-1">
                  <span className="text-[#6B6257]">
                    {savedStationNotice
                      ? 'Identificação atualizada em todos os aparelhos!'
                      : 'Define como este aparelho aparece para a equipe.'}
                  </span>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-[#181512] hover:bg-[#2E2722] text-white font-semibold"
                  >
                    Salvar Identificação
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#FAF8F5] border-t border-[#E5DEC9] px-6 py-3.5 flex items-center justify-between">
          <span className="text-xs text-[#6B6257]">
            Castros Interiores — Instalador PWA Direto + Sincronização em Tempo Real
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#181512] hover:bg-[#2E2722] text-white text-xs font-semibold"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
