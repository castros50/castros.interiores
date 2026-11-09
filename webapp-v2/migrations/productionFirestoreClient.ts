// Cliente de Firestore apontando para PRODUÇÃO de verdade — nunca o
// emulador. Fica separado de realFirestoreClient.ts (usado só contra o
// emulador oficial nos testes) de propósito: assim nenhum script de teste
// pode, por um import errado, acabar conectando em produção sem querer.
//
// Exige uma frase de confirmação exata (não um --yes qualquer) porque o
// único efeito de rodar isto sem querer é abrir uma conexão real de
// LEITURA/ESCRITA contra o Firestore de produção — a barreira extra existe
// para que copiar/colar um comando errado não baste para isso acontecer.

import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { RealFirestoreClient } from './realFirestoreClient.ts';

export const PRODUCTION_CONFIRMATION_PHRASE = 'CONFIRMO-PRODUCAO';

export function createProductionFirestore(projectId: string, confirmation: string): Firestore {
  if (confirmation !== PRODUCTION_CONFIRMATION_PHRASE) {
    throw new Error(
      `Confirmação ausente ou incorreta. Isto conecta ao Firestore de PRODUÇÃO real (projeto "${projectId}") — ` +
        `passe exatamente --confirm=${PRODUCTION_CONFIRMATION_PHRASE} para confirmar que a intenção é essa.`
    );
  }
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error(
      `FIRESTORE_EMULATOR_HOST="${process.env.FIRESTORE_EMULATOR_HOST}" está definido. Isso redirecionaria esta ` +
        `conexão "de produção" para um emulador local por engano — remova a variável antes de continuar.`
    );
  }
  const appName = `prod-${projectId}`;
  const app = getApps().find((a) => a.name === appName) || initializeApp({ projectId }, appName);
  return getFirestore(app);
}

export { RealFirestoreClient };
