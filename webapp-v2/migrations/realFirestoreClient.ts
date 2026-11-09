// Adapta o Firestore real (via firebase-admin, incluindo contra o EMULADOR
// OFICIAL quando FIRESTORE_EMULATOR_HOST está definido) ao mesmo contrato
// FirestoreLikeClient usado pela migração — para rodar exatamente os mesmos
// testes (firestoreCollectionsMigration.emulatortest.ts) contra o serviço
// real, não só contra o fake em memória.
//
// Nunca usar isto sem FIRESTORE_EMULATOR_HOST apontando para o emulador
// local — sem essa variável, firebase-admin se conecta ao Firestore de
// produção de verdade.

import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import {
  AlreadyExistsError,
  type FirestoreLikeClient,
  type FirestoreLikeCollectionRef,
  type FirestoreLikeDocRef,
} from './firestoreCollectionsMigration.ts';

export function assertEmulatorConfigured(): void {
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error(
      'FIRESTORE_EMULATOR_HOST não está definido — recusando conectar, para nunca rodar isto contra o Firestore de produção por engano.'
    );
  }
}

export function createEmulatorFirestore(projectId: string): Firestore {
  assertEmulatorConfigured();
  const apps = getApps();
  const app = apps.find((a) => a.name === projectId) || initializeApp({ projectId }, projectId);
  return getFirestore(app);
}

export class RealFirestoreClient implements FirestoreLikeClient {
  constructor(private readonly db: Firestore) {}

  collection<T>(path: string): FirestoreLikeCollectionRef<T> {
    const db = this.db;
    const colRef = db.collection(path);
    return {
      doc(id: string): FirestoreLikeDocRef<T> {
        const docRef = colRef.doc(id);
        return {
          id,
          path: docRef.path,
          async get() {
            const snap = await docRef.get();
            return { exists: snap.exists, data: () => snap.data() as T | undefined };
          },
          async set(data: T) {
            await docRef.set(data as object);
          },
          async create(data: T) {
            try {
              await docRef.create(data as object);
            } catch (err) {
              // google-cloud/firestore sinaliza "já existe" com code 6 (ALREADY_EXISTS)
              const code = (err as { code?: number })?.code;
              if (code === 6) throw new AlreadyExistsError(docRef.path);
              throw err;
            }
          },
          async delete() {
            await docRef.delete();
          },
        };
      },
      async listDocumentIds() {
        const snaps = await colRef.listDocuments();
        return snaps.map((d) => d.id);
      },
    };
  }
}
