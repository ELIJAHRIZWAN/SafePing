import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut as fbSignOut, 
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { 
  initializeFirestore, 
  doc, 
  collection, 
  getDocs, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  getDocFromServer,
  query,
  where,
  onSnapshot,
  orderBy,
  updateDoc
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId || '(default)');
export const googleProvider = new GoogleAuthProvider();

export { signInWithPopup, fbSignOut, signInWithEmailAndPassword, createUserWithEmailAndPassword };
export type { FirebaseUser };

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
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error Details: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection Validation Helper
export async function testFirestoreConnection() {
  if (!auth.currentUser) return;
  const path = `users/${auth.currentUser.uid}`;
  try {
    await getDocFromServer(doc(db, 'users', auth.currentUser.uid));
  } catch (error) {
    if (error instanceof Error && error.message.includes('offline')) {
      console.warn("Firestore running in offline standby fallback.");
    }
  }
}

// User Profile Operations
export async function saveDbUserProfile(userId: string, profile: any) {
  const path = `users/${userId}`;
  try {
    await setDoc(doc(db, path), {
      name: profile.name || '',
      age: profile.age || '',
      bloodGroup: profile.bloodGroup || '',
      photo: profile.photo || '',
      isOnboarded: !!profile.isOnboarded,
      role: profile.role || 'protected'
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function fetchDbUserProfile(userId: string) {
  const path = `users/${userId}`;
  try {
    const snap = await getDoc(doc(db, path));
    return snap.exists() ? snap.data() : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

// Guardians Operations
export async function fetchDbGuardians(userId: string) {
  const path = `users/${userId}/guardians`;
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map(d => d.data());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveDbGuardian(userId: string, guardian: any) {
  const path = `users/${userId}/guardians/${guardian.id}`;
  const payload = {
    id: guardian.id,
    name: guardian.name || '',
    phone: guardian.phone || '',
    email: guardian.email || '',
    relationship: guardian.relationship || '',
    avatar: guardian.avatar || '',
    isPriority: !!guardian.isPriority,
    status: guardian.status || 'safe',
    isActive: guardian.isActive !== false,
    createdAt: guardian.createdAt || new Date().toISOString()
  };

  console.log("[saveDbGuardian] Saving guardian to Firestore.", {
    path,
    payloadKeys: Object.keys(payload),
    payloadSize: JSON.stringify(payload).length,
    avatarLength: payload.avatar ? payload.avatar.length : 0,
    avatarSnippet: payload.avatar ? payload.avatar.substring(0, 50) + "..." : "empty"
  });

  try {
    await setDoc(doc(db, path), payload);
    console.log("[saveDbGuardian] Successfully saved guardian to Firestore:", path);
  } catch (error) {
    console.error("[saveDbGuardian] Saving guardian failed!", {
      error,
      path,
      payloadSize: JSON.stringify(payload).length,
      payload
    });
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteDbGuardian(userId: string, guardianId: string) {
  const path = `users/${userId}/guardians/${guardianId}`;
  try {
    await deleteDoc(doc(db, path));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Incident Logs Operations
export async function saveDbIncidentLog(userId: string, log: any) {
  const path = `users/${userId}/incidentLogs/${log.id}`;
  try {
    await setDoc(doc(db, path), {
      id: log.id,
      timestamp: log.timestamp || new Date().toISOString(),
      utcTimestamp: log.utcTimestamp || new Date().toISOString(),
      type: log.type || 'info',
      description: log.description || ''
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function fetchDbIncidentLogs(userId: string) {
  const path = `users/${userId}/incidentLogs`;
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map(d => d.data());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

// Evidence Snapshot Operations
export async function saveDbEvidenceSnapshot(userId: string, snapItem: any) {
  const path = `users/${userId}/evidenceSnapshots/${snapItem.id}`;
  try {
    await setDoc(doc(db, path), {
      id: snapItem.id,
      timestamp: snapItem.timestamp || new Date().toISOString(),
      imageUrl: snapItem.imageUrl || '',
      location: snapItem.location || [],
      battery: snapItem.battery || 100,
      reason: snapItem.reason || '',
      audioUrl: snapItem.audioUrl || '',
      audioDurationMs: snapItem.audioDurationMs || 0
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function fetchDbEvidenceSnapshots(userId: string) {
  const path = `users/${userId}/evidenceSnapshots`;
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map(d => d.data());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

// Activity Logs Operations
export async function saveDbActivityLog(userId: string, log: any) {
  const path = `users/${userId}/activityLogs/${log.id}`;
  try {
    await setDoc(doc(db, path), {
      id: log.id,
      type: log.type || 'system',
      title: log.title || '',
      description: log.description || '',
      severity: log.severity || 'info',
      timestamp: typeof log.timestamp === 'string' ? log.timestamp : new Date(log.createdAtValue || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAtValue: typeof log.createdAtValue === 'number' ? log.createdAtValue : Date.now(),
      metadata: log.metadata || {}
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function fetchDbActivityLogs(userId: string) {
  const path = `users/${userId}/activityLogs`;
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map(d => d.data());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

// Multi-User Connection invitation & messaging helpers

export async function createConnection(
  userId: string,
  userName: string,
  userEmail: string,
  userPhone: string,
  guardianName: string,
  guardianPhone: string,
  guardianEmail: string,
  relationship: string
) {
  const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  const connId = `conn_${Math.random().toString(36).substring(2, 11)}`;
  const path = `connections/${connId}`;
  const payload = {
    id: connId,
    protectedUserId: userId,
    protectedUserName: userName,
    protectedUserEmail: userEmail || '',
    protectedUserPhone: userPhone || '',
    guardianName: guardianName,
    guardianEmail: guardianEmail || '',
    guardianPhone: guardianPhone || '',
    relationship: relationship,
    status: 'pending' as const,
    inviteCode,
    createdAt: new Date().toISOString(),
    deviceStatus: {
      batteryLevel: 100,
      location: [40.7128, -74.0060],
      lastCheckedIn: '',
      status: 'safe',
      journeyActive: false,
      journeyTitle: '',
      lastActiveAt: new Date().toISOString()
    }
  };
  try {
    await setDoc(doc(db, path), payload);
    return payload;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export function subscribeToConnections(userId: string, role: 'protected' | 'guardian', callback: (conns: any[]) => void) {
  const field = role === 'guardian' ? 'guardianId' : 'protectedUserId';
  const q = query(collection(db, 'connections'), where(field, '==', userId));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(doc => doc.data()));
  }, (error) => {
    console.error("Connections subscription error:", error);
    handleFirestoreError(error, OperationType.GET, 'connections');
  });
}

export async function acceptInviteCode(guardianId: string, guardianName: string, guardianEmail: string, inviteCode: string) {
  const q = query(
    collection(db, 'connections'),
    where('inviteCode', '==', inviteCode.trim().toUpperCase()),
    where('status', '==', 'pending')
  );
  const snap = await getDocs(q);
  if (snap.empty) {
    throw new Error("No pending invitation found for code " + inviteCode);
  }
  const docSnap = snap.docs[0];
  const conn = docSnap.data();
  const path = `connections/${conn.id}`;
  try {
    await setDoc(doc(db, 'connections', conn.id), {
      ...conn,
      guardianId,
      guardianName: guardianName || conn.guardianName,
      guardianEmail: guardianEmail || conn.guardianEmail || '',
      status: 'accepted'
    });
    return conn.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteConnection(connId: string) {
  const path = `connections/${connId}`;
  try {
    await deleteDoc(doc(db, path));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function sendConnectionMessage(connId: string, senderId: string, senderName: string, text: string, type: string) {
  const msgId = `msg_${Math.random().toString(36).substring(2, 11)}`;
  const path = `connections/${connId}/messages/${msgId}`;
  const payload = {
    id: msgId,
    senderId,
    senderName,
    text,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    createdAtValue: Date.now(),
    type,
    read: false
  };
  try {
    await setDoc(doc(db, path), payload);
    return payload;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export function subscribeToConnectionMessages(connId: string, callback: (msgs: any[]) => void) {
  const path = `connections/${connId}/messages`;
  const q = query(collection(db, 'connections', connId, 'messages'), orderBy('createdAtValue', 'asc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(doc => doc.data()));
  }, (error) => {
    console.error("Messages subscription error:", error);
    handleFirestoreError(error, OperationType.GET, path);
  });
}

export async function updateConnectionDeviceStatus(connId: string, deviceStatus: any) {
  const path = `connections/${connId}`;
  try {
    const docRef = doc(db, path);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const existingData = snap.data();
      await setDoc(docRef, {
        ...existingData,
        deviceStatus: {
          ...(existingData.deviceStatus || {}),
          ...deviceStatus,
          lastActiveAt: new Date().toISOString()
        }
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}
