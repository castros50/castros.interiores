/**
 * Firestore Security Rules Test Specification (Dirty Dozen Verification)
 * Verifies that all 12 adversarial payloads are rejected with PERMISSION_DENIED.
 */

export interface SecurityTestCase {
  id: number;
  name: string;
  collection: string;
  docId: string;
  operation: 'create' | 'update' | 'get' | 'list';
  auth: { uid: string; email: string; email_verified: boolean } | null;
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED' | 'ALLOWED';
}

export const DIRTY_DOZEN_TESTS: SecurityTestCase[] = [
  {
    id: 1,
    name: 'Unauthenticated Write',
    collection: 'attendances',
    docId: 'att-001',
    operation: 'create',
    auth: null,
    payload: { ownerId: 'u1', attendanceNumber: 'CI-01' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Unverified Email Spoof',
    collection: 'attendances',
    docId: 'att-001',
    operation: 'get',
    auth: { uid: 'spoof', email: 'castros.interiores50@gmail.com', email_verified: false },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Identity Spoofing on Create',
    collection: 'attendances',
    docId: 'att-001',
    operation: 'create',
    auth: { uid: 'attacker', email: 'a@example.com', email_verified: true },
    payload: { ownerId: 'victim', attendanceNumber: 'CI-01' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Shadow Field Injection on Create',
    collection: 'attendances',
    docId: 'att-001',
    operation: 'create',
    auth: { uid: 'u1', email: 'u1@example.com', email_verified: true },
    payload: { ownerId: 'u1', isAdmin: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Shadow Field Injection on Update',
    collection: 'attendances',
    docId: 'att-001',
    operation: 'update',
    auth: { uid: 'u1', email: 'u1@example.com', email_verified: true },
    payload: { secretOverride: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Owner Hijack on Update',
    collection: 'attendances',
    docId: 'att-001',
    operation: 'update',
    auth: { uid: 'u1', email: 'u1@example.com', email_verified: true },
    payload: { ownerId: 'u2' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Timestamp Forgery on Create',
    collection: 'attendances',
    docId: 'att-001',
    operation: 'create',
    auth: { uid: 'u1', email: 'u1@example.com', email_verified: true },
    payload: { createdAt: '1999-01-01T00:00:00Z' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Timestamp Mutation on Update',
    collection: 'attendances',
    docId: 'att-001',
    operation: 'update',
    auth: { uid: 'u1', email: 'u1@example.com', email_verified: true },
    payload: { createdAt: '2026-01-01T00:00:00Z' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Path ID Poisoning',
    collection: 'attendances',
    docId: 'invalid/id$with*chars',
    operation: 'create',
    auth: { uid: 'u1', email: 'u1@example.com', email_verified: true },
    payload: { ownerId: 'u1' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Value Poisoning on Update',
    collection: 'attendances',
    docId: 'att-001',
    operation: 'update',
    auth: { uid: 'u1', email: 'u1@example.com', email_verified: true },
    payload: { clientName: 12345 },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'PII Blanket Read',
    collection: 'attendances',
    docId: 'att-001',
    operation: 'get',
    auth: { uid: 'other-user', email: 'other@example.com', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Unauthorized List Scraping',
    collection: 'attendances',
    docId: '*',
    operation: 'list',
    auth: { uid: 'other-user', email: 'other@example.com', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
];
