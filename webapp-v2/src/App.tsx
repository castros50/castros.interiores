import React, { useEffect, useState } from 'react';
import {
  Plus,
  Search,
  Download,
  Trash2,
  Edit3,
  FolderOpen,
  UserCheck,
  LogOut,
  AlertTriangle,
  Check,
  Menu,
  X,
  Smartphone,
  Tablet,
  Monitor,
  QrCode,
  Wifi,
  Send,
  Camera,
  FileText,
  Image as ImageIcon,
} from 'lucide-react';
import {
  AttendanceRecord,
  AttendancePhoto,
  PhotoCategory,
  MaterialCatalogItem,
  WorkshopSettings,
  BudgetLineCategory,
  CorporateDeviceSession,
  DeviceFormFactor,
  RealtimeSyncEvent,
  JuliaDepartmentData,
  DepartmentId,
} from './types';
import {
  auth,
  onAuthStateChanged,
  signInWithGoogle,
  signOutUser,
  syncAttendanceToFirestore,
  loadAttendancesFromFirestore,
  subscribeToFirestoreAttendances,
  deleteAttendanceFromFirestore,
  deleteAllAttendancesFromFirestore,
  syncMaterialToFirestore,
  User,
} from './firebase';
import { AttendanceWorkspace } from './components/AttendanceWorkspace';
import { ManufacturingWorkspace } from './components/ManufacturingWorkspace';
import { calculateBudgetSummary, formatCurrencyBRL, formatMissingText } from './utils/calculations';
import {
  generateInternalReportPdf,
  generateClientReportPdf,
  generateShoppingListPdf,
} from './utils/pdfGenerator';
import { ResilientImage } from './components/ResilientImage';
import { CorporateSyncModal, PWAInstallButton } from './components/CorporateSyncModal';
import { AgentsControlPanel } from './components/AgentsControlPanel';
import { DepartmentsHub } from './components/DepartmentsHub';
import { OfficeDesksHub } from './components/OfficeDesksHub';
import { RawMaterialsAndPricing } from './components/RawMaterialsAndPricing';
import { getOrCreateDeviceIdentity, usePWAInstall } from './hooks/usePWAInstall';
import { AgentPortrait, PortraitUploadModal } from './components/AgentPortrait';
import { OFFICE_DESKS } from './utils/officeDefaults';

type MenuTab =
  | 'painel'
  | 'escritorio'
  | 'atendimentos'
  | 'agentes'
  | 'clientes'
  | 'materiais'
  | 'relatorios'
  | 'configuracoes';

async function createCompressedThumbnail(fileOrDataUrl: File | string): Promise<{
  fullDataUrl: string;
  thumbnailDataUrl: string;
  mimeType: string;
}> {
  const fullDataUrl: string =
    typeof fileOrDataUrl === 'string'
      ? fileOrDataUrl
      : await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error('Falha ao ler arquivo de imagem.'));
          reader.readAsDataURL(fileOrDataUrl);
        });

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const maxThumb = 320;
        let w = img.naturalWidth || 320;
        let h = img.naturalHeight || 240;
        if (w > maxThumb || h > maxThumb) {
          if (w > h) {
            h = Math.round((h * maxThumb) / w);
            w = maxThumb;
          } else {
            w = Math.round((w * maxThumb) / h);
            h = maxThumb;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const thumb = canvas.toDataURL('image/jpeg', 0.65);
          resolve({
            fullDataUrl,
            thumbnailDataUrl: thumb,
            mimeType: 'image/jpeg',
          });
          return;
        }
      } catch {
        // fallback
      }
      resolve({
        fullDataUrl,
        thumbnailDataUrl: fullDataUrl.slice(0, 35000),
        mimeType: 'image/jpeg',
      });
    };
    img.onerror = () =>
      resolve({
        fullDataUrl,
        thumbnailDataUrl: '',
        mimeType: 'image/jpeg',
      });
    img.src = fullDataUrl;
  });
}

export default function App() {
  const [activeTab, setActiveTab] = useState<MenuTab>('painel');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Firebase Auth User
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Persistent Data State
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [activeAttendanceId, setActiveAttendanceId] = useState<string | null>(
    () => localStorage.getItem('active_attendance_id')
  );

  useEffect(() => {
    if (activeAttendanceId) {
      localStorage.setItem('active_attendance_id', activeAttendanceId);
    } else {
      localStorage.removeItem('active_attendance_id');
    }
  }, [activeAttendanceId]);
  const [materials, setMaterials] = useState<MaterialCatalogItem[]>([]);
  const [settings, setSettings] = useState<WorkshopSettings>({
    workshopName: 'Castros Interiores',
    responsibleDefaultName: '',
    phoneWhatsapp: '(91) 98556-9841',
    cityState: '',
    aiModel: 'claude-sonnet-5',
  });
  const [juliaData, setJuliaData] = useState<JuliaDepartmentData | null>(null);

  // Server & AI status
  const [isLoadingStore, setIsLoadingStore] = useState(true);
  const [geminiConfigured, setGeminiConfigured] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedSuccessAt, setLastSavedSuccessAt] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isAnalyzingDefects, setIsAnalyzingDefects] = useState(false);
  const [isAnalyzingReuse, setIsAnalyzingReuse] = useState(false);
  const [isPreparingMaterialsList, setIsPreparingMaterialsList] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [portraitUploadTarget, setPortraitUploadTarget] = useState<DepartmentId | 'office-cover' | null>(null);
  const [isUploadingPortrait, setIsUploadingPortrait] = useState(false);

  // Search & Filter states
  const [attendanceSearch, setAttendanceSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('TODOS');
  const [clientSearch, setClientSearch] = useState('');

  // Materials Catalog Form
  const [newMatName, setNewMatName] = useState('');
  const [newMatCategory, setNewMatCategory] = useState<BudgetLineCategory>('Material');
  const [newMatUnit, setNewMatUnit] = useState('m');
  const [newMatCostReais, setNewMatCostReais] = useState('');
  const [newMatSupplier, setNewMatSupplier] = useState('');
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);

  // Corporate Multi-Device & PWA State
  const initialIdentity = getOrCreateDeviceIdentity();
  const [deviceId] = useState<string>(initialIdentity.deviceId);
  const [deviceFormFactor, setDeviceFormFactor] = useState<DeviceFormFactor>(
    initialIdentity.formFactor
  );
  const [stationName, setStationName] = useState<string>(initialIdentity.stationName);
  const [connectedDevices, setConnectedDevices] = useState<CorporateDeviceSession[]>([]);
  const [sseConnected, setSseConnected] = useState<boolean>(false);
  const [sharedAppUrl, setSharedAppUrl] = useState<string>('');
  const [syncModalOpen, setSyncModalOpen] = useState<boolean>(false);
  const [realtimeNotice, setRealtimeNotice] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState<boolean>(false);
  const { isInstalled, isOnline } = usePWAInstall();

  const handleUpdateDeviceIdentity = (
    newFactor: DeviceFormFactor,
    newStation: string
  ) => {
    setDeviceFormFactor(newFactor);
    setStationName(newStation);
    try {
      window.localStorage.setItem('castros_form_factor', newFactor);
      window.localStorage.setItem('castros_station_name', newStation);
    } catch {
      // ignore
    }
  };

  // Track Firebase Auth + Live Firestore Subscription
  useEffect(() => {
    let unsubFirestore: (() => void) | null = null;
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setAuthReady(true);
      if (unsubFirestore) {
        unsubFirestore();
        unsubFirestore = null;
      }
      if (user && user.emailVerified) {
        try {
          const firestoreRecords = await loadAttendancesFromFirestore();
          if (firestoreRecords.length > 0) {
            setAttendances((prev) => {
              const merged = new Map<string, AttendanceRecord>();
              prev.forEach((a) => merged.set(a.id, a));
              firestoreRecords.forEach((a) => {
                const existing = merged.get(a.id);
                if (
                  !existing ||
                  new Date(a.updatedAt).getTime() >= new Date(existing.updatedAt).getTime()
                ) {
                  merged.set(a.id, a);
                }
              });
              return Array.from(merged.values()).sort(
                (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
              );
            });
          }
          unsubFirestore = subscribeToFirestoreAttendances((liveRecords) => {
            if (liveRecords.length > 0) {
              setAttendances((prev) => {
                const merged = new Map<string, AttendanceRecord>();
                prev.forEach((a) => merged.set(a.id, a));
                liveRecords.forEach((a) => {
                  const existing = merged.get(a.id);
                  if (
                    !existing ||
                    new Date(a.updatedAt).getTime() >= new Date(existing.updatedAt).getTime()
                  ) {
                    merged.set(a.id, a);
                  }
                });
                return Array.from(merged.values()).sort(
                  (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
                );
              });
            }
          });
        } catch (err) {
          console.error('Aviso ao sincronizar atendimentos do Firestore:', err);
        }
      }
    });
    return () => {
      unsub();
      if (unsubFirestore) unsubFirestore();
    };
  }, []);

  // Load Persistent Server Store on mount
  useEffect(() => {
    async function fetchInitialData() {
      setIsLoadingStore(true);
      try {
        const [statusRes, storeRes] = await Promise.all([
          fetch('/api/status'),
          fetch('/api/store'),
        ]);
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          setGeminiConfigured(Boolean(statusData.geminiConfigured));
          if (statusData.appUrl) {
            setSharedAppUrl(statusData.appUrl);
          }
          if (Array.isArray(statusData.devices)) {
            setConnectedDevices(statusData.devices);
          }
        }
        if (storeRes.ok) {
          const storeData = await storeRes.json();
          if (Array.isArray(storeData.attendances)) {
            const normalized = storeData.attendances.map((a: any) => ({
              ...a,
              clientName: a.clientName || 'não informado',
              clientPhone: a.clientPhone || 'não informado',
              furnitureType: a.furnitureType || 'Sofá',
            }));
            setAttendances(normalized);
            if (normalized.length > 0) {
              const persistedId = localStorage.getItem('active_attendance_id');
              if (persistedId && normalized.some((a: any) => a.id === persistedId)) {
                setActiveAttendanceId(persistedId);
              } else {
                setActiveAttendanceId(null);
              }
            }
          }
          if (Array.isArray(storeData.materials)) {
            setMaterials(storeData.materials);
          }
          if (storeData.settings) {
            setSettings(storeData.settings);
          }
          if (storeData.juliaData) {
            setJuliaData(storeData.juliaData);
          }
          if (Array.isArray(storeData.devices)) {
            setConnectedDevices(storeData.devices);
          }
        }
      } catch (err) {
        setSaveError(
          err instanceof Error
            ? err.message
            : 'Falha ao carregar dados do servidor.'
        );
      } finally {
        setIsLoadingStore(false);
      }
    }
    fetchInitialData();
  }, []);

  const activeAttendance =
    attendances.find((a) => a.id === activeAttendanceId) || null;

  // Real-time Server-Sent Events (SSE) connection across Computador, Tablet, and Celular
  useEffect(() => {
    const queryParams = new URLSearchParams({
      deviceId,
      formFactor: deviceFormFactor,
      stationName,
      standalone: String(isInstalled),
    });

    const es = new EventSource(`/api/events?${queryParams.toString()}`);

    es.onopen = () => {
      setSseConnected(true);
    };

    es.onerror = () => {
      setSseConnected(false);
    };

    es.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data) as RealtimeSyncEvent;
        if (data.devices) {
          setConnectedDevices(data.devices);
        }

        const isFromOtherDevice =
          data.sourceDeviceId && data.sourceDeviceId !== deviceId;

        if (data.type === 'attendance:created' && data.attendance) {
          const incoming = data.attendance;
          setAttendances((prev) => {
            if (prev.some((a) => a.id === incoming.id)) {
              return prev.map((a) => (a.id === incoming.id ? incoming : a));
            }
            return [incoming, ...prev];
          });
          if (isFromOtherDevice) {
            setActiveAttendanceId(incoming.id);
            setRealtimeNotice(
              `Novo atendimento ${incoming.attendanceNumber} criado em ${
                data.sourceStationName || 'outro aparelho'
              }`
            );
            setTimeout(() => setRealtimeNotice(null), 5000);
          }
        } else if (data.type === 'attendance:updated' && data.attendance) {
          const incoming = data.attendance;
          setAttendances((prev) => {
            const exists = prev.some((a) => a.id === incoming.id);
            if (!exists) return [incoming, ...prev];
            return prev.map((a) => (a.id === incoming.id ? incoming : a));
          });
          if (isFromOtherDevice || data.sourceStationName?.startsWith('IA Claude')) {
            setRealtimeNotice(
              `Atendimento ${incoming.attendanceNumber} sincronizado de ${
                data.sourceStationName || 'outro aparelho'
              }`
            );
            setTimeout(() => setRealtimeNotice(null), 4500);
          }
        } else if (data.type === 'attendance:deleted' && data.attendanceId) {
          const deletedId = data.attendanceId;
          setAttendances((prev) => prev.filter((a) => a.id !== deletedId));
        } else if (data.type === 'attendance:cleared') {
          setAttendances([]);
          setActiveAttendanceId(null);
          if (isFromOtherDevice) {
            setRealtimeNotice(
              `Todos os atendimentos foram excluídos por ${
                data.sourceStationName || 'outro aparelho'
              }`
            );
            setTimeout(() => setRealtimeNotice(null), 5000);
          }
        } else if (data.type === 'attendance:focus' && data.attendance) {
          const focused = data.attendance;
          setAttendances((prev) => {
            const exists = prev.some((a) => a.id === focused.id);
            const nextList = exists
              ? prev.map((a) => (a.id === focused.id ? focused : a))
              : [focused, ...prev];
            return nextList.map((a) =>
              a.id === focused.id && data.step
                ? { ...a, currentStep: data.step }
                : a
            );
          });
          setActiveAttendanceId(focused.id);
          setActiveTab('painel');
          if (isFromOtherDevice) {
            setRealtimeNotice(
              `Tela sincronizada com ${
                data.sourceStationName || 'outro aparelho'
              }: Atendimento ${focused.attendanceNumber} (Etapa ${data.step || focused.currentStep})`
            );
            setTimeout(() => setRealtimeNotice(null), 6000);
          }
        } else if (data.type === 'materials:updated' && Array.isArray(data.materials)) {
          setMaterials(data.materials);
        } else if (data.type === 'settings:updated' && data.settings) {
          setSettings(data.settings);
        } else if (data.type === 'julia:updated' && data.juliaData) {
          setJuliaData(data.juliaData);
          if (isFromOtherDevice) {
            setRealtimeNotice(
              `Departamento Júlia Marketing sincronizado de ${
                data.sourceStationName || 'outro aparelho'
              }`
            );
            setTimeout(() => setRealtimeNotice(null), 4500);
          }
        }
      } catch {
        // ignore malformed event
      }
    };

    return () => {
      es.close();
    };
  }, [deviceId, deviceFormFactor, stationName, isInstalled]);

  // Periodic Heartbeat to keep active attendance & step synced across the 3 devices
  useEffect(() => {
    const sendHeartbeat = async () => {
      try {
        const res = await fetch('/api/devices/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deviceId,
            formFactor: deviceFormFactor,
            stationName,
            activeAttendanceId: activeAttendance?.id || null,
            activeAttendanceNumber: activeAttendance?.attendanceNumber || null,
            activeStep: activeAttendance?.currentStep || 1,
            isStandalonePwa: isInstalled,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.devices)) {
            setConnectedDevices(data.devices);
          }
        }
      } catch {
        // ignore offline heartbeat error
      }
    };

    sendHeartbeat();
    const timer = setInterval(sendHeartbeat, 20000);
    return () => clearInterval(timer);
  }, [
    deviceId,
    deviceFormFactor,
    stationName,
    activeAttendance?.id,
    activeAttendance?.attendanceNumber,
    activeAttendance?.currentStep,
    isInstalled,
  ]);

  const handleBroadcastFocusAttendance = async () => {
    if (!activeAttendance) return;
    await handlePersistAttendance(activeAttendance);
    await fetch('/api/devices/focus-attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        attendanceId: activeAttendance.id,
        step: activeAttendance.currentStep,
        sourceDeviceId: deviceId,
        sourceStationName: stationName,
        sourceFormFactor: deviceFormFactor,
      }),
    });
  };

  const handleCreateNewAttendance = async (orderType: any = 'Reforma') => {
    const validOrderType = (orderType === 'Fabricação' || orderType === 'Reforma') ? orderType : 'Reforma';
    setIsSaving(true);
    setSaveError(null);
    try {
      const tempId = `att-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const res = await fetch('/api/attendances', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-id': deviceId,
          'x-station-name': stationName,
        },
        body: JSON.stringify({
          id: tempId,
          ownerId: currentUser?.uid || 'system',
          status: 'Rascunho',
          currentStep: 1,
          reviewerName: settings.responsibleDefaultName || '',
          orderType: validOrderType,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.attendance) {
        throw new Error(data.error || 'Erro ao criar novo atendimento.');
      }
      const created: AttendanceRecord = data.attendance;
      if (currentUser && currentUser.emailVerified) {
        await syncAttendanceToFirestore(created, false);
      }
      setAttendances((prev) => [created, ...prev]);
      setActiveAttendanceId(created.id);
      setActiveTab('atendimentos');
      setLastSavedSuccessAt(new Date().toLocaleTimeString('pt-BR'));
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : 'Erro ao criar novo atendimento.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateDraftLocal = (
    updated: AttendanceRecord,
    markStaleReason?: string
  ) => {
    const now = new Date().toISOString();
    const recordWithLog: AttendanceRecord = markStaleReason
      ? {
          ...updated,
          updatedAt: now,
          auditHistory: [
            {
              id: `log-${Date.now()}`,
              timestamp: now,
              actor: updated.reviewerName || currentUser?.email || 'Operador',
              stage: 'Revisão / Controle de Versão',
              action: 'Etapas marcadas como "Precisa revisar"',
              details: markStaleReason,
            },
            ...updated.auditHistory,
          ],
        }
      : { ...updated, updatedAt: now };

    setAttendances((prev) =>
      prev.map((a) => (a.id === recordWithLog.id ? recordWithLog : a))
    );
  };

  const handlePersistAttendance = async (
    recordToSave: AttendanceRecord,
    logAction?: string,
    logStage?: string
  ): Promise<boolean> => {
    setIsSaving(true);
    setSaveError(null);
    try {
      const now = new Date().toISOString();
      const payload: AttendanceRecord = logAction
        ? {
            ...recordToSave,
            updatedAt: now,
            auditHistory: [
              {
                id: `log-${Date.now()}`,
                timestamp: now,
                actor:
                  recordToSave.reviewerName ||
                  currentUser?.displayName ||
                  currentUser?.email ||
                  'Responsável Castros Interiores',
                stage: logStage || 'Atendimento',
                action: logAction,
                details: `Gravado com sucesso no banco de dados (${recordToSave.attendanceNumber}).`,
              },
              ...recordToSave.auditHistory,
            ],
          }
        : { ...recordToSave, updatedAt: now };

      const res = await fetch(`/api/attendances/${payload.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-device-id': deviceId,
          'x-station-name': stationName,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.attendance) {
        throw new Error(data.error || 'Falha ao gravar atendimento no servidor.');
      }

      if (currentUser && currentUser.emailVerified) {
        await syncAttendanceToFirestore(data.attendance, true);
      }

      setAttendances((prev) =>
        prev.map((a) => (a.id === data.attendance.id ? data.attendance : a))
      );
      setLastSavedSuccessAt(new Date().toLocaleTimeString('pt-BR'));
      return true;
    } catch (err) {
      setSaveError(
        err instanceof Error
          ? err.message
          : 'Erro ao confirmar gravação do atendimento.'
      );
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleUploadPhotoFile = async (
    fileOrDataUrl: File | string,
    category: PhotoCategory,
    caption: string,
    furnitureLabel: string,
    existingFailedPhotoId?: string
  ) => {
    if (!activeAttendance) return;

    const photoId = existingFailedPhotoId || `photo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const nextPhotoNumber = activeAttendance.photos.length + 1;
    const code = `F-${String(nextPhotoNumber).padStart(2, '0')}`;

    const { fullDataUrl, thumbnailDataUrl, mimeType } =
      await createCompressedThumbnail(fileOrDataUrl);

    const optimisticPhoto: AttendancePhoto = {
      id: photoId,
      code,
      attendanceId: activeAttendance.id,
      furnitureLabel,
      category,
      caption,
      imageUrl: '',
      thumbnailDataUrl,
      mimeType,
      uploadStatus: 'uploading',
      createdAt: new Date().toISOString(),
    };

    const updatedPhotosUploading = existingFailedPhotoId
      ? activeAttendance.photos.map((p) =>
          p.id === existingFailedPhotoId
            ? { ...p, uploadStatus: 'uploading' as const, errorMessage: undefined }
            : p
        )
      : [...activeAttendance.photos, optimisticPhoto];

    const hasExistingAnalysis =
      activeAttendance.defectFindings.length > 0 || activeAttendance.reviewCompleted;

    const draftUploading: AttendanceRecord = {
      ...activeAttendance,
      photos: updatedPhotosUploading,
      status:
        activeAttendance.status === 'Rascunho' ||
        activeAttendance.status === 'Aguardando fotos'
          ? 'Pronto para análise'
          : activeAttendance.status,
      reviewCompleted: hasExistingAnalysis ? false : activeAttendance.reviewCompleted,
      staleness: hasExistingAnalysis
        ? {
            defectsAnalysisNeedsReview: true,
            responsibleReviewNeedsUpdate: true,
            reuseNeedsReview: true,
            proposalNeedsReview: true,
            opinionNeedsReview: true,
            staleReason:
              'Novas fotos foram adicionadas ao atendimento. Reexecute ou revise a análise técnica.',
          }
        : activeAttendance.staleness,
    };

    setAttendances((prev) =>
      prev.map((a) => (a.id === draftUploading.id ? draftUploading : a))
    );

    try {
      const uploadRes = await fetch('/api/photos/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendanceId: activeAttendance.id,
          photoId,
          dataUrl: fullDataUrl,
          mimeType,
        }),
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok || !uploadData.imageUrl) {
        throw new Error(uploadData.error || 'Falha no envio da imagem.');
      }

      const finalPhotos = draftUploading.photos.map((p) =>
        p.id === photoId
          ? {
              ...p,
              imageUrl: uploadData.imageUrl,
              uploadStatus: 'saved' as const,
            }
          : p
      );

      const finalRecord: AttendanceRecord = {
        ...draftUploading,
        photos: finalPhotos,
      };

      await handlePersistAttendance(
        finalRecord,
        `Foto ${code} (${category}) salva no armazenamento privado`,
        'Fotos'
      );
    } catch (err) {
      const failedPhotos = draftUploading.photos.map((p) =>
        p.id === photoId
          ? {
              ...p,
              uploadStatus: 'error' as const,
              errorMessage:
                err instanceof Error ? err.message : 'Erro ao enviar foto',
            }
          : p
      );
      setAttendances((prev) =>
        prev.map((a) =>
          a.id === draftUploading.id ? { ...draftUploading, photos: failedPhotos } : a
        )
      );
    }
  };

  const handleRunDefectsAnalysis = async () => {
    if (!activeAttendance || isAnalyzingDefects) return;
    setIsAnalyzingDefects(true);
    setAiError(null);

    try {
      // Save current state before calling server AI
      await handlePersistAttendance(activeAttendance);

      const res = await fetch('/api/ai/analyze-defects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendanceId: activeAttendance.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.attendance) {
        throw new Error(
          data.error || 'Não foi possível concluir a análise de defeitos com o Claude.'
        );
      }
      if (currentUser && currentUser.emailVerified) {
        await syncAttendanceToFirestore(data.attendance, true);
      }
      setAttendances((prev) =>
        prev.map((a) => (a.id === data.attendance.id ? data.attendance : a))
      );
      setLastSavedSuccessAt(new Date().toLocaleTimeString('pt-BR'));
    } catch (err) {
      setAiError(
        err instanceof Error
          ? err.message
          : 'Erro ao executar a análise de imagens com Claude.'
      );
    } finally {
      setIsAnalyzingDefects(false);
    }
  };

  const handleRunReuseAnalysis = async () => {
    if (!activeAttendance || isAnalyzingReuse) return;
    setIsAnalyzingReuse(true);
    setAiError(null);

    try {
      await handlePersistAttendance(activeAttendance);

      const res = await fetch('/api/ai/analyze-reuse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendanceId: activeAttendance.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.attendance) {
        throw new Error(
          data.error || 'Não foi possível concluir a avaliação de reaproveitamento.'
        );
      }
      if (currentUser && currentUser.emailVerified) {
        await syncAttendanceToFirestore(data.attendance, true);
      }
      setAttendances((prev) =>
        prev.map((a) => (a.id === data.attendance.id ? data.attendance : a))
      );
      setLastSavedSuccessAt(new Date().toLocaleTimeString('pt-BR'));
    } catch (err) {
      setAiError(
        err instanceof Error
          ? err.message
          : 'Erro ao executar a segunda avaliação de reaproveitamento.'
      );
    } finally {
      setIsAnalyzingReuse(false);
    }
  };

  const handlePrepareMaterialsList = async () => {
    if (!activeAttendance || isPreparingMaterialsList) return;
    setIsPreparingMaterialsList(true);
    setAiError(null);

    try {
      await handlePersistAttendance(activeAttendance);

      const res = await fetch(
        `/api/attendances/${activeAttendance.id}/materials-list/prepare`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            actorName: currentUser?.displayName || currentUser?.email || undefined,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok || !data.attendance) {
        throw new Error(
          data.error || 'Não foi possível preparar a lista de materiais da reforma.'
        );
      }
      if (currentUser && currentUser.emailVerified) {
        await syncAttendanceToFirestore(data.attendance, true);
      }
      setAttendances((prev) =>
        prev.map((a) => (a.id === data.attendance.id ? data.attendance : a))
      );
      setLastSavedSuccessAt(new Date().toLocaleTimeString('pt-BR'));
    } catch (err) {
      setAiError(
        err instanceof Error
          ? err.message
          : 'Erro ao preparar a lista de materiais da reforma.'
      );
    } finally {
      setIsPreparingMaterialsList(false);
    }
  };

  const handleDeleteAttendance = async (id: string) => {
    try {
      await fetch(`/api/attendances/${id}`, {
        method: 'DELETE',
        headers: {
          'x-device-id': deviceId,
          'x-station-name': stationName,
        },
      });
      if (currentUser && currentUser.emailVerified) {
        await deleteAttendanceFromFirestore(id);
      }
      const remaining = attendances.filter((a) => a.id !== id);
      setAttendances(remaining);
      if (activeAttendanceId === id) {
        setActiveAttendanceId(remaining[0]?.id || null);
      }
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : 'Erro ao remover atendimento.'
      );
    }
  };

  const handleDeleteAllAttendances = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      await fetch('/api/attendances', {
        method: 'DELETE',
        headers: {
          'x-device-id': deviceId,
          'x-station-name': stationName,
        },
      });
      if (currentUser && currentUser.emailVerified) {
        await deleteAllAttendancesFromFirestore();
      }
      setAttendances([]);
      setActiveAttendanceId(null);
      setConfirmClearAll(false);
      setRealtimeNotice('Todos os atendimentos foram excluídos com sucesso.');
      setTimeout(() => setRealtimeNotice(null), 4500);
    } catch (err) {
      setSaveError(
        err instanceof Error
          ? err.message
          : 'Erro ao excluir todos os atendimentos.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveMaterialCatalogItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMatName.trim()) return;
    const costFloat = parseFloat(newMatCostReais.replace(',', '.'));
    const unitCostCents =
      !Number.isNaN(costFloat) && costFloat >= 0 ? Math.round(costFloat * 100) : 0;

    try {
      if (editingMaterialId) {
        const res = await fetch(`/api/materials/${editingMaterialId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newMatName.trim(),
            category: newMatCategory,
            unit: newMatUnit.trim() || 'un',
            unitCostCents,
            supplier: newMatSupplier.trim() || 'não informado',
          }),
        });
        const data = await res.json();
        if (res.ok && data.material) {
          if (currentUser && currentUser.emailVerified) {
            await syncMaterialToFirestore(data.material, true);
          }
          setMaterials((prev) =>
            prev.map((m) => (m.id === editingMaterialId ? data.material : m))
          );
        }
        setEditingMaterialId(null);
      } else {
        const res = await fetch('/api/materials', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ownerId: currentUser?.uid || 'system',
            name: newMatName.trim(),
            category: newMatCategory,
            unit: newMatUnit.trim() || 'un',
            unitCostCents,
            supplier: newMatSupplier.trim() || 'não informado',
          }),
        });
        const data = await res.json();
        if (res.ok && data.material) {
          if (currentUser && currentUser.emailVerified) {
            await syncMaterialToFirestore(data.material, false);
          }
          setMaterials((prev) => [data.material, ...prev]);
        }
      }
      setNewMatName('');
      setNewMatCostReais('');
      setNewMatSupplier('');
    } catch (err) {
      console.error('Erro ao salvar material:', err);
    }
  };

  const handleDeleteMaterial = async (id: string) => {
    await fetch(`/api/materials/${id}`, { method: 'DELETE' });
    setMaterials((prev) => prev.filter((m) => m.id !== id));
  };

  const handleSaveRichMaterial = async (item: MaterialCatalogItem) => {
    try {
      const isEditing = materials.some((m) => m.id === item.id);
      const url = isEditing ? `/api/materials/${item.id}` : '/api/materials';
      const method = isEditing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
      const data = await res.json();
      if (res.ok && data.material) {
        if (currentUser && currentUser.emailVerified) {
          await syncMaterialToFirestore(data.material, isEditing);
        }
        setMaterials((prev) => {
          const idx = prev.findIndex((m) => m.id === data.material.id);
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = data.material;
            return updated;
          }
          return [data.material, ...prev];
        });
      }
    } catch (err) {
      console.error('Erro ao salvar material:', err);
    }
  };

  const handleRecalculateBudgetsFromCatalog = async () => {
    try {
      const res = await fetch('/api/orders/recalculate-budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (res.ok && data.attendances) {
        setAttendances(data.attendances);
        setRealtimeNotice(
          `Orçamentos recalculados com sucesso! ${data.recalculatedOrdersCount || 0} pedido(s) sincronizados com os preços vigentes.`
        );
        setTimeout(() => setRealtimeNotice(null), 5000);
      }
    } catch (err) {
      console.error('Erro ao recalcular orçamentos:', err);
    }
  };

  const handleUploadAgentPortrait = async (deskId: DepartmentId, dataUrl: string) => {
    setIsUploadingPortrait(true);
    try {
      const res = await fetch(`/api/agent-portraits/${deskId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl, mimeType: 'image/jpeg' }),
      });
      const data = await res.json();
      if (!res.ok || !data.settings) {
        throw new Error(data.error || 'Não foi possível salvar o retrato do agente.');
      }
      setSettings(data.settings);
      setPortraitUploadTarget(null);
      setLastSavedSuccessAt(new Date().toLocaleTimeString('pt-BR'));
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : 'Erro ao salvar o retrato do agente.'
      );
    } finally {
      setIsUploadingPortrait(false);
    }
  };

  const handleUploadOfficeCover = async (dataUrl: string) => {
    setIsUploadingPortrait(true);
    try {
      const res = await fetch('/api/office-cover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl, mimeType: 'image/jpeg' }),
      });
      const data = await res.json();
      if (!res.ok || !data.settings) {
        throw new Error(data.error || 'Não foi possível salvar a imagem de capa.');
      }
      setSettings(data.settings);
      setPortraitUploadTarget(null);
      setLastSavedSuccessAt(new Date().toLocaleTimeString('pt-BR'));
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : 'Erro ao salvar a imagem de capa.'
      );
    } finally {
      setIsUploadingPortrait(false);
    }
  };

  const handlePersistSettings = async (nextSettings: WorkshopSettings) => {
    setIsSaving(true);
    try {
      setSettings(nextSettings);
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextSettings),
      });
      if (res.ok) {
        setLastSavedSuccessAt(new Date().toLocaleTimeString('pt-BR'));
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await handlePersistSettings(settings);
  };

  const handleActivateStationMode = (
    newFactor: DeviceFormFactor,
    newStation: string,
    targetStep: number
  ) => {
    handleUpdateDeviceIdentity(newFactor, newStation);
    if (activeAttendance) {
      handleUpdateDraftLocal({ ...activeAttendance, currentStep: targetStep });
    }
    setActiveTab('painel');
    setRealtimeNotice(
      `Modo ativado: ${newStation} — direcionado para a Etapa ${targetStep}`
    );
    setTimeout(() => setRealtimeNotice(null), 4000);
  };

  const filteredAttendances = attendances.filter((a) => {
    const matchesStatus = statusFilter === 'TODOS' || a.status === statusFilter;
    const q = attendanceSearch.toLowerCase().trim();
    if (!q) return matchesStatus;
    return (
      matchesStatus &&
      (a.attendanceNumber?.toLowerCase().includes(q) ||
        a.clientName?.toLowerCase().includes(q) ||
        a.furnitureType?.toLowerCase().includes(q) ||
        a.clientPhone?.toLowerCase().includes(q))
    );
  });

  // Group unique clients from attendances
  const clientsSummary = React.useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        phone: string;
        attendancesCount: number;
        lastUpdate: string;
        attendances: AttendanceRecord[];
      }
    >();
    attendances.forEach((a) => {
      const key = `${(a.clientName || '').trim().toLowerCase()}|${(a.clientPhone || '').trim()}`;
      const existing = map.get(key);
      if (existing) {
        existing.attendancesCount += 1;
        existing.attendances.push(a);
        if (new Date(a.updatedAt) > new Date(existing.lastUpdate)) {
          existing.lastUpdate = a.updatedAt;
        }
      } else {
        map.set(key, {
          name: formatMissingText(a.clientName),
          phone: formatMissingText(a.clientPhone),
          attendancesCount: 1,
          lastUpdate: a.updatedAt,
          attendances: [a],
        });
      }
    });
    return Array.from(map.values()).filter((c) =>
      !clientSearch.trim()
        ? true
        : c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
          c.phone.toLowerCase().includes(clientSearch.toLowerCase())
    );
  }, [attendances, clientSearch]);

  return (
    <div className="min-h-screen flex flex-col bg-[#F9F6F0] text-[#1C1917]">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-8 px-6 py-4 bg-[#FAF8F5] border-b border-[#E5DEC9]">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#painel"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('painel');
          }}
          className="text-xl font-serif-display font-bold tracking-wide text-[#181512] whitespace-nowrap shrink-0"
        >
          CASTROS INTERIORES
        </a>

        {/* Zone 2: Concise single-line navigation links */}
        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-[#57534E]">
          <button
            type="button"
            onClick={() => setActiveTab('painel')}
            className={`hover:text-[#181512] transition-colors whitespace-nowrap shrink-0 py-1 ${
              activeTab === 'painel'
                ? 'text-[#181512] font-semibold underline underline-offset-8 decoration-2 decoration-[#9A7138]'
                : ''
            }`}
          >
            Painel
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('escritorio')}
            className={`hover:text-[#181512] transition-colors whitespace-nowrap shrink-0 py-1 flex items-center gap-1.5 ${
              activeTab === 'escritorio'
                ? 'text-[#181512] font-semibold underline underline-offset-8 decoration-2 decoration-[#9A7138]'
                : ''
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#9A7138]" />
            Escritório de Mesas
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('atendimentos')}
            className={`hover:text-[#181512] transition-colors whitespace-nowrap shrink-0 py-1 ${
              activeTab === 'atendimentos'
                ? 'text-[#181512] font-semibold underline underline-offset-8 decoration-2 decoration-[#9A7138]'
                : ''
            }`}
          >
            Atendimentos ({attendances.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('agentes')}
            className={`hover:text-[#181512] transition-colors whitespace-nowrap shrink-0 py-1 ${
              activeTab === 'agentes'
                ? 'text-[#181512] font-semibold underline underline-offset-8 decoration-2 decoration-[#9A7138]'
                : ''
            }`}
          >
            Agentes IA & Postos
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('clientes')}
            className={`hover:text-[#181512] transition-colors whitespace-nowrap shrink-0 py-1 ${
              activeTab === 'clientes'
                ? 'text-[#181512] font-semibold underline underline-offset-8 decoration-2 decoration-[#9A7138]'
                : ''
            }`}
          >
            Clientes
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('materiais')}
            className={`hover:text-[#181512] transition-colors whitespace-nowrap shrink-0 py-1 ${
              activeTab === 'materiais'
                ? 'text-[#181512] font-semibold underline underline-offset-8 decoration-2 decoration-[#9A7138]'
                : ''
            }`}
          >
            Materiais e serviços
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('relatorios')}
            className={`hover:text-[#181512] transition-colors whitespace-nowrap shrink-0 py-1 ${
              activeTab === 'relatorios'
                ? 'text-[#181512] font-semibold underline underline-offset-8 decoration-2 decoration-[#9A7138]'
                : ''
            }`}
          >
            Relatórios
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('configuracoes')}
            className={`hover:text-[#181512] transition-colors whitespace-nowrap shrink-0 py-1 ${
              activeTab === 'configuracoes'
                ? 'text-[#181512] font-semibold underline underline-offset-8 decoration-2 decoration-[#9A7138]'
                : ''
            }`}
          >
            Configurações
          </button>
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => handleCreateNewAttendance('Reforma')}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#9A7138] hover:bg-[#845E2B] rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            Novo atendimento
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="lg:hidden p-2 rounded-lg border border-[#D6CFC5] text-[#181512]"
            aria-label="Abrir menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#181512] text-[#F9F6F0] px-6 py-4 border-b border-[#2E2722] flex flex-wrap gap-2">
          {(
            [
              ['painel', 'Painel'],
              ['escritorio', 'Escritório de Mesas'],
              ['atendimentos', `Atendimentos (${attendances.length})`],
              ['agentes', 'Agentes IA & Postos'],
              ['clientes', 'Clientes'],
              ['materiais', 'Materiais e serviços'],
              ['relatorios', 'Relatórios'],
              ['configuracoes', 'Configurações'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setActiveTab(key);
                setMobileMenuOpen(false);
              }}
              className={`px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap ${
                activeTab === key
                  ? 'bg-[#9A7138] text-white'
                  : 'bg-[#26211C] text-[#D6CFC5]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Main Content Container */}
      <main className="flex-1 max-w-[1360px] w-full mx-auto px-4 sm:px-6 py-6 pb-24 lg:pb-8 space-y-6">
        {/* Real-Time Multi-Device Sync Notification Banner */}
        {realtimeNotice && (
          <div className="rounded-xl bg-[#181512] text-[#F9F6F0] px-4 py-3 flex items-center justify-between gap-3 text-xs shadow-md border border-[#9A7138]">
            <div className="flex items-center gap-2">
              <Wifi className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-medium">{realtimeNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setRealtimeNotice(null)}
              className="text-[#D6CFC5] hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Corporate Multi-Device (Computador · Tablet · Celular) & Cloud Access Bar */}
        <div className="rounded-xl bg-white border border-[#E5DEC9] px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2.5 text-[#57534E]">
            <button
              type="button"
              onClick={() => setSyncModalOpen(true)}
              className="flex items-center gap-2 font-semibold text-[#181512] hover:text-[#9A7138] transition-colors text-left"
            >
              {deviceFormFactor === 'Celular' ? (
                <Smartphone className="w-4 h-4 text-[#9A7138] shrink-0" />
              ) : deviceFormFactor === 'Tablet' ? (
                <Tablet className="w-4 h-4 text-[#9A7138] shrink-0" />
              ) : (
                <Monitor className="w-4 h-4 text-[#9A7138] shrink-0" />
              )}
              <span>{stationName}</span>
            </button>
            <span aria-hidden="true">·</span>
            <span className="flex items-center gap-1.5 text-emerald-800 font-medium">
              <span
                className={`w-2 h-2 rounded-full ${
                  isOnline && sseConnected ? 'bg-emerald-600' : 'bg-amber-500'
                }`}
              />
              {connectedDevices.length} aparelho(s) conectado(s) em tempo real
            </span>
            <span aria-hidden="true" className="hidden sm:inline">
              ·
            </span>
            {authReady && currentUser ? (
              <span className="hidden sm:inline font-medium text-[#181512]">
                Cloud: {currentUser.displayName || currentUser.email}
              </span>
            ) : (
              <span className="hidden sm:inline text-[#6B6257]">
                Sincronizado via Servidor Corporativo
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* In-App PWA Install Button */}
            <PWAInstallButton
              compact
              onOpenGuideModal={() => setSyncModalOpen(true)}
            />

            {/* Transmit current attendance to other connected devices */}
            {activeAttendance && (
              <button
                type="button"
                onClick={handleBroadcastFocusAttendance}
                className="px-3 py-1.5 rounded-lg border border-[#D8C5A3] bg-[#FAF6EE] hover:bg-[#F3EFE6] text-[#181512] font-medium flex items-center gap-1.5 whitespace-nowrap"
                title="Abrir este atendimento imediatamente no Celular, Tablet e Computador"
              >
                <Send className="w-3.5 h-3.5 text-[#9A7138]" />
                <span className="hidden sm:inline">Abrir nos 3 Aparelhos</span>
                <span className="sm:hidden">Sincronizar Tela</span>
              </button>
            )}

            {/* Open QR Code & Multi-Device Hub */}
            <button
              type="button"
              onClick={() => setSyncModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-[#181512] hover:bg-[#2E2722] text-white font-medium flex items-center gap-1.5 whitespace-nowrap"
            >
              <QrCode className="w-3.5 h-3.5 text-[#9A7138]" />
              <span>Celular · Tablet · PC ({connectedDevices.length})</span>
            </button>

            {authError && <span className="text-red-700">{authError}</span>}
            {currentUser ? (
              <button
                type="button"
                onClick={() => signOutUser()}
                className="px-2.5 py-1.5 rounded-lg border border-[#D6CFC5] hover:bg-[#F3EFE6] text-[#181512] font-medium flex items-center gap-1 whitespace-nowrap"
                title="Sair da conta Google"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Sair</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={async () => {
                  setAuthError(null);
                  try {
                    await signInWithGoogle();
                  } catch (err) {
                    setAuthError(
                      err instanceof Error
                        ? 'Use o botão QR Code para sincronizar direto sem popup.'
                        : 'Erro na autenticação.'
                    );
                  }
                }}
                className="px-3 py-1.5 rounded-lg border border-[#D6CFC5] bg-white hover:bg-[#F3EFE6] text-[#181512] font-medium whitespace-nowrap flex items-center gap-1.5"
              >
                <UserCheck className="w-3.5 h-3.5 text-[#9A7138]" />
                <span className="hidden sm:inline">Conta Google</span>
              </button>
            )}
          </div>
        </div>

        {isLoadingStore ? (
          <div className="p-12 rounded-xl bg-white border border-[#E5DEC9] text-center text-sm text-[#6B6257]">
            Carregando atendimentos, fotos e catálogo da Castros Interiores...
          </div>
        ) : (
          <>
            {/* ABA 1: PAINEL (Visão Geral + 5 Departamentos Principais + Atendimento Ativo) */}
            {activeTab === 'painel' && (
              <div className="space-y-6">
                {/* Seção de Boas-Vindas do Escritório de Agentes */}
                <div
                  className="relative overflow-hidden rounded-2xl border border-[#E5DEC9] shadow-sm bg-[#181512]"
                  style={
                    settings.officeCoverImageUpdatedAt
                      ? {
                          backgroundImage: `linear-gradient(to right, rgba(24,21,18,0.90), rgba(24,21,18,0.60)), url(/api/photos/office-cover-image.jpg?v=${encodeURIComponent(
                            settings.officeCoverImageUpdatedAt
                          )})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }
                      : undefined
                  }
                >
                  <div className="px-6 py-8 sm:px-10 sm:py-10">
                    <h1 className="text-2xl sm:text-3xl font-serif-display font-bold text-white">
                      Castros Interiores — Escritório de Agentes
                    </h1>
                    <p className="text-sm text-[#E5DEC9] mt-2 max-w-xl">
                      Oito assistentes virtuais cuidam do atendimento, da avaliação técnica, das compras, do financeiro, da fabricação, do marketing, da estratégia e da supervisão — cada um na sua mesa.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTab('escritorio')}
                      className="mt-5 px-5 py-2.5 rounded-lg bg-[#9A7138] hover:bg-[#845E2B] text-white text-sm font-semibold shadow"
                    >
                      Entrar no escritório
                    </button>
                  </div>
                </div>

                {/* Cinco Departamentos Principais na Página Inicial */}
                <DepartmentsHub
                  attendances={attendances}
                  activeAttendance={activeAttendance}
                  materials={materials}
                  settings={settings}
                  isSaving={isSaving}
                  isAnalyzingDefects={isAnalyzingDefects}
                  isAnalyzingReuse={isAnalyzingReuse}
                  onSelectAttendance={(id) => setActiveAttendanceId(id)}
                  onNewAttendance={handleCreateNewAttendance}
                  onJumpToStep={(step) => {
                    if (activeAttendance) {
                      handleUpdateDraftLocal({
                        ...activeAttendance,
                        currentStep: step,
                      });
                    }
                  }}
                  onNavigateTab={(tab) => setActiveTab(tab)}
                  onRunDefectsAnalysis={handleRunDefectsAnalysis}
                  onRunReuseAnalysis={handleRunReuseAnalysis}
                  onGenerateInternalPdf={(att) =>
                    generateInternalReportPdf(att || activeAttendance!, settings)
                  }
                  onGenerateClientPdf={(att) =>
                    generateClientReportPdf(att || activeAttendance!, settings)
                  }
                  onAttendanceUpdated={(updated) => {
                    setAttendances((prev) =>
                      prev.map((a) => (a.id === updated.id ? updated : a))
                    );
                  }}
                  deviceFormFactor={deviceFormFactor}
                  stationName={stationName}
                  juliaData={juliaData}
                />

                {/* Summary KPI Strip */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-5 rounded-xl bg-white border border-[#E5DEC9]">
                    <p className="text-xs text-[#6B6257]">Total de Atendimentos</p>
                    <p className="text-2xl font-bold text-[#181512] mt-1 tabular-nums">
                      {attendances.length}
                    </p>
                    <p className="text-xs text-[#57534E] mt-1">
                      Gravados com fotos e histórico
                    </p>
                  </div>

                  <div className="p-5 rounded-xl bg-white border border-[#E5DEC9]">
                    <p className="text-xs text-[#6B6257]">Prontos / Em Análise</p>
                    <p className="text-2xl font-bold text-[#9A7138] mt-1 tabular-nums">
                      {
                        attendances.filter(
                          (a) =>
                            a.status === 'Pronto para análise' ||
                            a.status === 'Análise preliminar concluída' ||
                            a.status === 'Aguardando inspeção'
                        ).length
                      }
                    </p>
                    <p className="text-xs text-[#57534E] mt-1">
                      Aguardando IA ou revisão técnica
                    </p>
                  </div>

                  <div className="p-5 rounded-xl bg-white border border-[#E5DEC9]">
                    <p className="text-xs text-[#6B6257]">Revisados pelo Responsável</p>
                    <p className="text-2xl font-bold text-emerald-800 mt-1 tabular-nums">
                      {
                        attendances.filter(
                          (a) =>
                            a.reviewCompleted ||
                            a.status === 'Revisado pelo responsável' ||
                            a.status === 'Concluído'
                        ).length
                      }
                    </p>
                    <p className="text-xs text-[#57534E] mt-1">
                      Homologados para proposta final
                    </p>
                  </div>

                  <div className="p-5 rounded-xl bg-white border border-[#E5DEC9]">
                    <p className="text-xs text-[#6B6257]">Itens no Catálogo de Custos</p>
                    <p className="text-2xl font-bold text-[#181512] mt-1 tabular-nums">
                      {materials.length}
                    </p>
                    <p className="text-xs text-[#57534E] mt-1">
                      Materiais, mão de obra e frete
                    </p>
                  </div>
                </div>

                {/* Quick Selector Bar if multiple attendances */}
                {attendances.length > 0 && (
                  <div className="p-4 rounded-xl bg-white border border-[#E5DEC9] flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-xs font-semibold text-[#181512]">
                        Atendimento em Edição no Painel:
                      </span>
                      <select
                        value={activeAttendance?.id || ''}
                        onChange={(e) => setActiveAttendanceId(e.target.value)}
                        className="rounded-lg border border-[#D6CFC5] bg-[#F9F6F0] px-3 py-1.5 text-xs font-medium text-[#181512]"
                      >
                        {attendances.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.attendanceNumber} — {formatMissingText(a.clientName)} ({a.furnitureType}) [{a.status}]
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveTab('atendimentos')}
                        className="px-3 py-1.5 rounded-lg border border-[#D6CFC5] hover:bg-[#F3EFE6] text-xs font-medium text-[#181512]"
                      >
                        Ver Lista de Todos os Atendimentos
                      </button>
                    </div>
                  </div>
                )}

                {/* Active Attendance Workspace (Fabricação do Lucas vs Reforma do Pedro) */}
                {activeAttendance ? (
                  activeAttendance.orderType === 'Fabricação' ? (
                    <ManufacturingWorkspace
                      attendance={activeAttendance}
                      materialsCatalog={materials}
                      settings={settings}
                      geminiConfigured={geminiConfigured}
                      isSaving={isSaving}
                      lastSavedSuccessAt={lastSavedSuccessAt}
                      saveError={saveError}
                      onUpdateDraft={handleUpdateDraftLocal}
                      onPersistAttendance={handlePersistAttendance}
                      onUploadPhotoFile={handleUploadPhotoFile}
                      onGenerateInternalPdf={() =>
                        generateInternalReportPdf(activeAttendance, settings)
                      }
                      onGenerateClientPdf={() =>
                        generateClientReportPdf(activeAttendance, settings)
                      }
                      onNavigateToDesk={() => setActiveTab('escritorio')}
                    />
                  ) : (
                    <AttendanceWorkspace
                      attendance={activeAttendance}
                      materialsCatalog={materials}
                      settings={settings}
                      geminiConfigured={geminiConfigured}
                      isSaving={isSaving}
                      lastSavedSuccessAt={lastSavedSuccessAt}
                      saveError={saveError}
                      isAnalyzingDefects={isAnalyzingDefects}
                      isAnalyzingReuse={isAnalyzingReuse}
                      isPreparingMaterialsList={isPreparingMaterialsList}
                      aiError={aiError}
                      onNewAttendance={() => handleCreateNewAttendance('Fabricação')}
                      onUpdateDraft={handleUpdateDraftLocal}
                      onPersistAttendance={handlePersistAttendance}
                      onUploadPhotoFile={handleUploadPhotoFile}
                      onRunDefectsAnalysis={handleRunDefectsAnalysis}
                      onRunReuseAnalysis={handleRunReuseAnalysis}
                      onPrepareMaterialsList={handlePrepareMaterialsList}
                      onGenerateInternalPdf={() =>
                        generateInternalReportPdf(activeAttendance, settings)
                      }
                      onGenerateClientPdf={() =>
                        generateClientReportPdf(activeAttendance, settings)
                      }
                      onGenerateShoppingListPdf={async () => {
                        const latestList =
                          activeAttendance.materialsLists?.[
                            activeAttendance.materialsLists.length - 1
                          ];
                        if (!latestList) {
                          setAiError(
                            'Nenhuma lista de materiais preparada ainda. Clique em "Preparar Materiais da Reforma" antes de imprimir.'
                          );
                          return;
                        }
                        await generateShoppingListPdf(
                          activeAttendance,
                          latestList,
                          settings,
                          currentUser?.displayName || currentUser?.email || undefined
                        );
                      }}
                    />
                  )
                ) : (
                  <div className="rounded-xl bg-white border border-[#E5DEC9] p-10 text-center space-y-4">
                    <h2 className="text-xl font-serif-display font-bold text-[#181512]">
                      Nenhum atendimento cadastrado no momento
                    </h2>
                    <p className="text-xs text-[#6B6257] max-w-md mx-auto">
                      A base de atendimentos está limpa. Clique no botão abaixo para iniciar o atendimento <strong className="text-[#181512]">CI-2026-0001</strong> no Computador, Tablet ou Celular.
                    </p>
                    <div className="pt-2 flex justify-center">
                      <button
                        type="button"
                        onClick={() => handleCreateNewAttendance('Reforma')}
                        disabled={isSaving}
                        className="px-5 py-2.5 rounded-lg bg-[#9A7138] hover:bg-[#845E2B] text-white text-xs font-semibold flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Novo atendimento
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ABA: ESCRITÓRIO DE AGENTES (Mesas e Funções Operacionais) */}
            {activeTab === 'escritorio' && (
              <OfficeDesksHub
                attendances={attendances}
                materialsCatalog={materials}
                settings={settings}
                activeAttendanceId={activeAttendanceId}
                onSelectAttendance={(id) => setActiveAttendanceId(id)}
                onUpdateAttendance={(updated) => {
                  setAttendances((prev) =>
                    prev.map((a) => (a.id === updated.id ? updated : a))
                  );
                }}
                onNavigateTab={(tab) => setActiveTab(tab)}
                onJumpToStep={(step) => {
                  if (activeAttendance) {
                    handleUpdateDraftLocal({
                      ...activeAttendance,
                      currentStep: step,
                    });
                  }
                }}
              />
            )}

            {/* ABA 2: ATENDIMENTOS (Lista, Filtro e Abertura) */}
            {activeTab === 'atendimentos' && (
              <div className="space-y-6">
                <div className="rounded-xl bg-white border border-[#E5DEC9] p-6 space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#EFECE6]">
                    <div>
                      <h1 className="text-2xl font-serif-display font-bold text-[#181512]">
                        Gestão de Atendimentos ({attendances.length})
                      </h1>
                      <p className="text-xs text-[#6B6257]">
                        Cada atendimento mantém suas próprias fotos, análises, revisões e orçamentos de forma isolada e persistente.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 self-start">
                      {attendances.length > 0 && (
                        <>
                          {confirmClearAll ? (
                            <div className="flex items-center gap-2 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg text-xs">
                              <span className="text-red-900 font-semibold">
                                Confirmar exclusão de todos ({attendances.length})?
                              </span>
                              <button
                                type="button"
                                onClick={handleDeleteAllAttendances}
                                disabled={isSaving}
                                className="px-2.5 py-1 rounded bg-red-700 hover:bg-red-800 text-white font-semibold"
                              >
                                Sim, excluir tudo
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmClearAll(false)}
                                className="px-2 py-1 rounded border border-red-200 bg-white text-[#181512]"
                              >
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmClearAll(true)}
                              className="px-3.5 py-2.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-800 text-xs font-semibold flex items-center gap-1.5"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Excluir todos os atendimentos
                            </button>
                          )}
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => handleCreateNewAttendance('Reforma')}
                        className="px-4 py-2.5 rounded-lg bg-[#9A7138] hover:bg-[#845E2B] text-white text-xs font-semibold flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Novo atendimento
                      </button>
                    </div>
                  </div>

                  {/* Search & Filter */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-[#6B6257] absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={attendanceSearch}
                        onChange={(e) => setAttendanceSearch(e.target.value)}
                        placeholder="Buscar por número (CI-2026-...), cliente, telefone ou tipo de móvel..."
                        className="w-full rounded-lg border border-[#D6CFC5] pl-9 pr-3 py-2 text-xs"
                      />
                    </div>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="rounded-lg border border-[#D6CFC5] bg-[#F9F6F0] px-3 py-2 text-xs font-medium"
                    >
                      <option value="TODOS">Todos os Estados</option>
                      <option value="Rascunho">Rascunho</option>
                      <option value="Aguardando fotos">Aguardando fotos</option>
                      <option value="Pronto para análise">Pronto para análise</option>
                      <option value="Análise preliminar concluída">
                        Análise preliminar concluída
                      </option>
                      <option value="Aguardando inspeção">Aguardando inspeção</option>
                      <option value="Revisado pelo responsável">
                        Revisado pelo responsável
                      </option>
                      <option value="Concluído">Concluído</option>
                    </select>
                  </div>

                  {/* Table of Attendances */}
                  <div className="overflow-x-auto border border-[#E5DEC9] rounded-xl">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-[#181512] text-[#F9F6F0]">
                          <th className="py-3 px-3.5">Nº Atendimento</th>
                          <th className="py-3 px-3.5">Cliente / Telefone</th>
                          <th className="py-3 px-3.5">Móvel</th>
                          <th className="py-3 px-3.5">Fotos</th>
                          <th className="py-3 px-3.5">Estado</th>
                          <th className="py-3 px-3.5">Atualização</th>
                          <th className="py-3 px-3.5 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EFECE6]">
                        {filteredAttendances.map((att) => (
                          <tr
                            key={att.id}
                            className={`hover:bg-[#FAF7F2] ${
                              att.id === activeAttendanceId ? 'bg-[#FAF6EE]' : ''
                            }`}
                          >
                            <td className="py-3 px-3.5 font-mono font-semibold text-[#181512]">
                              <div>{att.attendanceNumber}</div>
                              <span
                                className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold mt-1 ${
                                  att.orderType === 'Fabricação'
                                    ? 'bg-blue-100 text-blue-900 border border-blue-200'
                                    : 'bg-amber-100 text-amber-900 border border-amber-200'
                                }`}
                              >
                                {att.orderType === 'Fabricação' ? 'Fabricação (Lucas)' : 'Reforma (Pedro)'}
                              </span>
                            </td>
                            <td className="py-3 px-3.5">
                              <div className="font-semibold text-[#181512]">
                                {formatMissingText(att.clientName)}
                              </div>
                              <div className="text-[#6B6257] tabular-nums">
                                {formatMissingText(att.clientPhone)}
                              </div>
                            </td>
                            <td className="py-3 px-3.5 text-[#292524]">
                              {formatMissingText(att.furnitureType)}
                            </td>
                            <td className="py-3 px-3.5 text-[#292524] font-mono font-bold">
                              {att.attendanceNumber || 'N/A'}
                            </td>
                            <td className="py-3 px-3.5 font-medium text-[#9A7138]">
                              {att.status}
                            </td>
                            <td className="py-3 px-3.5 text-[#6B6257] tabular-nums">
                              {(() => {
                                const d = new Date(att.updatedAt);
                                return isNaN(d.getTime()) ? 'Data não informada' : d.toLocaleString('pt-BR');
                              })()}
                            </td>
                            <td className="py-3 px-3.5 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveAttendanceId(att.id);
                                    setActiveTab('painel');
                                  }}
                                  className="px-3 py-1.5 rounded bg-[#181512] hover:bg-[#2E2722] text-white font-medium flex items-center gap-1"
                                >
                                  <FolderOpen className="w-3.5 h-3.5" />
                                  Abrir Fluxo
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteAttendance(att.id)}
                                  className="p-1.5 text-red-700 hover:text-red-900 rounded"
                                  title="Excluir atendimento"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Also show active attendance below so the user can edit directly on the Atendimentos tab */}
                {activeAttendance && (() => {
                  const type = activeAttendance.orderType || 'Reforma';
                  if (type === 'Fabricação') {
                    return (
                      <ManufacturingWorkspace
                        attendance={activeAttendance}
                        materialsCatalog={materials}
                        settings={settings}
                        geminiConfigured={geminiConfigured}
                        isSaving={isSaving}
                        lastSavedSuccessAt={lastSavedSuccessAt}
                        saveError={saveError}
                        onUpdateDraft={handleUpdateDraftLocal}
                        onPersistAttendance={handlePersistAttendance}
                        onUploadPhotoFile={handleUploadPhotoFile}
                        onGenerateInternalPdf={() =>
                          generateInternalReportPdf(activeAttendance, settings)
                        }
                        onGenerateClientPdf={() =>
                          generateClientReportPdf(activeAttendance, settings)
                        }
                        onNavigateToDesk={() => setActiveTab('escritorio')}
                      />
                    );
                  } else {
                    return (
                      <AttendanceWorkspace
                        attendance={activeAttendance}
                        materialsCatalog={materials}
                        settings={settings}
                        geminiConfigured={geminiConfigured}
                        isSaving={isSaving}
                        lastSavedSuccessAt={lastSavedSuccessAt}
                        saveError={saveError}
                        isAnalyzingDefects={isAnalyzingDefects}
                        isAnalyzingReuse={isAnalyzingReuse}
                        isPreparingMaterialsList={isPreparingMaterialsList}
                        aiError={aiError}
                        onNewAttendance={handleCreateNewAttendance}
                        onUpdateDraft={handleUpdateDraftLocal}
                        onPersistAttendance={handlePersistAttendance}
                        onUploadPhotoFile={handleUploadPhotoFile}
                        onRunDefectsAnalysis={handleRunDefectsAnalysis}
                        onRunReuseAnalysis={handleRunReuseAnalysis}
                        onPrepareMaterialsList={handlePrepareMaterialsList}
                        onGenerateInternalPdf={() =>
                          generateInternalReportPdf(activeAttendance, settings)
                        }
                        onGenerateClientPdf={() =>
                          generateClientReportPdf(activeAttendance, settings)
                        }
                        onGenerateShoppingListPdf={async () => {
                          const latestList =
                            activeAttendance.materialsLists?.[
                              activeAttendance.materialsLists.length - 1
                            ];
                          if (!latestList) {
                            setAiError(
                              'Nenhuma lista de materiais preparada ainda. Clique em "Preparar Materiais da Reforma" antes de imprimir.'
                            );
                            return;
                          }
                          await generateShoppingListPdf(
                            activeAttendance,
                            latestList,
                            settings,
                            currentUser?.displayName || currentUser?.email || undefined
                          );
                        }}
                      />
                    );
                  }
                })()}
              </div>
            )}

            {/* ABA 3: CLIENTES */}
            {activeTab === 'clientes' && (
              <section className="rounded-xl bg-white border border-[#E5DEC9] p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#EFECE6]">
                  <div>
                    <h1 className="text-2xl font-serif-display font-bold text-[#181512]">
                      Base de Clientes Atendidos ({clientsSummary?.length || 0})
                    </h1>
                    <p className="text-xs text-[#6B6257]">
                      Histórico consolidado de clientes, móveis avaliados e acesso rápido aos atendimentos.
                    </p>
                  </div>
                  <div className="relative w-full sm:w-72">
                    <Search className="w-4 h-4 text-[#6B6257] absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                      placeholder="Filtrar por nome ou telefone..."
                      className="w-full rounded-lg border border-[#D6CFC5] pl-9 pr-3 py-2 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {clientsSummary.map((client, idx) => (
                    <div
                      key={idx}
                      className="p-5 rounded-xl bg-[#FAF8F5] border border-[#E5DEC9] flex flex-col justify-between space-y-4"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <h3 className="text-base font-bold text-[#181512]">
                            {client.name}
                          </h3>
                          <span className="text-xs text-[#6B6257] tabular-nums">
                            {client.phone}
                          </span>
                        </div>
                        <p className="text-xs text-[#57534E] mt-1">
                          {client.attendancesCount} atendimento(s) registrado(s) · Última atualização em{' '}
                          {new Date(client.lastUpdate).toLocaleDateString('pt-BR')}
                        </p>

                        <div className="mt-3 space-y-2">
                          {client.attendances.map((att) => (
                            <div
                              key={att.id}
                              className="p-2.5 rounded-lg bg-white border border-[#E5DEC9] flex items-center justify-between text-xs"
                            >
                              <div>
                                <span className="font-mono font-semibold text-[#181512]">
                                  {att.attendanceNumber}
                                </span>
                                <span aria-hidden="true"> · </span>
                                <span>{att.furnitureType}</span>
                                <span aria-hidden="true"> · </span>
                                <span className="text-[#9A7138]">{att.status}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveAttendanceId(att.id);
                                  setActiveTab('painel');
                                }}
                                className="text-xs font-semibold text-[#181512] underline hover:text-[#9A7138]"
                              >
                                Abrir
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ABA 4: MATERIAIS, PREÇOS E SUPRIMENTOS (9 CATEGORIAS INTEGRADAS) */}
            {activeTab === 'materiais' && (
              <RawMaterialsAndPricing
                materials={materials}
                attendances={attendances}
                onSaveMaterial={handleSaveRichMaterial}
                onDeleteMaterial={handleDeleteMaterial}
                onRecalculateBudgets={handleRecalculateBudgetsFromCatalog}
              />
            )}

            {/* ABA 5: RELATÓRIOS PDF A4 */}
            {activeTab === 'relatorios' && (
              <section className="rounded-xl bg-white border border-[#E5DEC9] p-6 space-y-6">
                <div className="pb-4 border-b border-[#EFECE6]">
                  <h1 className="text-2xl font-serif-display font-bold text-[#181512]">
                    Central de Relatórios PDF A4 — Castros Interiores
                  </h1>
                  <p className="text-xs text-[#6B6257]">
                    Gere e baixe o Relatório Técnico Interno (com custos internos e diagnóstico completo) ou o Relatório do Cliente (com proposta, fotos e condições comerciais, sem expor custos internos).
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {attendances.map((att) => {
                    const summary = calculateBudgetSummary(att.budget);
                    const isConfirmed =
                      att.reviewCompleted && att.budget.confirmedByResponsible;
                    const firstPhoto = att.photos[0];

                    return (
                      <div
                        key={att.id}
                        className="p-5 rounded-xl bg-[#FAF8F5] border border-[#E5DEC9] flex flex-col lg:flex-row lg:items-center justify-between gap-5"
                      >
                        <div className="flex flex-col sm:flex-row items-start gap-4">
                          {firstPhoto && (
                            <div className="w-28 h-20 rounded-lg overflow-hidden border border-[#D6CFC5] shrink-0 bg-[#EDE7DC]">
                              <ResilientImage
                                src={
                                  firstPhoto.imageUrl ||
                                  firstPhoto.thumbnailDataUrl ||
                                  ''
                                }
                                alt={att.furnitureType}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2 text-xs text-[#6B6257]">
                              <span className="font-mono font-bold text-[#181512]">
                                {att.attendanceNumber}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span>{att.status}</span>
                              <span aria-hidden="true">·</span>
                              <span>
                                {isConfirmed
                                  ? `Homologado por ${att.reviewerName}`
                                  : 'Avaliação Preliminar (inclui aviso automático no PDF)'}
                              </span>
                            </div>
                            <h3 className="text-base font-bold text-[#181512]">
                              {formatMissingText(att.clientName)} —{' '}
                              {formatMissingText(att.furnitureType)}
                            </h3>
                            <p className="text-xs text-[#57534E]">
                              Fotos: {att.photos?.length || 0} · Proposta Selecionada:{' '}
                              <strong>{att.selectedProposalTier}</strong> · Custo Interno:{' '}
                              <span className="tabular-nums font-semibold">
                                {formatCurrencyBRL(summary.totalInternalCostCents)}
                                {summary.hasAnyPendingItems ? ' (parcial)' : ''}
                              </span>{' '}
                              · Preço de Venda:{' '}
                              <span className="tabular-nums font-semibold">
                                {formatCurrencyBRL(summary.sellingPriceCents)}
                              </span>
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveAttendanceId(att.id);
                              setActiveTab('painel');
                            }}
                            className="px-3.5 py-2 rounded-lg border border-[#D6CFC5] bg-white hover:bg-[#F3EFE6] text-xs font-medium text-[#181512]"
                          >
                            Revisar Atendimento
                          </button>
                          <button
                            type="button"
                            onClick={() => generateInternalReportPdf(att, settings)}
                            className="px-4 py-2 rounded-lg bg-[#1F5E3B] hover:bg-[#184B2F] text-white text-xs font-semibold flex items-center gap-1.5"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Gerar relatório interno (PDF)
                          </button>
                          <button
                            type="button"
                            onClick={() => generateClientReportPdf(att, settings)}
                            className="px-4 py-2 rounded-lg bg-[#9A7138] hover:bg-[#845E2B] text-white text-xs font-semibold flex items-center gap-1.5"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Gerar relatório do cliente (PDF)
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ABA ESPECIAL: CENTRAL DE AGENTES IA & POSTOS */}
            {activeTab === 'agentes' && (
              <AgentsControlPanel
                attendances={attendances}
                activeAttendance={activeAttendance}
                onSelectAttendance={(id) => setActiveAttendanceId(id)}
                settings={settings}
                onSaveSettings={handlePersistSettings}
                isSavingSettings={isSaving}
                onRunDefectsAgent={async () => {
                  await handleRunDefectsAnalysis();
                  setActiveTab('painel');
                }}
                onRunReuseAndProposalsAgent={async () => {
                  await handleRunReuseAnalysis();
                  setActiveTab('painel');
                }}
                isAnalyzingDefects={isAnalyzingDefects}
                isAnalyzingReuse={isAnalyzingReuse}
                deviceFormFactor={deviceFormFactor}
                stationName={stationName}
                onActivateStationMode={handleActivateStationMode}
                onAttendanceUpdated={(updated) => {
                  setAttendances((prev) =>
                    prev.map((a) => (a.id === updated.id ? updated : a))
                  );
                }}
              />
            )}

            {/* ABA 6: CONFIGURAÇÕES */}
            {activeTab === 'configuracoes' && (
              <section className="rounded-xl bg-white border border-[#E5DEC9] p-6 space-y-6">
                <div className="pb-4 border-b border-[#EFECE6]">
                  <h1 className="text-2xl font-serif-display font-bold text-[#181512]">
                    Configurações do Sistema e Modelo Claude
                  </h1>
                  <p className="text-xs text-[#6B6257]">
                    Configure os parâmetros operacionais da Castros Interiores e o modelo Claude utilizado no servidor. O sistema nunca inventa CNPJ, endereço ou assinatura nos relatórios.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#F9F6F0] border border-[#E5DEC9] space-y-2 text-xs">
                  <div className="flex items-center gap-2 font-semibold text-[#181512]">
                    {geminiConfigured ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-700" />
                        <span>
                          Integração com Claude no Servidor: Ativa (variável ANTHROPIC_API_KEY detectada com segurança no servidor)
                        </span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 text-amber-700" />
                        <span>
                          Integração com Claude no Servidor: Pendente (configure ANTHROPIC_API_KEY no painel Secrets do ambiente)
                        </span>
                      </>
                    )}
                  </div>
                  <p className="text-[#57534E]">
                    As chamadas à IA são executadas exclusivamente no servidor Express (<code className="font-mono">/api/ai/analyze-defects</code> e <code className="font-mono">/api/ai/analyze-reuse</code>), enviando os bytes reais das imagens sem expor a chave no navegador.
                  </p>
                </div>

                <form onSubmit={handleSaveSettings} className="space-y-4 max-w-2xl">
                  <div>
                    <label className="block text-xs font-medium text-[#57534E] mb-1">
                      Nome da Oficina / Estúdio nos Relatórios
                    </label>
                    <input
                      type="text"
                      value={settings.workshopName}
                      onChange={(e) =>
                        setSettings({ ...settings, workshopName: e.target.value })
                      }
                      className="w-full rounded-lg border border-[#D6CFC5] px-3.5 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#57534E] mb-1">
                      Nome Padrão do Responsável Técnico (Opcional)
                    </label>
                    <input
                      type="text"
                      value={settings.responsibleDefaultName}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          responsibleDefaultName: e.target.value,
                        })
                      }
                      placeholder="Deixe em branco para preencher em cada atendimento"
                      className="w-full rounded-lg border border-[#D6CFC5] px-3.5 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#57534E] mb-1">
                      Telefone / WhatsApp de Contato
                    </label>
                    <input
                      type="text"
                      value={settings.phoneWhatsapp}
                      onChange={(e) =>
                        setSettings({ ...settings, phoneWhatsapp: e.target.value })
                      }
                      className="w-full rounded-lg border border-[#D6CFC5] px-3.5 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#57534E] mb-1">
                      Modelo Claude com Suporte Multimodal a Imagens
                    </label>
                    <select
                      value={settings.aiModel}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          aiModel: e.target.value as WorkshopSettings['aiModel'],
                        })
                      }
                      className="w-full rounded-lg border border-[#D6CFC5] bg-white px-3.5 py-2 text-sm"
                    >
                      <option value="claude-sonnet-5">
                        claude-sonnet-5 (Recomendado — Análise técnica multimodal rápida e estruturada)
                      </option>
                      <option value="claude-opus-5-5">
                        claude-opus-5-5 (Maior qualidade de raciocínio, mais lento)
                      </option>
                      <option value="claude-haiku-5-5">
                        claude-haiku-5-5 (Ultra-rápido e leve para alta demanda)
                      </option>
                    </select>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-5 py-2.5 rounded-lg bg-[#181512] hover:bg-[#2E2722] text-white text-xs font-semibold"
                    >
                      {isSaving ? 'Salvando...' : 'Salvar Configurações'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSyncModalOpen(true)}
                      className="px-4 py-2.5 rounded-lg border border-[#9A7138] bg-[#FAF6EE] hover:bg-[#F3EFE6] text-[#181512] text-xs font-semibold flex items-center gap-2"
                    >
                      <QrCode className="w-4 h-4 text-[#9A7138]" />
                      Gerenciar Celular, Tablet e Computador (QR Code & Instalação)
                    </button>
                  </div>
                </form>

                <div className="pt-6 border-t border-[#EFECE6] space-y-4">
                  <div>
                    <h2 className="text-lg font-serif-display font-bold text-[#181512]">
                      Identidade Visual dos Agentes
                    </h2>
                    <p className="text-xs text-[#6B6257]">
                      Envie o retrato de cada assistente virtual e a imagem de capa do escritório. Os arquivos ficam salvos no servidor e aparecem nos três aparelhos. Nenhuma foto é gerada automaticamente — enquanto não houver envio, o agente aparece com as iniciais do nome.
                    </p>
                  </div>

                  {(() => {
                    const missingCount = OFFICE_DESKS.filter(
                      (d) => !settings.agentPortraitUpdatedAt?.[d.id]
                    ).length;
                    return missingCount > 0 ? (
                      <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                        {missingCount} de {OFFICE_DESKS.length} agente(s) ainda sem retrato próprio enviado.
                      </p>
                    ) : (
                      <p className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                        Todos os {OFFICE_DESKS.length} agentes já têm retrato enviado.
                      </p>
                    );
                  })()}

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {OFFICE_DESKS.map((desk) => (
                      <div
                        key={desk.id}
                        className="flex items-center gap-3 p-3 rounded-xl border border-[#E5DEC9] bg-[#FAF8F5]"
                      >
                        <AgentPortrait
                          deskId={desk.id}
                          name={desk.name}
                          portraitUpdatedAt={settings.agentPortraitUpdatedAt?.[desk.id]}
                          size="lg"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-[#181512] truncate">{desk.name}</p>
                          <p className="text-[10px] text-[#6B6257] truncate">{desk.role}</p>
                          <button
                            type="button"
                            onClick={() => setPortraitUploadTarget(desk.id)}
                            className="mt-1 text-[11px] font-medium text-[#845E2B] hover:underline"
                          >
                            {settings.agentPortraitUpdatedAt?.[desk.id]
                              ? 'Substituir foto'
                              : 'Enviar foto'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-xl border border-[#E5DEC9] bg-[#FAF8F5] max-w-md">
                    <div className="w-20 h-14 rounded-lg overflow-hidden border border-[#D6CFC5] bg-[#181512] flex items-center justify-center shrink-0">
                      {settings.officeCoverImageUpdatedAt ? (
                        <img
                          src={`/api/photos/office-cover-image.jpg?v=${encodeURIComponent(settings.officeCoverImageUpdatedAt)}`}
                          alt="Imagem de capa do escritório"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="w-5 h-5 text-[#6B6257]" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-[#181512]">Imagem de Capa do Escritório</p>
                      <p className="text-[10px] text-[#6B6257]">
                        Usada na tela de entrada. Prefira um estofado ou ambiente da própria Castros Interiores.
                      </p>
                      <button
                        type="button"
                        onClick={() => setPortraitUploadTarget('office-cover')}
                        className="mt-1 text-[11px] font-medium text-[#845E2B] hover:underline"
                      >
                        {settings.officeCoverImageUpdatedAt ? 'Substituir imagem' : 'Enviar imagem'}
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {portraitUploadTarget && (
        <PortraitUploadModal
          title={
            portraitUploadTarget === 'office-cover'
              ? 'Imagem de Capa do Escritório'
              : `Retrato de ${OFFICE_DESKS.find((d) => d.id === portraitUploadTarget)?.name || ''}`
          }
          description={
            portraitUploadTarget === 'office-cover'
              ? 'Escolha uma foto de estofado ou ambiente da oficina. Formato largo (banner).'
              : 'Escolha uma foto com o rosto bem enquadrado. Será usada no cartão, na mesa e na conversa deste agente.'
          }
          aspectRatio={portraitUploadTarget === 'office-cover' ? 2.4 : 1}
          outputSize={
            portraitUploadTarget === 'office-cover'
              ? { width: 1200, height: 500 }
              : { width: 480, height: 480 }
          }
          isSaving={isUploadingPortrait}
          onCancel={() => setPortraitUploadTarget(null)}
          onSave={(dataUrl) =>
            portraitUploadTarget === 'office-cover'
              ? handleUploadOfficeCover(dataUrl)
              : handleUploadAgentPortrait(portraitUploadTarget, dataUrl)
          }
        />
      )}

      {/* Corporate Multi-Device Sync & PWA Install Modal */}
      <CorporateSyncModal
        isOpen={syncModalOpen}
        onClose={() => setSyncModalOpen(false)}
        deviceId={deviceId}
        formFactor={deviceFormFactor}
        stationName={stationName}
        onUpdateDeviceIdentity={handleUpdateDeviceIdentity}
        connectedDevices={connectedDevices}
        sseConnected={sseConnected}
        sharedAppUrl={sharedAppUrl}
        activeAttendanceNumber={activeAttendance?.attendanceNumber}
        activeStep={activeAttendance?.currentStep}
        onBroadcastFocusAttendance={handleBroadcastFocusAttendance}
      />

      {/* Ergonomic Mobile & Tablet Bottom Bar (visible on Celular & compact Tablet screens) */}
      <nav
        aria-label="Navegação rápida para Celular e Tablet"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-[#181512] text-[#F9F6F0] border-t border-[#2E2722] px-2 py-1.5 grid grid-cols-5 gap-1 shadow-lg"
      >
        <button
          type="button"
          onClick={() => setActiveTab('painel')}
          className={`flex flex-col items-center justify-center py-1.5 rounded-lg text-[11px] font-medium min-h-[44px] ${
            activeTab === 'painel' ? 'bg-[#9A7138] text-white' : 'text-[#D6CFC5]'
          }`}
        >
          <Monitor className="w-4 h-4 mb-0.5" />
          <span>Painel</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('atendimentos')}
          className={`flex flex-col items-center justify-center py-1.5 rounded-lg text-[11px] font-medium min-h-[44px] ${
            activeTab === 'atendimentos' ? 'bg-[#9A7138] text-white' : 'text-[#D6CFC5]'
          }`}
        >
          <FolderOpen className="w-4 h-4 mb-0.5" />
          <span>Lista ({attendances.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (activeAttendance) {
              handleUpdateDraftLocal({ ...activeAttendance, currentStep: 2 });
            }
            setActiveTab('painel');
          }}
          className="flex flex-col items-center justify-center py-1.5 rounded-lg text-[11px] font-semibold min-h-[44px] bg-[#26211C] text-[#F9F6F0] border border-[#9A7138]/50"
        >
          <Camera className="w-4 h-4 mb-0.5 text-[#9A7138]" />
          <span>Fotos</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('relatorios')}
          className={`flex flex-col items-center justify-center py-1.5 rounded-lg text-[11px] font-medium min-h-[44px] ${
            activeTab === 'relatorios' ? 'bg-[#9A7138] text-white' : 'text-[#D6CFC5]'
          }`}
        >
          <FileText className="w-4 h-4 mb-0.5" />
          <span>PDF A4</span>
        </button>

        <button
          type="button"
          onClick={() => setSyncModalOpen(true)}
          className="flex flex-col items-center justify-center py-1.5 rounded-lg text-[11px] font-medium min-h-[44px] text-[#D6CFC5] hover:text-white"
        >
          <QrCode className="w-4 h-4 mb-0.5 text-emerald-400" />
          <span>3 Aparelhos</span>
        </button>
      </nav>

      {/* Quiet Footer */}
      <footer className="mt-12 mb-16 lg:mb-0 border-t border-[#E5DEC9] bg-[#FAF8F5] py-5 px-6 text-xs text-[#6B6257]">
        <div className="max-w-[1360px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            Castros Interiores — Sistema Corporativo Integrado (Computador · Tablet · Celular)
          </span>
          <span>
            Sincronização em tempo real · Armazenamento persistente · Relatórios A4
          </span>
        </div>
      </footer>
    </div>
  );
}
