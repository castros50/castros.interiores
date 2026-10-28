# Security Specification — Castros Interiores

## 1. Data Invariants
1. **Identity & Ownership**: Every document in `/attendances/{attendanceId}` and `/materials/{materialId}` must have an `ownerId` matching `request.auth.uid`, or the user must be the verified bootstrapped administrator (`castros.interiores50@gmail.com`).
2. **Verified Email**: Standard write and read operations require `request.auth != null && request.auth.token.email_verified == true`.
3. **Path Variable Hardening**: All document IDs (`attendanceId`, `materialId`) must match `^[a-zA-Z0-9_\-]+$` and have `.size() <= 128`.
4. **Strict Keys & Anti-Update-Gap**: Every create and update operation must validate all fields via `isValidAttendance(incoming())` or `isValidMaterial(incoming())` and restrict `affectedKeys().hasOnly(...)`.
5. **Immutability & Temporal Integrity**: `ownerId` and `createdAt` are immutable on update; `createdAt == request.time` on create and `updatedAt == request.time` on create/update.
6. **Query Enforcer**: `allow list` must check `resource.data.ownerId == request.auth.uid` (or verified admin) without delegating security to client queries.

## 2. The "Dirty Dozen" Payloads
1. **Unauthenticated Write**: `auth = null`, creating an attendance document.
2. **Unverified Email Spoof**: `auth.token.email = 'castros.interiores50@gmail.com'`, `email_verified = false`.
3. **Identity Spoofing on Create**: `incoming().ownerId = 'other-user-uid'` while `request.auth.uid = 'attacker-uid'`.
4. **Shadow Field Injection on Create**: Payload includes `isAdmin: true` ghost property not in `hasOnly`.
5. **Shadow Field Injection on Update**: Update includes an undeclared field `secretOverride: 'yes'`.
6. **Owner Hijack on Update**: Modifying `ownerId` during an update operation.
7. **Timestamp Forgery on Create**: Setting `createdAt` to a past/future timestamp instead of `request.time`.
8. **Timestamp Mutation on Update**: Changing `createdAt` or providing a forged `updatedAt != request.time`.
9. **Path ID Poisoning**: Document ID with 200 characters or special characters like `../../admin`.
10. **Value Poisoning on Update**: Updating `clientName` with a 50,000-character string or a boolean value.
11. **PII Blanket Read**: Authenticated user `uid = 'user-b'` attempting `get` on an attendance owned by `uid = 'user-a'`.
12. **Unauthorized List Scraping**: Authenticated user running an unconstrained `list` query across all users' attendances.
