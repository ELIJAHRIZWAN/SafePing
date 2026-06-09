export type View = 'home' | 'guardians' | 'status' | 'journey' | 'logs' | 'settings';

export type GuardianMode = 'talk' | 'quiet' | 'calm' | 'protect';

export interface SafeMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRelationship: string;
  senderAvatar: string;
  text: string;
  timestamp: string;
  read: boolean;
  replied?: boolean;
  replyText?: string;
  replyTimestamp?: string;
}

export interface Guardian {
  id: string;
  name: string;
  phone: string;
  relationship: string;
  avatar: string;
  isPriority?: boolean;
  status?: 'safe' | 'traveling' | 'attention' | 'offline';
  photoUrl?: string;
}

export type CheckpointStatus = 'pending' | 'safe' | 'unsafe' | 'uncomfortable';

export interface Checkpoint {
  id: string;
  name: string;
  position: { lat: number; lng: number };
  status: CheckpointStatus;
}

export interface UserProfile {
  name: string;
  age: string;
  bloodGroup: string;
  photo?: string;
  isOnboarded: boolean;
  role?: 'protected' | 'guardian';
}

export interface SafePlace {
  id: string;
  name: string;
  position: [number, number];
  time: string;
  score: number;
  status: string;
  tacticalTags: string[];
  penguinRec: string;
  level: string;
  color: string;
  hex: string;
  distance?: number;
  type: string;
  tier?: 'Immediate' | 'Nearby' | 'Extended';
  tierLabel?: string;
}

export interface AppState {
  currentView: View;
  isEmergencyActive: boolean;
  guardians: Guardian[];
  batteryLevel: number;
  safeTimerSeconds: number;
  isDarkMode: boolean;
  isPrivacyMode: boolean;
  checkpoints: Checkpoint[];
  isVoiceTriggerActive: boolean;
  triggerPhrase: string;
  lastVoiceTrigger: string;
  user: UserProfile;
}
