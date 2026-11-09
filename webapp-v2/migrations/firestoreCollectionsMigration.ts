// Migração do documento único do Firestore (appState/main) para coleções por
// entidade — PREPARADA, NÃO EXECUTADA. Este arquivo não é importado por
// server.ts nem por nenhuma rota: nada aqui roda automaticamente. É chamado
// manualmente, de um script separado, só quando alguém decidir migrar de
// verdade (ver migrations/README.md).
//
// Por que migrar: o documento único está perto do limite de 1.048.576 bytes
// por documento do Firestore (visto em produção: 1.045.502 bytes, 99,7%).
// Acima do limite, toda gravação é rejeitada. Coleções por entidade não têm
// esse teto agregado — cada atendimento/mensagem é o seu próprio documento,
// bem abaixo do limite individualmente.
//
// Por que isto também corrige concorrência entre instâncias: hoje, duas
// instâncias do Cloud Run processando a mesma mensagem ao mesmo tempo fazem
// "ler o documento inteiro, checar se o ID já está lá, escrever o documento
// inteiro de volta" — duas leituras concorrentes podem não ver a escrita uma
// da outra (race clássica de read-modify-write). Com coleções, o marcador de
// deduplicação de cada mensagem é o PRÓPRIO ID do documento
// (whatsappMessageDedup/{externalMessageId}), escrito com `.create()` em vez
// de `.set()` — o Firestore rejeita atomicamente a segunda tentativa de
// criar o mesmo documento, sem nenhuma janela de corrida possível, mesmo com
// duas instâncias diferentes tentando no mesmo instante.

export interface MigrationAttendance {
  id: string;
  [key: string]: unknown;
}

export interface MigrationChatMessage {
  id: string;
  externalMessageId?: string;
  externalChannel?: string;
  [key: string]: unknown;
}

// Subconjunto mínimo do PersistentStore real (server.ts) necessário para a
// migração — definido aqui, sem importar server.ts, para não disparar a
// inicialização do servidor (Firebase Admin, leitura de
// firebase-applet-config.json, etc.) só por importar este arquivo.
export interface LegacyStoreSnapshot {
  attendances: MigrationAttendance[];
  agentChats?: Record<string, MigrationChatMessage[]>;
}

// --- Interface mínima de um cliente "parecido com Firestore" --------------
// Implementada tanto pelo Firestore real (firebase-admin) quanto pelo fake
// em memória usado nos testes (ver firestoreCollectionsMigration.selftest.ts).
// Deliberadamente pequena: só os métodos que esta migração usa.

export class AlreadyExistsError extends Error {
  constructor(path: string) {
    super(`Documento já existe: ${path}`);
    this.name = 'AlreadyExistsError';
  }
}

export interface FirestoreLikeDocRef<T> {
  readonly id: string;
  readonly path: string;
  get(): Promise<{ exists: boolean; data(): T | undefined }>;
  set(data: T): Promise<void>;
  /** Deve rejeitar com AlreadyExistsError se o documento já existir. */
  create(data: T): Promise<void>;
  delete(): Promise<void>;
}

export interface FirestoreLikeCollectionRef<T> {
  doc(id: string): FirestoreLikeDocRef<T>;
  listDocumentIds(): Promise<string[]>;
}

export interface FirestoreLikeClient {
  collection<T>(path: string): FirestoreLikeCollectionRef<T>;
}

// --- Nomes das coleções novas ----------------------------------------------

export const COLLECTION_ATTENDANCES = 'attendances_v2';
export const COLLECTION_CHAT_MESSAGE_PREFIX = 'agentChats_v2_'; // + deskId
export const COLLECTION_WHATSAPP_DEDUP = 'whatsappMessageDedup';

function chatCollectionName(deskId: string): string {
  return `${COLLECTION_CHAT_MESSAGE_PREFIX}${deskId}`;
}

// --- Plano de migração (puro, sem I/O — fácil de testar isoladamente) -----

export interface MigrationPlan {
  attendanceWrites: Array<{ id: string; data: MigrationAttendance }>;
  chatMessageWrites: Array<{ deskId: string; id: string; data: MigrationChatMessage }>;
  // Só mensagens do WhatsApp com externalMessageId entram aqui — é a base do
  // novo dedup atômico por .create().
  whatsappDedupWrites: Array<{ externalMessageId: string; data: { attendanceId?: string; deskId: string; chatMessageId: string } }>;
}

export function buildMigrationPlan(snapshot: LegacyStoreSnapshot): MigrationPlan {
  const attendanceWrites = snapshot.attendances.map((a) => ({ id: a.id, data: a }));

  const chatMessageWrites: MigrationPlan['chatMessageWrites'] = [];
  const whatsappDedupWrites: MigrationPlan['whatsappDedupWrites'] = [];
  const seenDedupIds = new Set<string>();

  for (const [deskId, messages] of Object.entries(snapshot.agentChats || {})) {
    for (const msg of messages) {
      chatMessageWrites.push({ deskId, id: msg.id, data: msg });
      if (msg.externalChannel === 'whatsapp' && msg.externalMessageId) {
        // No dado legado, uma mensagem duplicada nunca devia ter sido
        // gravada duas vezes — mas a migração não assume isso: se encontrar
        // mais de uma, mantém só a primeira ocorrência e registra no
        // relatório (ver runMigration -> result.duplicateExternalIdsFound).
        if (!seenDedupIds.has(msg.externalMessageId)) {
          seenDedupIds.add(msg.externalMessageId);
          whatsappDedupWrites.push({
            externalMessageId: msg.externalMessageId,
            data: { attendanceId: msg.attendanceId as string | undefined, deskId, chatMessageId: msg.id },
          });
        }
      }
    }
  }

  return { attendanceWrites, chatMessageWrites, whatsappDedupWrites };
}

// --- Execução (escreve nas coleções novas; NUNCA toca no documento único) -

export interface MigrationResult {
  dryRun: boolean;
  attendancesWritten: number;
  chatMessagesWritten: number;
  dedupMarkersWritten: number;
  dedupMarkersAlreadyPresent: number; // .create() rejeitado — resumo de uma migração parcial anterior
  duplicateExternalIdsFoundInLegacy: number;
  errors: Array<{ phase: string; id: string; message: string }>;
}

const BATCH_SIZE = 400; // margem de segurança sob o limite de 500 ops/batch do Firestore

async function writeInChunks<T>(items: T[], size: number, fn: (chunk: T[]) => Promise<void>): Promise<void> {
  for (let i = 0; i < items.length; i += size) {
    await fn(items.slice(i, i + size));
  }
}

// Idempotente de propósito: pode ser executada de novo após uma falha
// parcial sem duplicar nada (.set() sobrescreve com o mesmo valor; .create()
// nos dedup markers simplesmente acusa "já existe" para os que já foram
// migrados, contabilizado em dedupMarkersAlreadyPresent, não tratado como
// erro).
export async function runMigration(
  client: FirestoreLikeClient,
  snapshot: LegacyStoreSnapshot,
  options: { dryRun: boolean }
): Promise<MigrationResult> {
  const plan = buildMigrationPlan(snapshot);
  const result: MigrationResult = {
    dryRun: options.dryRun,
    attendancesWritten: 0,
    chatMessagesWritten: 0,
    dedupMarkersWritten: 0,
    dedupMarkersAlreadyPresent: 0,
    duplicateExternalIdsFoundInLegacy: 0,
    errors: [],
  };

  // Detecta duplicatas no dado legado só para relatório (buildMigrationPlan
  // já as filtra, mas o operador humano precisa saber se isso aconteceu).
  const allWhatsappIds = Object.values(snapshot.agentChats || {})
    .flat()
    .filter((m) => m.externalChannel === 'whatsapp' && m.externalMessageId)
    .map((m) => m.externalMessageId as string);
  result.duplicateExternalIdsFoundInLegacy = allWhatsappIds.length - new Set(allWhatsappIds).size;

  if (options.dryRun) {
    result.attendancesWritten = plan.attendanceWrites.length;
    result.chatMessagesWritten = plan.chatMessageWrites.length;
    result.dedupMarkersWritten = plan.whatsappDedupWrites.length;
    return result;
  }

  const attendancesCol = client.collection<MigrationAttendance>(COLLECTION_ATTENDANCES);
  await writeInChunks(plan.attendanceWrites, BATCH_SIZE, async (chunk) => {
    for (const item of chunk) {
      try {
        await attendancesCol.doc(item.id).set(item.data);
        result.attendancesWritten++;
      } catch (err) {
        result.errors.push({ phase: 'attendances', id: item.id, message: err instanceof Error ? err.message : String(err) });
      }
    }
  });

  await writeInChunks(plan.chatMessageWrites, BATCH_SIZE, async (chunk) => {
    for (const item of chunk) {
      try {
        await client.collection<MigrationChatMessage>(chatCollectionName(item.deskId)).doc(item.id).set(item.data);
        result.chatMessagesWritten++;
      } catch (err) {
        result.errors.push({ phase: 'chatMessages', id: item.id, message: err instanceof Error ? err.message : String(err) });
      }
    }
  });

  const dedupCol = client.collection<{ attendanceId?: string; deskId: string; chatMessageId: string }>(COLLECTION_WHATSAPP_DEDUP);
  await writeInChunks(plan.whatsappDedupWrites, BATCH_SIZE, async (chunk) => {
    for (const item of chunk) {
      try {
        await dedupCol.doc(item.externalMessageId).create(item.data);
        result.dedupMarkersWritten++;
      } catch (err) {
        if (err instanceof AlreadyExistsError) {
          result.dedupMarkersAlreadyPresent++;
        } else {
          result.errors.push({ phase: 'dedupMarkers', id: item.externalMessageId, message: err instanceof Error ? err.message : String(err) });
        }
      }
    }
  });

  return result;
}

// --- Verificação de integridade (lê de volta e compara com o original) ----

export interface IntegrityMismatch {
  kind: 'attendance_missing' | 'attendance_field_diff' | 'chat_message_missing' | 'dedup_marker_missing' | 'extra_document_in_new_collection';
  id: string;
  detail: string;
}

export interface IntegrityReport {
  ok: boolean;
  mismatches: IntegrityMismatch[];
  checkedAttendances: number;
  checkedChatMessages: number;
  checkedDedupMarkers: number;
}

function shallowFieldDiff(a: Record<string, unknown>, b: Record<string, unknown>): string[] {
  const diffs: string[] = [];
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if (JSON.stringify(a[key]) !== JSON.stringify(b[key])) diffs.push(key);
  }
  return diffs;
}

export async function verifyMigrationIntegrity(
  client: FirestoreLikeClient,
  snapshot: LegacyStoreSnapshot
): Promise<IntegrityReport> {
  const mismatches: IntegrityMismatch[] = [];
  const plan = buildMigrationPlan(snapshot);

  const attendancesCol = client.collection<MigrationAttendance>(COLLECTION_ATTENDANCES);
  for (const expected of plan.attendanceWrites) {
    const doc = await attendancesCol.doc(expected.id).get();
    if (!doc.exists) {
      mismatches.push({ kind: 'attendance_missing', id: expected.id, detail: 'não encontrado na coleção nova' });
      continue;
    }
    const actual = doc.data() as MigrationAttendance;
    const diffFields = shallowFieldDiff(expected.data, actual);
    if (diffFields.length > 0) {
      mismatches.push({ kind: 'attendance_field_diff', id: expected.id, detail: `campos diferentes: ${diffFields.join(', ')}` });
    }
  }

  for (const expected of plan.chatMessageWrites) {
    const doc = await client.collection<MigrationChatMessage>(chatCollectionName(expected.deskId)).doc(expected.id).get();
    if (!doc.exists) {
      mismatches.push({ kind: 'chat_message_missing', id: expected.id, detail: `mensagem da mesa ${expected.deskId} não encontrada` });
    }
  }

  const dedupCol = client.collection<unknown>(COLLECTION_WHATSAPP_DEDUP);
  for (const expected of plan.whatsappDedupWrites) {
    const doc = await dedupCol.doc(expected.externalMessageId).get();
    if (!doc.exists) {
      mismatches.push({ kind: 'dedup_marker_missing', id: expected.externalMessageId, detail: 'marcador de deduplicação não encontrado' });
    }
  }

  // Documentos extras nas coleções novas que não vieram do snapshot original
  // indicariam uma migração rodada contra uma base diferente da esperada —
  // sinal de que o "snapshot" usado não era a fonte certa (ver
  // reconcileInstanceWithFirestore).
  const expectedAttendanceIds = new Set(plan.attendanceWrites.map((w) => w.id));
  const actualAttendanceIds = await attendancesCol.listDocumentIds();
  for (const id of actualAttendanceIds) {
    if (!expectedAttendanceIds.has(id)) {
      mismatches.push({ kind: 'extra_document_in_new_collection', id, detail: 'presente na coleção nova mas não no snapshot verificado' });
    }
  }

  return {
    ok: mismatches.length === 0,
    mismatches,
    checkedAttendances: plan.attendanceWrites.length,
    checkedChatMessages: plan.chatMessageWrites.length,
    checkedDedupMarkers: plan.whatsappDedupWrites.length,
  };
}

// --- Reconciliação entre fontes antes de decidir o backup ------------------
//
// Pedido explícito: um GET /api/store (ou um loadStore() local) de UMA
// instância pode não representar todos os dados atuais — outra instância
// pode ter processado algo que nunca chegou ao Firestore (exatamente o
// cenário que motivou os commits anteriores desta sessão). Esta função
// compara um snapshot local com o snapshot do Firestore e aponta exatamente
// onde elas divergem, ANTES de decidir qual delas (ou qual combinação) usar
// como base da migração.

export interface ReconciliationReport {
  attendancesOnlyInLocal: string[];
  attendancesOnlyInFirestore: string[];
  whatsappMessageIdsOnlyInLocal: string[];
  whatsappMessageIdsOnlyInFirestore: string[];
  identical: boolean;
}

export function reconcileSnapshots(local: LegacyStoreSnapshot, firestore: LegacyStoreSnapshot): ReconciliationReport {
  const localAttIds = new Set(local.attendances.map((a) => a.id));
  const firestoreAttIds = new Set(firestore.attendances.map((a) => a.id));

  const localWaIds = new Set(
    Object.values(local.agentChats || {})
      .flat()
      .filter((m) => m.externalChannel === 'whatsapp' && m.externalMessageId)
      .map((m) => m.externalMessageId as string)
  );
  const firestoreWaIds = new Set(
    Object.values(firestore.agentChats || {})
      .flat()
      .filter((m) => m.externalChannel === 'whatsapp' && m.externalMessageId)
      .map((m) => m.externalMessageId as string)
  );

  const attendancesOnlyInLocal = [...localAttIds].filter((id) => !firestoreAttIds.has(id));
  const attendancesOnlyInFirestore = [...firestoreAttIds].filter((id) => !localAttIds.has(id));
  const whatsappMessageIdsOnlyInLocal = [...localWaIds].filter((id) => !firestoreWaIds.has(id));
  const whatsappMessageIdsOnlyInFirestore = [...firestoreWaIds].filter((id) => !localWaIds.has(id));

  return {
    attendancesOnlyInLocal,
    attendancesOnlyInFirestore,
    whatsappMessageIdsOnlyInLocal,
    whatsappMessageIdsOnlyInFirestore,
    identical:
      attendancesOnlyInLocal.length === 0 &&
      attendancesOnlyInFirestore.length === 0 &&
      whatsappMessageIdsOnlyInLocal.length === 0 &&
      whatsappMessageIdsOnlyInFirestore.length === 0,
  };
}

// --- Primitivo de deduplicação atômica entre instâncias --------------------
//
// Isto é o que a migração realmente compra em termos de concorrência: hoje,
// handleInboundWhatsAppMessage() faz "ler o array inteiro, procurar o ID,
// se não achar, dar push" — duas instâncias processando a mesma mensagem ao
// mesmo tempo podem ambas não encontrar o ID (porque nenhuma viu a escrita
// da outra ainda) e ambas processarem, criando dois atendimentos para a
// mesma mensagem. Com .create() num documento cujo ID é o próprio
// externalMessageId, o Firestore garante atomicamente que só uma das duas
// chamadas tem sucesso — não há leitura prévia para ficar desatualizada.
export async function tryClaimWhatsAppMessageId(
  client: FirestoreLikeClient,
  externalMessageId: string,
  data: { attendanceId?: string; deskId: string; chatMessageId: string }
): Promise<'claimed' | 'already_claimed'> {
  try {
    await client.collection(COLLECTION_WHATSAPP_DEDUP).doc(externalMessageId).create(data);
    return 'claimed';
  } catch (err) {
    if (err instanceof AlreadyExistsError) return 'already_claimed';
    throw err;
  }
}
