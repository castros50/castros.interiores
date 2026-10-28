import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { AttendanceRecord, MaterialCatalogItem } from './types';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

// Validation constants synchronized with firebase-blueprint.json & firestore.rules
const ID_REGEX = /^[a-zA-Z0-9_-]+$/;

function sanitizeId(id: string): string {
  const cleaned = id.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128);
  return cleaned.length > 0 && ID_REGEX.test(cleaned) ? cleaned : 'item-1';
}

function truncateString(val: string | undefined | null, maxLen: number, fallback = 'não informado'): string {
  const str = (val ?? '').trim();
  if (!str) return fallback.slice(0, maxLen);
  return str.slice(0, maxLen);
}

export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signOutUser(): Promise<void> {
  await firebaseSignOut(auth);
}

export { onAuthStateChanged };
export type { User };

export async function syncAttendanceToFirestore(
  record: AttendanceRecord,
  isExistingInFirestore: boolean
): Promise<void> {
  if (!auth.currentUser || !auth.currentUser.emailVerified) return;

  const docId = sanitizeId(record.id);
  const path = `attendances/${docId}`;

  // Strip heavy base64 images from Firestore payload to stay well under 800KB limit;
  // full high-res photos remain stored on the private server storage (/api/photos/:id)
  const lightweightRecord: AttendanceRecord = {
    ...record,
    ownerId: auth.currentUser.uid,
    photos: record.photos.map((p) => ({
      ...p,
      thumbnailDataUrl: p.thumbnailDataUrl && p.thumbnailDataUrl.length < 45000 ? p.thumbnailDataUrl : undefined,
    })),
  };

  const payloadJson = JSON.stringify(lightweightRecord).slice(0, 790000);
  const clientName = truncateString(record.clientName, 200, 'não informado');
  const clientPhone = truncateString(record.clientPhone, 60, 'não informado');
  const furnitureType = truncateString(record.furnitureType, 120, 'Sofá');
  const attendanceNumber = truncateString(record.attendanceNumber, 64, 'CI-2026-0001');

  try {
    if (!isExistingInFirestore) {
      await setDoc(doc(db, 'attendances', docId), {
        ownerId: auth.currentUser.uid,
        attendanceNumber,
        clientName,
        clientPhone,
        furnitureType,
        status: record.status,
        payloadJson,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(doc(db, 'attendances', docId), {
        clientName,
        clientPhone,
        furnitureType,
        status: record.status,
        payloadJson,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    // If update failed because doc didn't exist yet in Firestore, try setDoc
    if (isExistingInFirestore && error instanceof Error && error.message.includes('No document to update')) {
      try {
        await setDoc(doc(db, 'attendances', docId), {
          ownerId: auth.currentUser.uid,
          attendanceNumber,
          clientName,
          clientPhone,
          furnitureType,
          status: record.status,
          payloadJson,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        return;
      } catch (createErr) {
        handleFirestoreError(createErr, OperationType.CREATE, path);
      }
    }
    handleFirestoreError(
      error,
      isExistingInFirestore ? OperationType.UPDATE : OperationType.CREATE,
      path
    );
  }
}

export async function loadAttendancesFromFirestore(): Promise<AttendanceRecord[]> {
  if (!auth.currentUser || !auth.currentUser.emailVerified) return [];
  const path = 'attendances';
  try {
    const q = query(collection(db, 'attendances'), where('ownerId', '==', auth.currentUser.uid));
    const snap = await getDocs(q);
    const results: AttendanceRecord[] = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      if (data && typeof data.payloadJson === 'string') {
        try {
          const parsed = JSON.parse(data.payloadJson) as AttendanceRecord;
          results.push(parsed);
        } catch {
          // ignore malformed payload
        }
      }
    });
    return results;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export function subscribeToFirestoreAttendances(
  onUpdate: (records: AttendanceRecord[]) => void
): () => void {
  if (!auth.currentUser || !auth.currentUser.emailVerified) {
    return () => {};
  }
  const path = 'attendances';
  const q = query(
    collection(db, 'attendances'),
    where('ownerId', '==', auth.currentUser.uid)
  );
  return onSnapshot(
    q,
    (snap) => {
      const results: AttendanceRecord[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data && typeof data.payloadJson === 'string') {
          try {
            const parsed = JSON.parse(data.payloadJson) as AttendanceRecord;
            results.push(parsed);
          } catch {
            // ignore malformed payload
          }
        }
      });
      onUpdate(results);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch {
        // already logged
      }
    }
  );
}

export async function deleteAttendanceFromFirestore(attendanceId: string): Promise<void> {
  if (!auth.currentUser || !auth.currentUser.emailVerified) return;
  const docId = sanitizeId(attendanceId);
  const path = `attendances/${docId}`;
  try {
    await deleteDoc(doc(db, 'attendances', docId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function deleteAllAttendancesFromFirestore(): Promise<void> {
  if (!auth.currentUser || !auth.currentUser.emailVerified) return;
  const path = 'attendances';
  try {
    const q = query(
      collection(db, 'attendances'),
      where('ownerId', '==', auth.currentUser.uid)
    );
    const snap = await getDocs(q);
    await Promise.all(snap.docs.map((d) => deleteDoc(doc(db, 'attendances', d.id))));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function syncMaterialToFirestore(
  item: MaterialCatalogItem,
  isExistingInFirestore: boolean
): Promise<void> {
  if (!auth.currentUser || !auth.currentUser.emailVerified) return;
  const docId = sanitizeId(item.id);
  const path = `materials/${docId}`;
  const name = truncateString(item.name, 200, 'Item');
  const category = truncateString(item.category, 80, 'Material');
  const unit = truncateString(item.unit, 40, 'un');
  const supplier = (item.supplier ?? '').trim().slice(0, 200);
  const unitCostCents = Math.max(0, Math.min(1000000000, Math.round(item.unitCostCents || 0)));

  try {
    if (!isExistingInFirestore) {
      await setDoc(doc(db, 'materials', docId), {
        ownerId: auth.currentUser.uid,
        name,
        category,
        unit,
        unitCostCents,
        supplier,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(doc(db, 'materials', docId), {
        name,
        category,
        unit,
        unitCostCents,
        supplier,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    if (isExistingInFirestore && error instanceof Error && error.message.includes('No document to update')) {
      try {
        await setDoc(doc(db, 'materials', docId), {
          ownerId: auth.currentUser.uid,
          name,
          category,
          unit,
          unitCostCents,
          supplier,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        return;
      } catch (createErr) {
        handleFirestoreError(createErr, OperationType.CREATE, path);
      }
    }
    handleFirestoreError(
      error,
      isExistingInFirestore ? OperationType.UPDATE : OperationType.CREATE,
      path
    );
  }
}
