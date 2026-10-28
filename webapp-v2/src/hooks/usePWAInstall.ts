import { useEffect, useState } from 'react';
import { DeviceFormFactor } from '../types';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

// Capture beforeinstallprompt globally as early as possible (before React even finishes mounting)
let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;
const promptSubscribers = new Set<(evt: BeforeInstallPromptEvent | null) => void>();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    globalDeferredPrompt = e as BeforeInstallPromptEvent;
    promptSubscribers.forEach((cb) => cb(globalDeferredPrompt));
  });

  window.addEventListener('appinstalled', () => {
    globalDeferredPrompt = null;
    promptSubscribers.forEach((cb) => cb(null));
  });
}

export function detectDeviceFormFactor(): DeviceFormFactor {
  if (typeof window === 'undefined') return 'Computador';
  const ua = window.navigator.userAgent.toLowerCase();
  const width = window.innerWidth;

  const isTabletUa =
    /ipad|tablet|playbook|silk/.test(ua) ||
    (ua.includes('android') && !ua.includes('mobile')) ||
    (ua.includes('macintosh') && navigator.maxTouchPoints > 1);

  if (isTabletUa || (width >= 680 && width <= 1080 && navigator.maxTouchPoints > 0)) {
    return 'Tablet';
  }
  if (/iphone|ipod|android.*mobile|windows phone|mobile/.test(ua) || width < 680) {
    return 'Celular';
  }
  return 'Computador';
}

export function getOrCreateDeviceIdentity(): {
  deviceId: string;
  formFactor: DeviceFormFactor;
  stationName: string;
} {
  const formFactor = detectDeviceFormFactor();
  const defaultStation =
    formFactor === 'Celular'
      ? 'Vistoria Móvel (Celular)'
      : formFactor === 'Tablet'
      ? 'Bancada Oficina (Tablet)'
      : 'Central Escritório (Computador)';

  if (typeof window === 'undefined') {
    return {
      deviceId: 'dev-server',
      formFactor,
      stationName: defaultStation,
    };
  }

  try {
    let deviceId = window.localStorage.getItem('castros_device_id');
    if (!deviceId) {
      deviceId = `dev-${formFactor.toLowerCase()}-${Math.random().toString(36).slice(2, 8)}`;
      window.localStorage.setItem('castros_device_id', deviceId);
    }
    const savedStation = window.localStorage.getItem('castros_station_name');
    const savedFactor = window.localStorage.getItem('castros_form_factor') as DeviceFormFactor | null;
    return {
      deviceId,
      formFactor:
        savedFactor === 'Celular' || savedFactor === 'Tablet' || savedFactor === 'Computador'
          ? savedFactor
          : formFactor,
      stationName: savedStation || defaultStation,
    };
  } catch {
    return {
      deviceId: `dev-${Date.now().toString(36)}`,
      formFactor,
      stationName: defaultStation,
    };
  }
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    globalDeferredPrompt
  );
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);
  const [isDevDomain, setIsDevDomain] = useState(false);
  const [swActive, setSwActive] = useState(false);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    try {
      setIsInIframe(window.self !== window.top);
    } catch {
      setIsInIframe(true);
    }

    setIsDevDomain(window.location.hostname.startsWith('ais-dev-'));

    const ua = window.navigator.userAgent.toLowerCase();
    const isIOSDevice =
      /iphone|ipad|ipod/.test(ua) ||
      (ua.includes('macintosh') && navigator.maxTouchPoints > 1);
    setIsIOS(isIOSDevice);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg) setSwActive(true);
      });
      navigator.serviceWorker.ready.then(() => {
        setSwActive(true);
      });
    }

    const handlePromptUpdate = (evt: BeforeInstallPromptEvent | null) => {
      setDeferredPrompt(evt);
    };
    promptSubscribers.add(handlePromptUpdate);

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      promptSubscribers.delete(handlePromptUpdate);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      globalDeferredPrompt = null;
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  return {
    isInstallable: Boolean(deferredPrompt),
    isInstalled,
    isIOS,
    isInIframe,
    isDevDomain,
    swActive,
    isOnline,
    install,
  };
}
