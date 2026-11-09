// Cliente Firestore falso, em memória, usado SÓ nos testes deste diretório
// (firestoreCollectionsMigration.selftest.ts). Não há emulador real do
// Firestore disponível nesta sessão (sem acesso de rede ao download dele) —
// este fake implementa o mesmo contrato mínimo (FirestoreLikeClient) usado
// pela migração, incluindo a semântica atômica de `.create()` que é o ponto
// central do teste de concorrência. É uma limitação de teste deliberada e
// declarada no relatório: isto prova a LÓGICA da migração e do primitivo de
// dedup, não o comportamento exato do serviço Firestore real (latência,
// limites de transação, cotas).

import {
  AlreadyExistsError,
  type FirestoreLikeClient,
  type FirestoreLikeCollectionRef,
  type FirestoreLikeDocRef,
} from './firestoreCollectionsMigration.ts';

export class FakeFirestoreClient implements FirestoreLikeClient {
  private readonly collections = new Map<string, Map<string, unknown>>();

  private getOrCreateCollection(path: string): Map<string, unknown> {
    let col = this.collections.get(path);
    if (!col) {
      col = new Map();
      this.collections.set(path, col);
    }
    return col;
  }

  collection<T>(path: string): FirestoreLikeCollectionRef<T> {
    const col = this.getOrCreateCollection(path);
    return {
      doc(id: string): FirestoreLikeDocRef<T> {
        return {
          id,
          path: `${path}/${id}`,
          async get() {
            const exists = col.has(id);
            return { exists, data: () => (exists ? (structuredClone(col.get(id)) as T) : undefined) };
          },
          async set(data: T) {
            col.set(id, structuredClone(data));
          },
          async create(data: T) {
            if (col.has(id)) throw new AlreadyExistsError(`${path}/${id}`);
            col.set(id, structuredClone(data));
          },
          async delete() {
            col.delete(id);
          },
        };
      },
      async listDocumentIds() {
        return [...col.keys()];
      },
    };
  }

  // Helpers só de teste, para inspecionar o estado interno sem precisar
  // passar por .get()/.listDocumentIds() em todo lugar.
  dumpCollection(path: string): Record<string, unknown> {
    const col = this.collections.get(path) || new Map();
    return Object.fromEntries(col.entries());
  }

  corruptField(path: string, id: string, field: string, value: unknown): void {
    const col = this.collections.get(path);
    if (!col || !col.has(id)) throw new Error(`doc inexistente no fake: ${path}/${id}`);
    const doc = col.get(id) as Record<string, unknown>;
    doc[field] = value;
  }
}
