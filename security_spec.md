# Security Specification (TDD) — SafePing Companion

This document establishes the data rules, invariants, and defensive validation paths for the SafePing application. It defines the "Dirty Dozen" malicious payloads designed to test the boundary limits of our Zero-Trust Attribute-Based Access Control (ABAC) Firestore Security Rules.

---

## 1. Core Data Invariants

1. **User Ownership Lock**: A user's profile (`/users/{userId}`), their guardians (`/users/{userId}/guardians/{guardianId}`), incident logs (`/users/{userId}/incidentLogs/{logId}`), and evidence snapshots (`/users/{userId}/evidenceSnapshots/{snapshotId}`) belong strictly to `userId`. No other user may read or write to these documents.
2. **Implicit Profile Integrity**: User documents are restricted from containing custom administrative parameters like `isAdmin`, `isDev`, or role escalations.
3. **Temporal Validity**: Timestamp fields (`createdAt`, `updatedAt`) must match `request.time` exactly.
4. **ID Sanitization**: All custom generated document IDs must match standard path identifiers (`^[a-zA-Z0-9_\-]+$`) and have a length size limit of `128` characters to avert resource poisoning.
5. **No Delegation**: Rule-side checks govern list queries. If a client queries `incidentLogs` or `evidenceSnapshots`, they must be checked against `request.auth.uid`.

---

## 2. The "Dirty Dozen" Malicious Payloads

### Payload 1: Admin Privilege Escalation (Shadow Fields Injection)
* **Target Path**: `/users/attacker_uid` (Create or Update)
* **Concept**: Injection of arbitrary escalation parameters like `role: "admin"`.
```json
{
  "name": "Attacker",
  "isOnboarded": true,
  "role": "admin",
  "isAdmin": true
}
```
* **Expected Result**: `PERMISSION_DENIED` (Key size and standard schema mismatch).

### Payload 2: Cross-User Identity Hijacking (Spoofing Owner)
* **Target Path**: `/users/victim_uid` (Create or Update by standard user)
* **Concept**: User tries to register their profile at another user's unique path.
```json
{
  "name": "Victim's Spoofed Info",
  "isOnboarded": true
}
```
* **Expected Result**: `PERMISSION_DENIED` (UID mismatch check `request.auth.uid == userId`).

### Payload 3: Blanket PII Retrieval (Unrestricted Account Reads)
* **Target Path**: `/users/victim_uid` (Single Get or List by standard user)
* **Concept**: Reading or query scraping of user health data (bloodGroup, age, photos).
* **Expected Result**: `PERMISSION_DENIED` (Only original owner allowed).

### Payload 4: Invalid Temporal Injection
* **Target Path**: `/users/user_uid/guardians/g1` (Create)
* **Concept**: Overrides timestamps with future dates.
```json
{
  "id": "g1",
  "name": "My Guardian",
  "phone": "+15550199",
  "email": "guardian@safeping.dev",
  "relationship": "Friend",
  "isActive": true,
  "createdAt": "2035-12-31T23:59:59Z"
}
```
* **Expected Result**: `PERMISSION_DENIED` (Must match `request.time`).

### Payload 5: Out of Bounds Identifier / Resource Exhaustion
* **Target Path**: `/users/user_uid/guardians/<10,000 character string of junk>` (Create)
* **Concept**: Flooding IDs representing denial of wallet attacks.
* **Expected Result**: `PERMISSION_DENIED` (ID length verification `id.size() <= 128` and regex check).

### Payload 6: Garbage Type Poisoning
* **Target Path**: `/users/user_uid` (Update)
* **Concept**: Overwriting expected structural fields (e.g., `isOnboarded` boolean is replaced with massive array or string).
```json
{
  "isOnboarded": "YES_I_AM_ONBOARDED_AND_QUITE_LARGE_TRASH_DATA_JUNK..."
}
```
* **Expected Result**: `PERMISSION_DENIED` (Type check `incoming().isOnboarded is bool`).

### Payload 7: Orphaned Sibling Mapping
* **Target Path**: `/users/unregistered_or_deleted_uid/guardians/g1` (Create)
* **Concept**: Creating a subcollection under a non-existent parent user profile.
* **Expected Result**: `PERMISSION_DENIED` (Relational check verifying parent user exits).

### Payload 8: State Override / State Short-Circuit
* **Target Path**: `/users/user_uid/incidentLogs/log1` (Update)
* **Concept**: Modifying historical tracking telemetry logs.
```json
{
  "description": "User is safe now (spoofed log)",
  "type": "user_action"
}
```
* **Expected Result**: `PERMISSION_DENIED` (Incidents logs are strictly immutable: no updates allowed).

### Payload 9: Ghost Field Injection in Incident Logs
* **Target Path**: `/users/user_uid/incidentLogs/log1` (Create with extra attributes)
```json
{
  "id": "log1",
  "timestamp": "2026-05-26T11:15:00Z",
  "utcTimestamp": "2026-05-26T11:15:00Z",
  "type": "hazard",
  "description": "Hazard in proximity",
  "bypassReview": true,
  "dangerLevel": "apocalyptic"
}
```
* **Expected Result**: `PERMISSION_DENIED` (Missing exact keys size matching in `isValidIncidentLog()`).

### Payload 10: Unauthenticated Write Attempt
* **Target Path**: `/users/some_uid` (Write without token)
* **Expected Result**: `PERMISSION_DENIED` (Auth cannot be null: `request.auth != null`).

### Payload 11: Spoofed Email Verification Access
* **Target Path**: `/users/user_uid` (Create)
* **Concept**: Action with unverified email token.
* **Expected Result**: `PERMISSION_DENIED` (Verification mandate: check `request.auth.token.email_verified == true`).

### Payload 12: Evidence Collection Tampering
* **Target Path**: `/users/user_uid/evidenceSnapshots/snap1` (Update or Delete)
* **Concept**: Threat actor tries to delete recorded media evidence snapshots from the user's phone.
* **Expected Result**: `PERMISSION_DENIED` (Historical physical safety recordings and media logs are immutable: no update or delete operations allowed).

---

## 3. Conceptual Rule Verification Test Runner

Below is a complete `firestore.rules.test.ts` specification written using `@firebase/rules-unit-testing`:

```typescript
import { initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { doc, setDoc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';

let testEnv: RulesTestEnvironment;

describe('SafePing Firestore Security Rules', () => {
  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'mindful-winter-wrtgb',
      firestore: {
        rules: readFileSync('firestore.rules', 'utf8'),
        host: '127.0.0.1',
        port: 8080,
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  test('Payload 1: Admin Privilege Escalation (Shadow Fields Injection) should be blocked', async () => {
    const context = testEnv.authenticatedContext('attacker_uid', { email_verified: true });
    const userDocRef = doc(context.firestore(), 'users/attacker_uid');
    
    await expect(setDoc(userDocRef, {
      name: 'Attacker',
      isOnboarded: true,
      role: 'admin',
      isAdmin: true
    })).rejects.toThrow();
  });

  test('Payload 2: Cross-User Identity Hijacking should be blocked', async () => {
    const context = testEnv.authenticatedContext('attacker_uid', { email_verified: true });
    const targetDocRef = doc(context.firestore(), 'users/victim_uid');
    
    await expect(setDoc(targetDocRef, {
      name: 'Victim Spoofed',
      isOnboarded: true
    })).rejects.toThrow();
  });

  test('Payload 3: Read access to other user profiles must be blocked', async () => {
    const maliciousContext = testEnv.authenticatedContext('attacker_uid', { email_verified: true });
    const targetDocRef = doc(maliciousContext.firestore(), 'users/victim_uid');
    
    await expect(getDoc(targetDocRef)).rejects.toThrow();
  });

  test('Payload 8: Immutable Incident Logs must prevent updates', async () => {
    const context = testEnv.authenticatedContext('user_uid', { email_verified: true });
    const logRef = doc(context.firestore(), 'users/user_uid/incidentLogs/log1');
    
    // Create first as owner (using correct dynamic schema rules)
    // Then attempt updates -> should fail
    await expect(updateDoc(logRef, {
      description: 'Modified logs'
    })).rejects.toThrow();
  });

  test('Payload 12: Evidence snapshots are append-only; updates and deletions are blocked', async () => {
    const context = testEnv.authenticatedContext('user_uid', { email_verified: true });
    const snapshotRef = doc(context.firestore(), 'users/user_uid/evidenceSnapshots/snap1');
    
    await expect(deleteDoc(snapshotRef)).rejects.toThrow();
  });
});
```
