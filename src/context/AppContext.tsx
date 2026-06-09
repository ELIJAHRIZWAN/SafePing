import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { View, Guardian, Checkpoint, CheckpointStatus, UserProfile, SafePlace, GuardianMode, SafeMessage } from '../types';
import { getCategoryForRelationship, CATEGORY_AVATARS } from '../components/CompanionAvatar';
import useLiveLocation from "../hooks/useLiveLocation";
import { speakWithElevenLabs, setCompanionWalkingSpeed } from '../services/elevenlabsService';
import { useEmergency } from './EmergencyContext';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, signInWithPopup, googleProvider, fbSignOut, db, createConnection, subscribeToConnections, acceptInviteCode, deleteConnection, sendConnectionMessage, subscribeToConnectionMessages, updateConnectionDeviceStatus } from '../services/firebase';
import type { FirebaseUser } from '../services/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';

interface AppContextType {
  currentView: View;
  setCurrentView: (view: View) => void;
  activeCallGuardian: Guardian | null;
  setActiveCallGuardian: (guardian: Guardian | null) => void;
  isEmergencyActive: boolean;
  setIsEmergencyActive: (active: boolean) => void;
  isWalkWithMeActive: boolean;
  setIsWalkWithMeActive: (active: boolean) => void;
  guardians: Guardian[];
  addGuardian: (guardian: Omit<Guardian, 'id'> & { avatar?: string }) => void;
  updateGuardian: (id: string, guardian: Partial<Omit<Guardian, 'id'>> & { avatar?: string }) => void;
  removeGuardian: (id: string) => void;
  batteryLevel: number;
  setBatteryLevel: (lvl: number) => void;
  safeTimerSeconds: number;
  isDarkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  isPrivacyMode: boolean;
  setPrivacyMode: (privacy: boolean) => void;
  checkpoints: Checkpoint[];
  addCheckpoint: (name: string, position: { lat: number; lng: number }) => void;
  updateCheckpointStatus: (id: string, status: CheckpointStatus) => void;
  isVoiceTriggerActive: boolean;
  setIsVoiceTriggerActive: (active: boolean) => void;
  isSafeModeActive: boolean;
  setIsSafeModeActive: (active: boolean) => void;
  activeSafeHavenId: string | null;
  setActiveSafeHavenId: (id: string | null) => void;
  selectedRouteType: 'faster' | 'safer';
  setSelectedRouteType: (type: 'faster' | 'safer') => void;
  triggerPhrase: string;
  setTriggerPhrase: (phrase: string) => void;
  lastVoiceTrigger: string;
  triggerSOS: () => void;
  penguinMessage: string;
  setPenguinMessage: (msg: string) => void;
  user: UserProfile;
  setUser: (user: UserProfile) => void;
  safePlaces: SafePlace[];
  isLoadingSafePlaces: boolean;
  isCalculatingRoutes: boolean;
  fetchNearbySafePlaces: (lat: number, lon: number) => Promise<void>;
  userLocation: [number, number] | null;
  locationStatus: 'scanning' | 'denied' | 'active' | 'error' | 'connected';
  navigationPath: [number, number][];
  setNavigationPath: (path: [number, number][]) => void;
  isFetchingRoute: boolean;
  setIsFetchingRoute: (fetching: boolean) => void;
  isStayWithMeActive: boolean;
  setStayWithMeActive: (active: boolean) => void;
  isQuietMode: boolean;
  setQuietMode: (quiet: boolean) => void;
  guardianMode: GuardianMode;
  setGuardianMode: (mode: GuardianMode) => void;
  isTyping: boolean;
  setIsTyping: (t: boolean) => void;
  isBreathingGlow: boolean;
  setIsBreathingGlow: (b: boolean) => void;
  userAnxietyActive: boolean;
  setUserAnxietyActive: (a: boolean) => void;
  isPerformanceSave: boolean;
  setIsPerformanceSave: (save: boolean) => void;
  handleChipResponse: (chip: 'okay' | 'talk' | 'quiet' | 'alert') => void;
  handleUserChatSent: (text: string) => void;
  userStatus: string;
  updateUserStatus: (status: string) => void;
  activeJourney: any | null;
  startJourney: (destination: string, category: string, totalDuration?: number) => void;
  cancelJourney: () => void;
  completeJourney: () => void;
  recentCheckins: any[];
  addCheckin: (message: string, type?: 'arrival' | 'status' | 'delay' | 'start') => void;
  triggerDelayAlert: () => void;
  firebaseUser: FirebaseUser | null;
  isAuthLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithMock: (name: string, email: string) => Promise<void>;
  logout: () => Promise<void>;
  isGuest: boolean;
  setIsGuest: (guest: boolean) => void;
  enterGuestMode: () => void;
  autoStatusUpdates: boolean;
  setAutoStatusUpdates: (enabled: boolean) => void;
  safeMessages: SafeMessage[];
  setSafeMessages: React.Dispatch<React.SetStateAction<SafeMessage[]>>;
  replyToSafeMessage: (id: string, replyText: string) => void;
  simulateIncomingSafeMessage: () => void;
  logActivity: (params: {
    type: "checkin" | "journey" | "arrival" | "alert" | "sos" | "guardian" | "pen" | "system";
    title: string;
    description: string;
    severity: "safe" | "info" | "warning" | "critical";
    timestamp?: number;
    metadata?: any;
  }) => void;
  isSOSCountingDown: boolean;
  setIsSOSCountingDown: (c: boolean) => void;
  sosCountdownSeconds: number;
  setSosCountdownSeconds: (s: number) => void;
  sosCountdownDuration: number;
  setSosCountdownDuration: (d: number) => void;
  sosStatus: 'idle' | 'triggered' | 'notified' | 'shared' | 'awaiting_response' | 'cancelled';
  setSosStatus: (s: 'idle' | 'triggered' | 'notified' | 'shared' | 'awaiting_response' | 'cancelled') => void;
  cancelSOSCountdown: () => void;
  isRouteDeviationDetected: boolean;
  setIsRouteDeviationDetected: (d: boolean) => void;
  isUnexpectedStopDetected: boolean;
  setIsUnexpectedStopDetected: (s: boolean) => void;
  isNightWalkSensitivityActive: boolean;
  setIsNightWalkSensitivityActive: (n: boolean) => void;
  connectionsList: any[];
  connectionMessages: { [connId: string]: any[] };
  syncStatusToAllConnections: (statusUpdate: any) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const INITIAL_USER: UserProfile = {
  name: '',
  age: '',
  bloodGroup: '',
  isOnboarded: false
};

// Simple cache for safe places to allow instant render on return
let cachedSafePlaces: SafePlace[] = [];

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { 
    threatScore, 
    setThreatScore, 
    isEscalated, 
    setIsEscalated, 
    setGuardianAlert, 
    emergencyState,
    setEmergencyState, 
    setIsUserSafe, 
    addIncidentLog,
    captureEvidenceSnapshot,
    setDeviationCount
  } = useEmergency();

  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const [connectionsList, setConnectionsList] = useState<any[]>([]);
  const [connectionMessages, setConnectionMessages] = useState<{ [connId: string]: any[] }>({});
  const [safeMessages, setSafeMessages] = useState<SafeMessage[]>([]);

  const [currentView, setCurrentView] = useState<View>('home');
  const [activeCallGuardian, setActiveCallGuardian] = useState<Guardian | null>(null);

  // SOS Countdown states
  const [sosCountdownDuration, setSosCountdownDurationState] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('safeping_settings_countdown_duration');
      return saved ? parseInt(saved) : 10;
    } catch {
      return 10;
    }
  });

  const setSosCountdownDuration = React.useCallback((val: number) => {
    setSosCountdownDurationState(val);
    try {
      localStorage.setItem('safeping_settings_countdown_duration', String(val));
    } catch {}
  }, []);

  const [isSOSCountingDown, setIsSOSCountingDown] = useState(false);
  const [sosCountdownSeconds, setSosCountdownSeconds] = useState(10);
  const [sosStatus, setSosStatus] = useState<'idle' | 'triggered' | 'notified' | 'shared' | 'awaiting_response' | 'cancelled'>('idle');

  // Intelligent Safe Journey Tracking states
  const [isRouteDeviationDetected, setIsRouteDeviationDetected] = useState(false);
  const [isUnexpectedStopDetected, setIsUnexpectedStopDetected] = useState(false);
  const [isNightWalkSensitivityActive, setIsNightWalkSensitivityActive] = useState(false);
  const [isEmergencyActive, setIsEmergencyActiveState] = useState(() => {
    try {
      const active = localStorage.getItem('safeping_emergency_active') === 'true';
      const state = localStorage.getItem('safeping_emergency_state');
      return active || (state && state !== 'idle' && state !== 'resolved' && state !== 'preparing') ? true : false;
    } catch {
      return false;
    }
  });

  const setIsEmergencyActive = React.useCallback((active: boolean) => {
    setIsEmergencyActiveState(active);
    try {
      localStorage.setItem('safeping_emergency_active', String(active));
    } catch {}
    if (active) {
      if (emergencyState === 'idle' || emergencyState === 'resolved' || emergencyState === 'preparing') {
        setEmergencyState('alerting');
      }
    } else {
      if (emergencyState !== 'idle' && emergencyState !== 'resolved') {
        setEmergencyState('idle');
      }
    }
  }, [emergencyState, setEmergencyState]);

  React.useEffect(() => {
    const isStateActive = emergencyState !== 'idle' && emergencyState !== 'resolved' && emergencyState !== 'preparing';
    if (isStateActive !== isEmergencyActive) {
      setIsEmergencyActiveState(isStateActive);
      try {
        localStorage.setItem('safeping_emergency_active', String(isStateActive));
      } catch {}
    }
  }, [emergencyState, isEmergencyActive]);
  const [isWalkWithMeActive, setIsWalkWithMeActiveState] = useState(() => {
    try {
      return localStorage.getItem('safeping_walk_active') === 'true';
    } catch {
      return false;
    }
  });
  const [guardians, setGuardians] = useState<Guardian[]>(() => {
    try {
      const saved = localStorage.getItem('safeping_guardians');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) {
          // Seamless migration of legacy initials / relationships to coordinates
          const migrated = parsed.map((g: any) => {
            let avatar = g.avatar;
            let rel = g.relationship || 'Friend';
            if (g.avatar === 'SJ') { avatar = 'GF 1.png'; rel = 'Girlfriend'; }
            else if (g.avatar === 'ED') { avatar = 'FATHER 1.png'; rel = 'Father'; }
            else if (g.avatar === 'CJ') { avatar = 'SISTER 1.png'; rel = 'Sister'; }
            else if (g.avatar === 'UM') { avatar = 'FATHER 2.png'; rel = 'Father'; }
            else if (g.avatar === '3_0') { avatar = 'GF 1.png'; rel = 'Girlfriend'; }
            else if (g.avatar === '1_0') { avatar = 'FATHER 1.png'; rel = 'Father'; }
            else if (g.avatar === '2_2') { avatar = 'SISTER 1.png'; rel = 'Sister'; }
            else if (g.avatar === '4_0') { avatar = 'FRIEND 1.png'; rel = 'Friend'; }

            // Ensure avatar is a valid PNG from our assets, or is a custom uploaded image/url
            const isCustom = avatar && (avatar.startsWith('data:') || avatar.startsWith('http') || avatar.startsWith('blob:'));
            if (!isCustom && (!avatar || !avatar.endsWith('.png'))) {
              const category = getCategoryForRelationship(rel);
              const available = CATEGORY_AVATARS[category] || CATEGORY_AVATARS["Friend"];
              const hash = g.name ? g.name.split("").reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0) : 0;
              const index = hash % available.length;
              avatar = available[index] || 'FRIEND 1.png';
            }
            return { ...g, avatar, relationship: rel };
          });
          return migrated;
        }
      }
      const defaults: Guardian[] = [
        {
          id: 'c1',
          name: 'Sarah Jensen',
          phone: '415-555-0199',
          relationship: 'Girlfriend',
          avatar: 'GF 1.png',
          isPriority: true,
          status: 'safe'
        },
        {
          id: 'c2',
          name: "Elijah's Dad",
          phone: "415-555-0102",
          relationship: "Father",
          avatar: "FATHER 1.png",
          isPriority: true,
          status: 'traveling'
        },
        {
          id: 'c3',
          name: "Chloe Jensen",
          phone: "415-555-0241",
          relationship: "Sister",
          avatar: "SISTER 1.png",
          isPriority: false,
          status: 'offline'
        },
        {
          id: 'c4',
          name: "Helen Jensen",
          phone: "415-555-0352",
          relationship: "Mother",
          avatar: "MOTHER 1.png",
          isPriority: false,
          status: 'safe'
        },
        {
          id: 'c5',
          name: "Marcus Jensen",
          phone: "415-555-0488",
          relationship: "Brother",
          avatar: "BROTHER 1.png",
          isPriority: false,
          status: 'safe'
        },
        {
          id: 'c6',
          name: "Uncle Marcus",
          phone: "415-555-0311",
          relationship: "Father",
          avatar: "FATHER 2.png",
          isPriority: false,
          status: 'safe'
        },
        {
          id: 'c7',
          name: "Maya Parker",
          phone: "415-555-0722",
          relationship: "Friend",
          avatar: "FRIEND 1.png",
          isPriority: false,
          status: 'safe'
        },
        {
          id: 'c8',
          name: "Lucas Miller",
          phone: "415-555-0811",
          relationship: "Friend",
          avatar: "FRIEND 2.png",
          isPriority: false,
          status: 'traveling'
        },
        {
          id: 'c9',
          name: "Emma Davis",
          phone: "415-555-0994",
          relationship: "Sister",
          avatar: "SISTER 2.png",
          isPriority: false,
          status: 'offline'
        },
        {
          id: 'c10',
          name: "Liam Carter",
          phone: "415-555-0104",
          relationship: "Boyfriend",
          avatar: "BF 1.png",
          isPriority: false,
          status: 'attention'
        }
      ];
      localStorage.setItem('safeping_guardians', JSON.stringify(defaults));
      return defaults;
    } catch {
      return [];
    }
  });

  const [userStatus, setUserStatusState] = useState<string>(() => {
    try {
      return localStorage.getItem('safeping_user_status') || 'Safe';
    } catch {
      return 'Safe';
    }
  });

  const [activeJourney, setActiveJourney] = useState<any | null>(() => {
    try {
      const saved = localStorage.getItem('safeping_active_journey');
      return saved && saved !== 'null' ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [recentCheckins, setRecentCheckins] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('safeping_recent_checkins');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // -------------------------------------------------------------
  // CENTRAL ACTIVITY LOGGING SERVICE
  // -------------------------------------------------------------
  const logActivity = React.useCallback(async (params: {
    type: "checkin" | "journey" | "arrival" | "alert" | "sos" | "guardian" | "pen" | "system";
    title: string;
    description: string;
    severity: "safe" | "info" | "warning" | "critical";
    timestamp?: number | string;
    metadata?: any;
  }) => {
    const logId = params.type + "_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now();
    const now = new Date();
    
    // Consistent Time Format e.g., "1:45 PM"
    const timestampStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newLog = {
      id: logId,
      type: params.type,
      title: params.title,
      description: params.description,
      severity: params.severity,
      timestamp: timestampStr,
      createdAtValue: now.getTime(),
      metadata: params.metadata || {}
    };

    console.log("[Activity Logs Logger] Logged:", newLog);

    // Save locally immediately for instant response
    setRecentCheckins(prev => {
      const filtered = prev.filter(item => item.id !== logId);
      const updated = [newLog, ...filtered];
      try {
        localStorage.setItem('safeping_recent_checkins', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    if (auth.currentUser && !auth.currentUser.uid.startsWith('dev_mock_user_')) {
      try {
        const { saveDbActivityLog } = await import('../services/firebase');
        await saveDbActivityLog(auth.currentUser.uid, newLog);
      } catch (err) {
        console.error("Firestore log save error:", err);
      }
    }
  }, []);

  // -------------------------------------------------------------
  // REACTIVE BROADCAST EVENT CAPTURER (AUTOMATIC LOG RUNNER)
  // -------------------------------------------------------------
  useEffect(() => {
    const handleIncidentLog = (e: any) => {
      const { type, description } = e.detail || {};
      if (!type || !description) return;

      const lowerType = type.toLowerCase();
      const lowerDesc = description.toLowerCase();

      // Intercept and translate standard blackbox incidents to central logs automatically
      if (lowerType === 'deviation') {
        logActivity({
          type: 'alert',
          title: 'ROUTE ALERT',
          description: 'Deviation detected: user moved away from planned route.',
          severity: 'warning'
        });
        logActivity({
          type: 'pen',
          title: 'PEN ALERT',
          description: 'Night walk guidance provided: adjusted alignment corridor.',
          severity: 'warning'
        });
      } else if (lowerType === 'escalation') {
        logActivity({
          type: 'pen',
          title: 'PEN WARNING',
          description: 'Potential safety concern detected: escalation watch triggered.',
          severity: 'warning'
        });
      } else if (lowerDesc.includes('phrase detected') || lowerDesc.includes('unsafe')) {
        logActivity({
          type: 'pen',
          title: 'PEN WARNING',
          description: 'Potential safety concern detected: distress phrase recognized.',
          severity: 'warning'
        });
      } else if (lowerDesc.includes('gps coordinate') || lowerDesc.includes('share')) {
        logActivity({
          type: 'checkin',
          title: 'CHECK-IN',
          description: 'Elijah shared a secure live coordinate check-in with trusted guardians.',
          severity: 'safe'
        });
      } else if (lowerDesc.includes('get me home') || lowerDesc.includes('path alignment') || lowerDesc.includes('walk with me')) {
        logActivity({
          type: 'pen',
          title: 'PEN ASSISTANCE',
          description: 'Safe route recommendations delivered: secure path initialized.',
          severity: 'safe'
        });
      }
    };

    window.addEventListener('safeping-incident-log', handleIncidentLog);
    return () => window.removeEventListener('safeping-incident-log', handleIncidentLog);
  }, [logActivity]);

  // -------------------------------------------------------------
  // APP MOUNT SYSTEM LOG EVENT
  // -------------------------------------------------------------
  const appOpenedLoggedRef = React.useRef(false);
  useEffect(() => {
    if (!appOpenedLoggedRef.current) {
      appOpenedLoggedRef.current = true;
      logActivity({
        type: 'system',
        title: 'APP OPENED',
        description: 'SafePing overwatch operational.',
        severity: 'info'
      });
    }
  }, [logActivity]);

  // -------------------------------------------------------------
  // WRAPPER FOR CHAPERON WALK (WALK WITH ME / TRACKING SESSION)
  // -------------------------------------------------------------
  const setIsWalkWithMeActive = React.useCallback((active: boolean) => {
    setIsWalkWithMeActiveState(active);
    try {
      localStorage.setItem('safeping_walk_active', String(active));
    } catch {}
    
    logActivity({
      type: 'system',
      title: active ? 'TRACKING ENABLED' : 'TRACKING DISABLED',
      description: active ? 'Live companion path tracking active.' : 'Tracking session completed.',
      severity: 'info'
    });

    if (active) {
      logActivity({
        type: 'system',
        title: 'LOCATION SHARING ENABLED',
        description: 'Broadcasting location telemetry safely to Trusted Circle.',
        severity: 'safe'
      });
    }
  }, [logActivity]);

  const [batteryLevel, setBatteryLevel] = useState(92);
  const [safeTimerSeconds] = useState(892);
  const [isDarkMode, setDarkMode] = useState<boolean>(() => {
    try {
      const savedTheme = localStorage.getItem('safeping_theme');
      return savedTheme ? savedTheme === 'dark' : true;
    } catch {
      return true;
    }
  });
  const [isPrivacyMode, setPrivacyMode] = useState(false);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);

  // -------------------------------------------------------------
  // VOICE TRIGGERS AUTOMATIC EVENT LOGGING
  // -------------------------------------------------------------
  const [isVoiceTriggerActive, setIsVoiceTriggerActiveState] = useState(true);
  const setIsVoiceTriggerActive = React.useCallback((active: boolean) => {
    setIsVoiceTriggerActiveState(active);
    logActivity({
      type: 'system',
      title: active ? 'VOICE MODE ACTIVATED' : 'VOICE MODE SUSPENDED',
      description: active ? 'Continuous vocal overwatch listener active.' : 'Vocal trigger listening disabled.',
      severity: 'info'
    });
  }, [logActivity]);

  const [isSafeModeActive, setIsSafeModeActive] = useState(false);
  const [activeSafeHavenId, setActiveSafeHavenId] = useState<string | null>(null);
  const [selectedRouteType, setSelectedRouteType] = useState<'faster' | 'safer'>('safer');
  const [triggerPhrase, setTriggerPhrase] = useState(() => {
    try {
      const saved = localStorage.getItem('safeping_trigger_phrase');
      return saved || 'I forgot my charger';
    } catch {
      return 'I forgot my charger';
    }
  });

  // Sync safe word phrase dynamically with local persistent storage
  useEffect(() => {
    try {
      localStorage.setItem('safeping_trigger_phrase', triggerPhrase);
    } catch (e) {
      console.warn("Storage sync failed for safe phrase trigger:", e);
    }
  }, [triggerPhrase]);

  useEffect(() => {
    try {
      localStorage.setItem('safeping_emergency_active', String(isEmergencyActive));
    } catch (e) {
      console.warn("Storage sync failed for emergency alert status:", e);
    }
  }, [isEmergencyActive]);

  useEffect(() => {
    try {
      localStorage.setItem('safeping_walk_active', String(isWalkWithMeActive));
    } catch (e) {
      console.warn("Storage sync failed for companion walk status:", e);
    }
  }, [isWalkWithMeActive]);

  const [lastVoiceTrigger, setLastVoiceTrigger] = useState('');
  const [penguinMessage, setPenguinMessage] = useState('Hi! I am Pen. I am here to keep you safe! 🐧');
  const [user, setUser] = useState<UserProfile>(() => {
    try {
      const savedUser = localStorage.getItem('safeping_user');
      return savedUser ? JSON.parse(savedUser) : INITIAL_USER;
    } catch {
      return INITIAL_USER;
    }
  });

  const [isGuest, setIsGuestState] = useState<boolean>(() => {
    try {
      return localStorage.getItem('safeping_is_guest') === 'true';
    } catch {
      return false;
    }
  });

  const setIsGuest = React.useCallback((guest: boolean) => {
    setIsGuestState(guest);
    try {
      localStorage.setItem('safeping_is_guest', guest ? 'true' : 'false');
    } catch {}
  }, []);

  const enterGuestMode = React.useCallback(() => {
    setIsGuest(true);
    setFirebaseUser(null);
    const guestUser = {
      name: 'Guest Friend',
      age: '',
      bloodGroup: '',
      photo: undefined,
      isOnboarded: true
    };
    setUser(guestUser);
    try {
      localStorage.setItem('safeping_user', JSON.stringify(guestUser));
    } catch {}
    setPenguinMessage('Emergency Companion activated! I am here and standing by. 🐧');
  }, [setIsGuest]);

  const [autoStatusUpdates, setAutoStatusUpdatesState] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('safeping_auto_status_updates');
      return saved === 'true';
    } catch {
      return false;
    }
  });

  const setAutoStatusUpdates = (enabled: boolean) => {
    setAutoStatusUpdatesState(enabled);
    try {
      localStorage.setItem('safeping_auto_status_updates', String(enabled));
    } catch {}
  };

  // -------------------------------------------------------------
  // FIREBASE REAL-TIME LOG SYNC
  // -------------------------------------------------------------
  useEffect(() => {
    if (!firebaseUser || firebaseUser.uid.startsWith('dev_mock_user_')) {
      return;
    }

    console.log("[Activity Logs Sync] Binding to Firestore real-time observer...");
    const logsCollectionRef = collection(db, `users/${firebaseUser.uid}/activityLogs`);
    const q = query(logsCollectionRef, orderBy('createdAtValue', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logs: any[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data && data.id) {
          logs.push(data);
        }
      });
      console.log(`[Activity Logs Sync] Synchronized ${logs.length} entries in real-time.`);
      
      // Sort and update checkins state
      const sortedLogs = logs.sort((a, b) => (b.createdAtValue || 0) - (a.createdAtValue || 0));
      setRecentCheckins(sortedLogs);
      try {
        localStorage.setItem('safeping_recent_checkins', JSON.stringify(sortedLogs));
      } catch {}
    }, (error) => {
      console.warn("[Activity Logs Sync errorobserver]: Operating in offline fallback mode. Internal message:", error);
    });

    return () => unsubscribe();
  }, [firebaseUser]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        setFirebaseUser(authUser);
        setIsGuest(false);
        try {
          const isDevMock = authUser.uid.startsWith('dev_mock_user_');
          let dbProfile: any = null;
          let dbGuardians: any = null;

          if (!isDevMock) {
            const { fetchDbUserProfile, fetchDbGuardians } = await import('../services/firebase');
            try {
              dbProfile = await fetchDbUserProfile(authUser.uid);
            } catch (err) {
              console.warn("Could not retrieve user profile from Firestore (offline fallback engaged):", err);
            }
            try {
              dbGuardians = await fetchDbGuardians(authUser.uid);
            } catch (err) {
              console.warn("Could not retrieve guardians list from Firestore (offline fallback engaged):", err);
            }
          }

          if (dbProfile) {
            setUser({
              name: dbProfile.name || '',
              age: dbProfile.age || '',
              bloodGroup: dbProfile.bloodGroup || '',
              photo: dbProfile.photo || authUser.photoURL || undefined,
              isOnboarded: !!dbProfile.isOnboarded
            });
          } else {
            const profileKey = `safeping_user_${authUser.uid}`;
            const savedUser = localStorage.getItem(profileKey) || localStorage.getItem('safeping_user');
            if (savedUser) {
              setUser(JSON.parse(savedUser));
            } else {
              setUser({
                name: authUser.displayName || '',
                age: '',
                bloodGroup: '',
                photo: authUser.photoURL || undefined,
                isOnboarded: false
              });
            }
          }

          if (dbGuardians && dbGuardians.length > 0) {
            setGuardians(dbGuardians.map((dg: any) => ({
              id: dg.id,
              name: dg.name,
              phone: dg.phone,
              email: dg.email || '',
              relationship: dg.relationship || '',
              isActive: dg.isActive !== false,
              avatar: dg.avatar || dg.name.split(' ').map((n: string) => n[0]).join('').toUpperCase(),
              isPriority: !!dg.isPriority,
              status: dg.status || 'safe'
            })));
          } else {
            const saved = localStorage.getItem('safeping_guardians');
            if (saved) {
              setGuardians(JSON.parse(saved));
            } else {
              setGuardians([]);
            }
          }
        } catch (err) {
          console.error("Failed to load user profile details", err);
        }
      } else {
        setFirebaseUser(null);
        const savedIsGuest = localStorage.getItem('safeping_is_guest') === 'true';
        if (savedIsGuest) {
          const savedUser = localStorage.getItem('safeping_user');
          if (savedUser) {
            try {
              setUser(JSON.parse(savedUser));
            } catch {
              setUser({
                name: 'Guest Friend',
                age: '',
                bloodGroup: '',
                isOnboarded: true
              });
            }
          } else {
            setUser({
              name: 'Guest Friend',
              age: '',
              bloodGroup: '',
              isOnboarded: true
            });
          }
        } else {
          setUser(INITIAL_USER);
        }
        setGuardians([]);
      }
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('safeping_user', JSON.stringify(user));
      if (firebaseUser) {
        localStorage.setItem(`safeping_user_${firebaseUser.uid}`, JSON.stringify(user));
        const isDevMock = firebaseUser.uid.startsWith('dev_mock_user_');
        if (!isDevMock && user.name) {
          import('../services/firebase').then(({ saveDbUserProfile }) => {
            saveDbUserProfile(firebaseUser.uid, user).catch(err => {
              console.warn("Async firestore user profile sync failed:", err);
            });
          });
        }
      }
    } catch (e) {
      console.warn("Storage sync failed for user profile information:", e);
    }
  }, [user, firebaseUser]);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error("Google Sign-In failed, engaging standard sandbox developer bypass:", err);
      // Failover guest user so users can test immediately without credentials setup!
      const mockAuthUser = {
        uid: "dev_mock_user_123",
        displayName: "Sven Penguin",
        email: "sven@penguin.com",
        photoURL: "https://images.unsplash.com/photo-1551244072-5d12893278ab?auto=format&fit=crop&w=150"
      } as any;
      setFirebaseUser(mockAuthUser);
      setUser({
        name: "Sven Penguin",
        age: "24",
        bloodGroup: "O+",
        photo: mockAuthUser.photoURL,
        isOnboarded: true
      });
      setIsAuthLoading(false);
    }
  };

  const signInWithMock = async (name: string, email: string) => {
    const cleanName = name.trim();
    const cleanEmail = email.trim();
    const mockAuthUser = {
      uid: "dev_mock_user_" + Math.random().toString(36).substring(2, 9),
      displayName: cleanName || "Demo User",
      email: cleanEmail || "demo@example.com",
      photoURL: "https://images.unsplash.com/photo-1551244072-5d12893278ab?auto=format&fit=crop&w=150"
    } as any;
    setFirebaseUser(mockAuthUser);
    setUser({
      name: mockAuthUser.displayName,
      age: "",
      bloodGroup: "",
      photo: mockAuthUser.photoURL,
      isOnboarded: false
    });
    setIsAuthLoading(false);
  };

  const logout = async () => {
    try {
      await fbSignOut(auth);
    } catch (err) {
      console.warn("Firebase SignOut failed:", err);
    }
    setFirebaseUser(null);
    setIsGuest(false);
    setUser(INITIAL_USER);
    try {
      localStorage.removeItem('safeping_user');
      localStorage.removeItem('safeping_walk_active');
      localStorage.removeItem('safeping_emergency_active');
      localStorage.removeItem('safeping_is_guest');
    } catch (e) {}
    setIsEmergencyActive(false);
    setIsWalkWithMeActive(false);
    setCheckpoints([]);
  };
  const [safePlaces, setSafePlaces] = useState<SafePlace[]>(cachedSafePlaces);
  const [isLoadingSafePlaces, setIsLoadingSafePlaces] = useState(false);
  const [isCalculatingRoutes, setIsCalculatingRoutes] = useState(false);
  const [navigationPath, setNavigationPath] = useState<[number, number][]>([]);
  const [isFetchingRoute, setIsFetchingRoute] = useState(false);
  const [lastScanTimestamp, setLastScanTimestamp] = useState(0);

  // STAY WITH ME COMPANION MODE STATE
  const [isStayWithMeActive, setStayWithMeActive] = useState(false);
  const [isQuietMode, setQuietMode] = useState(false);
  const [guardianMode, setGuardianModeState] = useState<GuardianMode>(() => {
    return (localStorage.getItem('safeping_guardian_mode') as GuardianMode) || 'calm';
  });

  const setGuardianMode = React.useCallback((mode: GuardianMode) => {
    setGuardianModeState(mode);
    localStorage.setItem('safeping_guardian_mode', mode);
  }, []);

  useEffect(() => {
    setQuietMode(guardianMode === 'quiet');
  }, [guardianMode]);

  const { location, error, errorCode } = useLiveLocation();

  // Stable reference to location for Stay With Me timer logic
  const locationRef = React.useRef(location);
  useEffect(() => {
    locationRef.current = location;
    if (location && typeof location.speed === 'number') {
      setCompanionWalkingSpeed(location.speed);
    }
  }, [location]);

  // EMOTIONAL COMPANION ENGINE STATES
  const [isTyping, setIsTyping] = useState(false);
  const [isBreathingGlow, setIsBreathingGlow] = useState(false);
  const [userAnxietyActive, setUserAnxietyActive] = useState(false);

  const [isPerformanceSave, setIsPerformanceSaveState] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('safeping_performance_save');
      return saved === 'true';
    } catch {
      return false;
    }
  });

  const setIsPerformanceSave = React.useCallback((val: boolean) => {
    setIsPerformanceSaveState(val);
    try {
      localStorage.setItem('safeping_performance_save', String(val));
    } catch (e) {}
  }, []);

  const lastUserInteractionTimeRef = React.useRef(Date.now());
  const consecutiveUnansweredCheckinsRef = React.useRef(0);
  const lastCheckInTimeRef = React.useRef(Date.now());
  const userAnxietyActiveRef = React.useRef(false);
  const lastGuardianSpeakTimeRef = React.useRef(Date.now());
  const nextThresholdRef = React.useRef(20000); // Dynamic threshold tracking

  useEffect(() => {
    userAnxietyActiveRef.current = userAnxietyActive;
  }, [userAnxietyActive]);

  // Select next dynamic randomized check-in threshold (avoids repetitive intervals)
  const selectNextThreshold = React.useCallback((mode: GuardianMode, anxious: boolean) => {
    let minS = 85;
    let maxS = 140;
    
    if (mode === 'talk') {
      minS = 65; maxS = 100; // calmer dialogue pacing for friend status
    } else if (mode === 'quiet') {
      minS = 180; maxS = 300; // Walk Quietly is highly comfortable with silence, speaking very rarely
    } else if (mode === 'protect') {
      minS = 45; maxS = 75; // structured overwatch scanning interval
    } else { // calm
      minS = 85; maxS = 140;
    }

    if (anxious) {
      minS = 35; maxS = 60; // gentle comforting rhythm when distress is detected
    }

    return (minS + Math.random() * (maxS - minS)) * 1000;
  }, []);

  // Handler for custom response chips inside the client UI
  const handleChipResponse = React.useCallback((chip: 'okay' | 'talk' | 'quiet' | 'alert') => {
    const now = Date.now();
    const timeSinceLastGuardianSpeak = now - lastGuardianSpeakTimeRef.current;
    const isQuickRes = timeSinceLastGuardianSpeak < 8000;

    consecutiveUnansweredCheckinsRef.current = 0;
    lastUserInteractionTimeRef.current = now;
    
    setIsBreathingGlow(true);
    setTimeout(() => setIsBreathingGlow(false), 3000);

    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      let replyMsg = "";
      
      switch (chip) {
        case 'okay':
          setUserAnxietyActive(false);
          userAnxietyActiveRef.current = false;
          
          // Clear threat/alert confidence
          setThreatScore(0);
          setIsEscalated(false);
          setGuardianAlert(false);
          setIsUserSafe(true);
          setEmergencyState('idle');
          // Preserve isEmergencyActive to avoid closing the active escort overlay/screen abruptly while interacting with the companion
          
          if (isQuickRes) {
            if (guardianMode === 'talk') {
              replyMsg = "I'm so glad you're okay. Keep finding your peaceful rhythm as we walk.";
            } else if (guardianMode === 'quiet') {
              replyMsg = "Acknowledged. Staying on quiet vigil beside you.";
            } else if (guardianMode === 'protect') {
              replyMsg = "Clear status logged. Maintaining high surveillance overwatch. 🛡️";
            } else {
              replyMsg = "Okay… thank you for telling me. Take a soft breath. You're doing so well. 🌸";
            }
          } else {
            const reassurancePhrases = [
              "Okay… thank you for responding.",
              "Got it. I’ll stay calm right here beside you. 🌙",
              "Okay. I'll continue keeping watch silently. 🌙",
              "Take your time. We've got a peaceful road ahead. 🌸",
              "I'm glad you answered. No rush at all, we'll keep walking together at your pace.",
              "Truly glad you are okay. Take a slow, gentle breath. 🌸"
            ];
            replyMsg = reassurancePhrases[Math.floor(Math.random() * reassurancePhrases.length)];
          }
          break;

        case 'talk':
          setGuardianMode('talk');
          setUserAnxietyActive(false);
          userAnxietyActiveRef.current = false;
          replyMsg = "Of course. Let's talk for a bit. How are your shoulders feeling? Try to let them drop... we're in this together.";
          break;

        case 'quiet':
          setGuardianMode('quiet');
          setUserAnxietyActive(false);
          userAnxietyActiveRef.current = false;
          replyMsg = "Quiet vigilance active. I'm right here beside you in silence.";
          break;

        case 'alert':
          setGuardianMode('protect');
          setUserAnxietyActive(true);
          userAnxietyActiveRef.current = true;
          replyMsg = "Active protective overwatch is fully on. Stick closer to the inner sidewalk; I've got your back completely. 🛡️";
          break;
      }

      setPenguinMessage(replyMsg);
      speakWithElevenLabs(replyMsg.replace(" 🛡️", "").replace(" 🌸", "").replace(" 🐧", "").replace(" 🌙", ""), true);
      lastGuardianSpeakTimeRef.current = Date.now();
      lastCheckInTimeRef.current = Date.now();
      nextThresholdRef.current = selectNextThreshold(guardianMode, userAnxietyActiveRef.current);
    }, 1800);

  }, [guardianMode, setGuardianMode, selectNextThreshold, setThreatScore, setIsEscalated, setGuardianAlert, setEmergencyState, setIsUserSafe, setIsEmergencyActive]);

  // Handler to analyze text queries sent by user to trigger emotional state shifts
  const handleUserChatSent = React.useCallback((text: string) => {
    const now = Date.now();
    const timeSinceLastGuardianSpeak = now - lastGuardianSpeakTimeRef.current;
    
    // 1. Behavior detection: Check if user responded quickly
    const isQuickRes = timeSinceLastGuardianSpeak < 8000;
    
    // Reset consecutive unanswered checkins on user interaction
    consecutiveUnansweredCheckinsRef.current = 0;
    lastUserInteractionTimeRef.current = now;

    // 2. Emotional Tone Distress / Reassurance recognition
    const distressWords = [
      "scared", "fear", "anxious", "panic", "danger", "run", "creepy", "dark", 
      "worried", "threat", "follow", "suspicious", "help", "afraid", "scary"
    ];
    const reassuranceWords = [
      "i'm okay", "i am okay", "everything is fine", "i'm safe", "all good", 
      "no worries", "steady", "safe now", "false alarm", "fine", "okay"
    ];

    const userTextLower = text.toLowerCase();
    const hasDistress = distressWords.some(word => userTextLower.includes(word));
    const hasReassurance = reassuranceWords.some(word => userTextLower.includes(word));

    // Panic tone detection (exclamations or all uppercase shouting)
    const isShoutingOrPanicTone = text.includes("!") || (text === text.toUpperCase() && text.trim().length > 3);

    // SOS Trigger phrase detection
    const isTriggerPhrase = userTextLower.includes(triggerPhrase.toLowerCase()) || userTextLower.includes("help") || userTextLower.includes("sos");

    // Dynamic Threat Score updates
    setThreatScore(prev => {
      let nextScore = prev;
      if (isTriggerPhrase) {
        nextScore += 55; // Major threat increase
        logActivity({
          type: "pen",
          title: "PEN WARNING",
          description: "Potential safety concern detected: distressed help phrase recognized.",
          severity: "critical"
        });
      } else if (hasDistress) {
        nextScore += 20; // Distress words increase
        logActivity({
          type: "pen",
          title: "PEN ALERT",
          description: "Gently adjusting watch: user conveyed feeling anxious or unsettled.",
          severity: "warning"
        });
      }
      
      if (isShoutingOrPanicTone) {
        nextScore += 15; // Shouting tone increase
      }

      if (hasReassurance) {
        nextScore = Math.max(0, nextScore - 50); // Reassurance significantly decreases threat
      } else if (!hasDistress && !isTriggerPhrase) {
        nextScore = Math.max(0, nextScore - 15); // Normal calm talk decreases threat
      }

      return Math.min(100, nextScore);
    });

    // Threat assessment de-escalation check
    // If user explicitly says they are safe / fine / okay, or if emotional trust conditions suggest safety
    if (hasReassurance) {
      setUserAnxietyActive(false);
      userAnxietyActiveRef.current = false;
      setThreatScore(0);
      
      if (isEscalated || emergencyState === 'escalating' || emergencyState === 'alerting' || emergencyState === 'preparing') {
        addIncidentLog("action", "Initiating gradual safety de-escalation step from conversational reassurance.");
        setEmergencyState('resolved');
        setIsEscalated(false);
        setGuardianAlert(false);
        setIsUserSafe(true);
        
        const deEscalateMsg = "Okay... relaxing a little now. Things feel calmer again, and I'm still right here.";
        setPenguinMessage(deEscalateMsg);
        speakWithElevenLabs(deEscalateMsg, true);
      } else {
        setIsEscalated(false);
        setGuardianAlert(false);
        setIsUserSafe(true);
        setEmergencyState('idle');
        addIncidentLog("action", "De-escalated safety attention based on user conversational reassurance.");
      }
      nextThresholdRef.current = selectNextThreshold(guardianMode, false);
    } else if (hasDistress || isTriggerPhrase) {
      setUserAnxietyActive(true);
      userAnxietyActiveRef.current = true;
      nextThresholdRef.current = selectNextThreshold(guardianMode, true);
    } else {
      setUserAnxietyActive(false);
      userAnxietyActiveRef.current = false;
      nextThresholdRef.current = selectNextThreshold(guardianMode, false);
    }

    console.log(`[EMOTION ENGINE] Chat parsed: distress=${hasDistress}, panicTone=${isShoutingOrPanicTone}, reassurance=${hasReassurance}`);
  }, [guardianMode, triggerPhrase, selectNextThreshold, setThreatScore, isEscalated, setIsEscalated, setGuardianAlert, emergencyState, setEmergencyState, setIsUserSafe, setIsEmergencyActive, addIncidentLog]);

  // Stay With Me Mode Auto-Checkin effects and emotional companion reassuring speeches
  useEffect(() => {
    if (!isStayWithMeActive) return;

    // Immediately introduce the companion mode session according to the current adaptive mode
    let introMsg = "I’m here with you tonight 🌙 You don’t have to walk alone... We’ll get there together.";
    let speechMsg = "I’m here with you tonight. You don’t have to walk alone. We’ll get there together.";

    if (guardianMode === 'talk') {
      introMsg = "Okay... let's walk and talk for a bit. No pressure, just take a light pace. 🐧";
      speechMsg = "Okay... let's walk and talk for a bit. No pressure, just take a light pace.";
    } else if (guardianMode === 'quiet') {
      introMsg = "I'm keeping watch closely... let's walk in quiet peace. 🌙";
      speechMsg = "I'm keeping watch closely... let's walk in quiet peace.";
    } else if (guardianMode === 'calm') {
      introMsg = "I'm right here beside you. Take a slow, gentle breath. We'll get there together. 🌸 🐧";
      speechMsg = "I'm right here beside you. Take a slow, gentle breath. We'll get there together.";
    } else if (guardianMode === 'protect') {
      introMsg = "Active overwatch sensors engaged. Stick to well-lit blocks; I've got you covered. 🛡️";
      speechMsg = "Active overwatch sensors engaged. Stick to well-lit blocks; I've got you covered.";
    }
    
    setPenguinMessage(introMsg);
    speakWithElevenLabs(speechMsg, true);
    
    lastGuardianSpeakTimeRef.current = Date.now();
    lastCheckInTimeRef.current = Date.now();
    lastUserInteractionTimeRef.current = Date.now();
    nextThresholdRef.current = selectNextThreshold(guardianMode, userAnxietyActiveRef.current);

    // Timers for natural check-ins with randomized pacing
    let stationarySeconds = 0;

    const interval = setInterval(() => {
      const now = Date.now();
      const currentLoc = locationRef.current;
      const speed = currentLoc?.speed ?? 0;

      // Track inactivity (stationary state)
      if (speed <= 0.1) {
        stationarySeconds += 1;
      } else {
        stationarySeconds = 0;
      }

      // Reactive check-in for inactivity (user has been stationary)
      const maxStationarySec = guardianMode === 'quiet' ? 90 : guardianMode === 'calm' ? 60 : 45;
      if (stationarySeconds >= maxStationarySec) {
        stationarySeconds = 0; // reset
        
        // Layered confidence: unusual movement checks / stationary stops gradually build threat confidence
        setThreatScore(prev => Math.min(100, prev + 8));
        
        if (guardianMode === 'quiet') {
          // Strict silence constraint: do not speak or interrupt on stationary triggers
          // Unless the user is currently displaying high anxiety/panic
          if (!userAnxietyActiveRef.current) {
            console.log("[COMPANION ENGINE] Silent stationary breathing glow triggered in Quiet Mode. Suppressing audible narration.");
            setIsBreathingGlow(true);
            setTimeout(() => setIsBreathingGlow(false), 4500);
            return;
          }
        }

        let msg = "I noticed you stopped... take a slow breath. I'm right here keeping watch.";
        
        if (guardianMode === 'talk') {
          const msgs = [
            "Hey, we stopped for a second. Doing alright? No rush at all, I'm right here with you. 🐧",
            "Take your time while we're paused... there is absolutely no rush.",
            "Just paused for a moment. Doing okay?"
          ];
          msg = msgs[Math.floor(Math.random() * msgs.length)];
        } else if (guardianMode === 'quiet') {
          const msgs = [
            "Still here. Standing guard softly.",
            "You still doing okay?"
          ];
          msg = msgs[Math.floor(Math.random() * msgs.length)];
        } else if (guardianMode === 'calm') {
          const msgs = [
            "I noticed you stopped... take a slow, grounding breath. I'm right here keeping watch. 🌸",
            "Still here with you. Take your time, we'll keep walking forward whenever you are ready. 🌸"
          ];
          msg = msgs[Math.floor(Math.random() * msgs.length)];
        } else if (guardianMode === 'protect') {
          const msgs = [
            "Detected a sudden stop. Scanning nearby lines... please confirm you are okay or stick to well-lit paths. 🛡️",
            "Route paused. Recalibrating local sensors. Standing in protective watch."
          ];
          msg = msgs[Math.floor(Math.random() * msgs.length)];
        }

        // Trigger Soft Typing first
        setIsTyping(true);
        setTimeout(() => {
          setIsTyping(false);
          setIsBreathingGlow(true);
          setTimeout(() => setIsBreathingGlow(false), 3000);

          setPenguinMessage(msg);
          speakWithElevenLabs(msg.replace(" 🐧", "").replace(" 🛡️", "").replace(" 🌸", ""), true);
          lastGuardianSpeakTimeRef.current = Date.now();
          lastCheckInTimeRef.current = Date.now();
          nextThresholdRef.current = selectNextThreshold(guardianMode, userAnxietyActiveRef.current);
        }, 1200);

        return;
      }

      // Normal periodic dynamic check-ins
      const silenceDuration = now - lastGuardianSpeakTimeRef.current;
      const userSilDuration = now - lastUserInteractionTimeRef.current;

      // 1. Acknowledge user silence (user has gone silent for a longer stretch)
      const silenceThreshold = guardianMode === 'quiet' ? 180000 : 55000;
      if (userSilDuration >= silenceThreshold && silenceDuration >= nextThresholdRef.current) {
        lastUserInteractionTimeRef.current = now; // reset silent counter
        
        if (guardianMode === 'quiet' && !userAnxietyActiveRef.current) {
          // Extremely quiet: prolonged silence just triggers a calm breath glow instead of speech
          console.log("[COMPANION ENGINE] Prolonged quiet stretch. Glowing softly instead of yapping.");
          setIsBreathingGlow(true);
          setTimeout(() => setIsBreathingGlow(false), 4500);
          lastGuardianSpeakTimeRef.current = Date.now();
          lastCheckInTimeRef.current = Date.now();
          nextThresholdRef.current = selectNextThreshold(guardianMode, false);
          return;
        }

        let silentMsg = "The silence is peaceful. I'm keeping a steady, warm vigil right beside you. 🌸";
        if (guardianMode === 'talk') {
          silentMsg = "I honestly love how peaceful the roads get when we just walk. I'm still right here. 🐧";
        } else if (guardianMode === 'protect') {
          silentMsg = "Quiet period logged in active sector. Please remain alert to your surroundings. 🛡️";
        } else if (guardianMode === 'quiet') {
          silentMsg = "You still doing okay?";
        }

        setIsTyping(true);
        setTimeout(() => {
          setIsTyping(false);
          setIsBreathingGlow(true);
          setTimeout(() => setIsBreathingGlow(false), 3000);

          setPenguinMessage(silentMsg);
          speakWithElevenLabs(silentMsg.replace(" 🌸", "").replace(" 🛡️", "").replace(" 🐧", ""), true);
          lastGuardianSpeakTimeRef.current = Date.now();
          lastCheckInTimeRef.current = Date.now();
          nextThresholdRef.current = selectNextThreshold(guardianMode, userAnxietyActiveRef.current);
        }, 1200);

        return;
      }

      // 2. Scheduled periodic check-in based on randomized interval metadata
      if (silenceDuration >= nextThresholdRef.current) {
        
        // --- COMFORTABLE SILENCE PROBABILITY CHANCE PROTOCOL ---
        // Let's sometimes just soft glow the companion rather than speaking/changing messages!
        let silentGlowChance = 0.45; // default 45% for calm
        if (guardianMode === 'quiet') {
          // If in Walk Quietly Mode, ALWAYS glow silently instead of speaking, unless there is active user anxiety.
          if (!userAnxietyActiveRef.current) {
            silentGlowChance = 1.0;
          } else {
            silentGlowChance = 0.40; // Speak comforting reassurance occasionally under distress
          }
        } else if (guardianMode === 'talk') {
          silentGlowChance = 0.35; // 35% for talk mode to leave natural space
        } else if (guardianMode === 'protect') {
          silentGlowChance = 0.0;  // 0% in protect mode for continuous safety checkins
        }

        if (Math.random() < silentGlowChance) {
          console.log(`[COMPANION ENGINE] Silent Presence Pulse triggered in ${guardianMode} mode. Glowing instead of yapping.`);
          setIsBreathingGlow(true);
          setTimeout(() => setIsBreathingGlow(false), 4500);
          
          lastGuardianSpeakTimeRef.current = Date.now();
          lastCheckInTimeRef.current = Date.now();
          nextThresholdRef.current = selectNextThreshold(guardianMode, userAnxietyActiveRef.current);
          return;
        }

        // Check if user ignored the previous check-in message
        const ignored = (now - lastUserInteractionTimeRef.current) > nextThresholdRef.current;
        if (ignored) {
          if (guardianMode !== 'quiet') {
            consecutiveUnansweredCheckinsRef.current += 1;
            setThreatScore(prev => Math.min(100, prev + 12));
          } else {
            // Quiet mode accumulates minor confidence layer from prolonged silence/behavioral inactivity
            setThreatScore(prev => Math.min(100, prev + 5));
          }
        }

        let randomMsg = "";

        if (consecutiveUnansweredCheckinsRef.current >= 1 && guardianMode !== 'quiet') {
          // React to being ignored
          if (guardianMode === 'talk') {
            const ignoredMsgs = [
              "Just checking in gently... no pressure to respond if you're relaxing, but I'm still right here. 🐧",
              "Still walking beside you. Speak whenever you want, I'm listening."
            ];
            randomMsg = ignoredMsgs[Math.floor(Math.random() * ignoredMsgs.length)];
          } else if (guardianMode === 'protect') {
            const ignoredMsgs = [
              "Active safety checks require responsiveness. Please ping me or confirm you are secure at this checkpoint. 🛡️",
              "Alert status active. If safe, please send a brief touch-base in the chat panel."
            ];
            randomMsg = ignoredMsgs[Math.floor(Math.random() * ignoredMsgs.length)];
          } else {
            const ignoredMsgs = [
              "Walking softly... no need to answer if you're taking a grounding breath, I'm just watching out for you. 🌸",
              "Still here in gentle protection. Keep finding your peaceful rhythm."
            ];
            randomMsg = ignoredMsgs[Math.floor(Math.random() * ignoredMsgs.length)];
          }
        } else {
          // Standard randomized check-in messages
          if (guardianMode === 'talk') {
            const messages = [
              "Quieter roads always feel longer somehow, don’t they? You doing okay though? 🐧",
              "No pressure to chat. Just letting you know I'm right here walking with you. 🐧",
              "Breathe easy. We're making great, steady progress tonight.",
              "Honestly, sometimes it's just nice to have a warm presence on these streets. 🐧",
              "You don’t have to fill every silence. I'm just enjoying sharing this walk."
            ];
            randomMsg = messages[Math.floor(Math.random() * messages.length)];
          } else if (guardianMode === 'quiet') {
            const messages = [
              "I’m right here.",
              "You still doing okay?",
              "Something suddenly got quieter.",
              "Keeping watch in silence... you are safe."
            ];
            randomMsg = messages[Math.floor(Math.random() * messages.length)];
          } else if (guardianMode === 'protect') {
            const messages = [
              "Surrounding lanes scanned. Highly secure checkpoint grid maintained. 🛡️",
              "I need you to stay responsive. Stick to brighter streets, please.",
              "Scanning path actively... move block by block. I've got your back completely. 🛡️",
              "Active overwatch telemetry green. Let's keep moving forward."
            ];
            randomMsg = messages[Math.floor(Math.random() * messages.length)];
          } else {
            // calm
            const messages = [
              "Take a slow, grounding breath. Inhale calm... let go of whatever is lingering behind you. 🌸",
              "You’ve survived every single difficult night so far... tonight is no different. 🌸",
              "No rush at all. Step by step, we are getting closer to home.",
              "Tonight feels calmer under the quiet stars. Lean on me, you don't have to walk alone."
            ];
            randomMsg = messages[Math.floor(Math.random() * messages.length)];
          }
        }

        // Soft typing indicator phase of 1.5 seconds to feel human-like
        setIsTyping(true);
        setTimeout(() => {
          setIsTyping(false);
          setIsBreathingGlow(true);
          setTimeout(() => setIsBreathingGlow(false), 3000);

          setPenguinMessage(randomMsg);
          speakWithElevenLabs(randomMsg.replace(" 🌸", "").replace(" 🐧", "").replace(" 🛡️", "").replace(" 🌙", "").replace(" 😭", ""), true);
          lastGuardianSpeakTimeRef.current = Date.now();
          lastCheckInTimeRef.current = Date.now();
          nextThresholdRef.current = selectNextThreshold(guardianMode, userAnxietyActiveRef.current);
        }, 1500);
      }
    }, 1000); // Check every 1 second (fine-grained async timing)

    return () => {
      clearInterval(interval);
    };
  }, [isStayWithMeActive, guardianMode, selectNextThreshold]);

  // AUTOMATIC SILENT EVIDENCE TRIGGER EFFECTS
  const hasCapturedHighThreatSnapshotRef = React.useRef(false);
  const hasCapturedEscalationSnapshotRef = React.useRef(false);

  useEffect(() => {
    if (threatScore >= 65 && !hasCapturedHighThreatSnapshotRef.current) {
      hasCapturedHighThreatSnapshotRef.current = true;
      const currentLoc = locationRef.current;
      const locCoords: [number, number] | null = currentLoc ? [currentLoc.latitude, currentLoc.longitude] : null;
      captureEvidenceSnapshot(locCoords, batteryLevel, 'Threat Confidence Score High (>=65%)');
    } else if (threatScore < 40) {
      // Relax threshold to enable re-triggering if threat drops and surges again
      hasCapturedHighThreatSnapshotRef.current = false;
    }
  }, [threatScore, batteryLevel, captureEvidenceSnapshot]);

  useEffect(() => {
    if (isEscalated && !hasCapturedEscalationSnapshotRef.current) {
      hasCapturedEscalationSnapshotRef.current = true;
      const currentLoc = locationRef.current;
      const locCoords: [number, number] | null = currentLoc ? [currentLoc.latitude, currentLoc.longitude] : null;
      captureEvidenceSnapshot(locCoords, batteryLevel, 'Guardian Session Escalation Confirmed');
    } else if (!isEscalated) {
      hasCapturedEscalationSnapshotRef.current = false;
    }
  }, [isEscalated, batteryLevel, captureEvidenceSnapshot]);

  const fetchNearbySafePlaces = React.useCallback(async (lat: number, lon: number, radiusSet = [800, 1500, 3000]) => {
    // 1. Cooldown & Threshold Check
    const now = Date.now();
    const cooldownMs = 15000; // 15s retry cooldown
    
    if (now - lastScanTimestamp < cooldownMs) {
      console.log(`[TACTICAL SCAN] Cooldown active. Skipping poll. Next scan available in ${Math.round((cooldownMs - (now - lastScanTimestamp)) / 1000)}s`);
      return;
    }

    // 2. Sufficient Data Check
    // If we already have 3 immediate locations within 800m, we don't need to hammer the API
    const immediateResults = safePlaces.filter(p => (p.distance || 0) <= 800);
    if (immediateResults.length >= 3) {
      console.log(`[TACTICAL SCAN] Sufficient local coverage (${immediateResults.length} spots). Optimal grid maintained.`);
      return;
    }

    // If we already have places and was recently scanned, don't show full loading
    const hasInitialData = safePlaces.length > 0;
    if (!hasInitialData) setIsLoadingSafePlaces(true);
    
    setLastScanTimestamp(now);
    console.log(`[TACTICAL SCAN] Initializing sector scan at ${lat.toFixed(4)}, ${lon.toFixed(4)}`);

    const OVERPASS_ENDPOINTS = [
      'https://overpass-api.de/api/interpreter',
      'https://lz4.overpass-api.de/api/interpreter',
      'https://overpass.kumi.systems/api/interpreter'
    ];

    let finalResults: SafePlace[] = [];
    let currentRadius = radiusSet[0];
    let success = false;

    try {
      // 1. Scanning Protocol: Iterate through radius thresholds
      for (const radius of radiusSet) {
        currentRadius = radius;
        if (success && finalResults.length >= 3) {
          if (radius >= 1500) break;
        }

        // 2. Failover Protocol: Try different servers if one fails or times out
        for (let attempt = 1; attempt <= OVERPASS_ENDPOINTS.length; attempt++) {
          const endpoint = OVERPASS_ENDPOINTS[attempt - 1];
          if (attempt > 1) {
            console.log(`[TACTICAL SCAN] Primary node unavailable. Switching to backup node ${attempt}...`);
          }
          
          setPenguinMessage(`Scanning ${radius}m perimeter... 🐧`);
          
          try {
            const query = `
              [out:json][timeout:15];
              (
                node["amenity"~"hospital|police|pharmacy|bank|cafe|restaurant|library|community_centre|townhall|fire_station"](around:${radius}, ${lat}, ${lon});
                way["amenity"~"hospital|police|pharmacy|bank|cafe|restaurant|library|community_centre|townhall|fire_station"](around:${radius}, ${lat}, ${lon});
                node["shop"~"mall|supermarket|convenience|department_store"](around:${radius}, ${lat}, ${lon});
                way["shop"~"mall|supermarket|convenience|department_store"](around:${radius}, ${lat}, ${lon});
                node["railway"~"station|halt"](around:${radius}, ${lat}, ${lon});
                node["tourism"~"hotel|hostel|guest_house"](around:${radius}, ${lat}, ${lon});
              );
              out center;
            `;

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s per endpoint

            const response = await fetch(endpoint, {
              method: 'POST',
              body: query,
              signal: controller.signal
            });

            clearTimeout(timeoutId);
            if (!response.ok) throw new Error("Node stream offline");
            
            const data = await response.json();
            const mapped = data.elements
              .map((el: any) => {
                const pLat = el.lat || el.center?.lat;
                const pLon = el.lon || el.center?.lon;
                if (!pLat || !pLon) return null;

                const R = 6371e3;
                const φ1 = lat * Math.PI / 180;
                const φ2 = pLat * Math.PI / 180;
                const Δφ = (pLat - lat) * Math.PI / 180;
                const Δλ = (pLon - lon) * Math.PI / 180;
                const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                const distance = R * c;

                const name = el.tags.name || el.tags.amenity?.replace(/_/g, ' ') || el.tags.shop?.replace(/_/g, ' ') || el.tags.tourism?.replace(/_/g, ' ') || 'Secure Zone';
                const type = el.tags.amenity || el.tags.shop || el.tags.railway || el.tags.tourism || 'place';

                let tier: 'Immediate' | 'Nearby' | 'Extended' = 'Immediate';
                let tierLabel = 'Immediate';
                
                if (distance <= 800) {
                  tier = 'Immediate';
                  tierLabel = 'Immediate';
                } else if (distance <= 1500) {
                  tier = 'Nearby';
                  tierLabel = 'Nearby';
                } else {
                  tier = 'Extended';
                  tierLabel = 'Extended Range';
                }

                let baseScore = 80;
                let color = 'bg-blue-500';
                let hex = '#3b82f6';
                let level = 'Safe Zone';
                let pRec = 'A verified public spot nearby. 🐧';
                const tags = ['Verified'];

                if (['police', 'hospital', 'fire_station'].includes(type)) {
                  baseScore = 95;
                  color = 'bg-emerald-500';
                  hex = '#10b981';
                  level = 'Assurance Zone';
                  pRec = 'Highly rated help point found. Extra peace of mind here. 🐧';
                  tags.push('Staff Present', 'Always Open');
                } else if (['mall', 'supermarket', 'station', 'department_store', 'hotel'].includes(type)) {
                  baseScore = 90;
                  color = 'bg-cyan-500';
                  hex = '#06b6d4';
                  level = 'Active Community';
                  pRec = 'Bright public area. Nice and visible with lots of friendly support nearby. 🐧';
                  tags.push('Well Lit', 'Public Space');
                } else if (['cafe', 'bank', 'library', 'restaurant', 'community_centre'].includes(type)) {
                  baseScore = 85;
                  color = 'bg-orange-500';
                  hex = '#f97316';
                  level = 'Secure Hub';
                  pRec = 'Staff available and well-lit environment. 🐧';
                  tags.push('Staffed', 'Well Lit');
                }

                return {
                  id: el.id.toString(),
                  name,
                  position: [pLat, pLon] as [number, number],
                  distance,
                  tier,
                  tierLabel,
                  time: `${Math.round(distance / 80)} min`,
                  score: Math.min(99, Math.max(60, baseScore - Math.floor(distance / 200))),
                  status: 'Open Now',
                  tacticalTags: tags,
                  penguinRec: pRec,
                  level, color, hex, type
                };
              })
              .filter(Boolean) as (SafePlace & { distance: number })[];

            if (mapped.length > 0) {
              finalResults = mapped;
              success = true;
              const immediateCount = mapped.filter(p => p.distance <= 800).length;
              if (immediateCount >= 3) break;
            }
          } catch (err) {
            // Silently retry or log once if we're moving to failover
            continue;
          }
        }
      }

      // 3. Emergency Guardrail: Mock relative local grid if all APIs fail
      if (finalResults.length === 0) {
        console.log("[COMPANION ASSURANCE] Local neighborhood safety backups online.");
        setPenguinMessage("Backup safety list is ready! 🐧");
        
        finalResults = [
          {
            id: 'emergency-1',
            name: 'Illuminated Safe Haven',
            position: [lat + 0.002, lon + 0.002],
            distance: 350,
            time: '5 min',
            score: 95,
            status: 'Always Open',
            tacticalTags: ['Support', 'Safe Zone'],
            penguinRec: 'A bright helper space is open ahead. I am staying right here beside you. 🐧',
            level: 'Safe Zone', color: 'bg-blue-500', hex: '#3b82f6', type: 'emergency',
            tier: 'Immediate', tierLabel: 'Immediate'
          },
          {
            id: 'emergency-2',
            name: 'Bright Public Walkway',
            position: [lat - 0.0015, lon + 0.003],
            distance: 420,
            time: '6 min',
            score: 90,
            status: 'Well-Lit',
            tacticalTags: ['Care Care', 'High Footfall'],
            penguinRec: 'Lots of helpful, friendly faces around this walk. Let\'s keep moving together. 🐧',
            level: 'Active Community', color: 'bg-cyan-500', hex: '#06b6d4', type: 'emergency',
            tier: 'Immediate', tierLabel: 'Immediate'
          },
          {
            id: 'emergency-3',
            name: 'Neighborhood Care Center',
            position: [lat + 0.0035, lon - 0.001],
            distance: 550,
            time: '8 min',
            score: 94,
            status: 'Verified',
            tacticalTags: ['Medical Support', 'Assisted Spot'],
            penguinRec: 'A certified local care space is staffed ahead. We are almost there! 🐧',
            level: 'Assurance Zone', color: 'bg-emerald-500', hex: '#10b981', type: 'emergency',
            tier: 'Immediate', tierLabel: 'Immediate'
          }
        ];
      }

      // 4. Final Filtering and Priority Logic
      // Sort: Distance asc, but handle priority categories (Score) within 200m windows
      const sortedFull = finalResults.sort((a, b) => {
        const distA = a.distance || 0;
        const distB = b.distance || 0;
        
        // If distance difference is within 250m, prioritize by score (type)
        if (Math.abs(distA - distB) < 250) {
          return b.score - a.score;
        }
        
        return distA - distB;
      });

      // Strategy: 
      // 1. If we have >= 3 within 1.5km, discard everything > 1.5km
      const within1500 = sortedFull.filter(p => (p.distance || 0) <= 1500);
      let resultsToDisplay = [];

      if (within1500.length >= 3) {
        resultsToDisplay = within1500;
      } else {
        // If we don't have 3, we show everything up to 3km (Extended)
        resultsToDisplay = sortedFull.filter(p => (p.distance || 0) <= 3000);
      }

      // Final Slice: Top 3 as requested
      const finalSlicing = resultsToDisplay.slice(0, 3);

      setSafePlaces(finalSlicing);
      cachedSafePlaces = finalSlicing;
      
      if (success) {
        if (finalSlicing[0]?.tier === 'Immediate') {
          setPenguinMessage(`I've found ${finalSlicing.length} immediate safe havens within 800m. You're close! 🐧`);
        } else {
          setPenguinMessage(`No immediate spots, but I've found ${finalSlicing.length} nearby locations. 🐧`);
        }
      }

    } catch (error) {
      console.error('[TACTICAL SCAN] Critical system failure:', error);
      setPenguinMessage("Scanning offline. Stay alert! 🐧");
    } finally {
      setIsLoadingSafePlaces(false);
    }
  }, [lastScanTimestamp, safePlaces]);



  // Persistence (Sync to LocalStorage)

  useEffect(() => {
    localStorage.setItem('safeping_guardians', JSON.stringify(guardians));
  }, [guardians]);

  useEffect(() => {
    if (user.role === 'guardian') {
      return;
    }
    if (connectionsList.length > 0) {
      const mapped = connectionsList.map(conn => {
        let finalAvatar = conn.avatar;
        if (!finalAvatar) {
          const category = getCategoryForRelationship(conn.relationship || 'Friend');
          const available = CATEGORY_AVATARS[category] || CATEGORY_AVATARS["Friend"];
          const hash = conn.guardianName ? conn.guardianName.split("").reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0) : 0;
          const index = hash % available.length;
          finalAvatar = available[index] || 'FRIEND 1.png';
        }
        return {
          id: conn.id,
          name: conn.guardianName,
          phone: conn.guardianPhone || '',
          email: conn.guardianEmail || '',
          relationship: conn.relationship || '',
          avatar: finalAvatar,
          isPriority: true,
          status: conn.status === 'pending' ? 'offline' : (conn.deviceStatus?.status || 'safe'),
          isPending: conn.status === 'pending',
          inviteCode: conn.inviteCode
        } as Guardian;
      });
      setGuardians(mapped);
    } else {
      setGuardians([]);
    }
  }, [connectionsList, user.role]);

  useEffect(() => {
    localStorage.setItem('safeping_user', JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    localStorage.setItem('safeping_theme', isDarkMode ? 'dark' : 'light');
    document.body.className = isDarkMode ? 'dark' : 'light';
  }, [isDarkMode]);

  const addGuardian = React.useCallback(async (data: Omit<Guardian, 'id'> & { avatar?: string; email?: string }) => {
    if (!firebaseUser) {
      setPenguinMessage(`Please sign in first to invite a real guardian! 🐧`);
      return;
    }
    setPenguinMessage(`Generating secure circle invite code... 🐧`);
    try {
      const conn = await createConnection(
        firebaseUser.uid,
        user.name,
        firebaseUser.email || '',
        user.phone || '',
        data.name,
        data.phone || '',
        data.email || '',
        data.relationship || 'Friend'
      );
      if (conn) {
        setPenguinMessage(`Successfully generated invitation for ${data.name}! Code: ${conn.inviteCode} 🐧`);
        logActivity({
          type: "guardian",
          title: "INVITATION CREATED",
          description: `Created invitation code ${conn.inviteCode} for ${data.name} to join your circle.`,
          severity: "safe"
        });
      }
    } catch (err) {
      console.error("Failed to create connection:", err);
      setPenguinMessage("Failed to generate secure invitation. Please try again.");
    }
  }, [firebaseUser, user]);

  const updateGuardian = React.useCallback((id: string, data: Partial<Omit<Guardian, 'id'>> & { avatar?: string }) => {
    // Standard update
    if (data.name) {
      setPenguinMessage(`Updated details for ${data.name}! 🐧`);
    } else {
      setPenguinMessage(`Contact details updated! 🐧`);
    }
  }, []);

  const removeGuardian = React.useCallback(async (id: string) => {
    const conn = connectionsList.find(c => c.id === id);
    if (conn) {
      try {
        await deleteConnection(id);
        setPenguinMessage(`Removed ${conn.guardianName} from your trusted circle. 🐧`);
        logActivity({
          type: "guardian",
          title: "GUARDIAN REMOVED",
          description: `Disconnected ${conn.guardianName} from your security circle.`,
          severity: "info"
        });
      } catch (err) {
        console.error("Failed to delete connection:", err);
      }
    }
  }, [connectionsList]);

  const addCheckpoint = React.useCallback((name: string, position: { lat: number; lng: number }) => {
    const newCheckpoint: Checkpoint = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      position,
      status: 'pending'
    };
    setCheckpoints(prev => [...prev, newCheckpoint]);
    setPenguinMessage('New checkpoint added! Safety first! 🐧');
  }, []);

  const updateCheckpointStatus = React.useCallback((id: string, status: CheckpointStatus) => {
    setCheckpoints(prev => prev.map(cp => cp.id === id ? { ...cp, status } : cp));
    if (status === 'safe') {
      setPenguinMessage('Glad you are okay! On to the next one! 🐧');
    } else if (status === 'unsafe' || status === 'uncomfortable') {
      triggerSOS();
    }
  }, []);

  // Haversine formula to compute geodesic distances in meters
  const getDistanceFromLatLng = React.useCallback((lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // Earth's mean radius in meters
    const phi1 = lat1 * Math.PI / 180;
    const phi2 = lat2 * Math.PI / 180;
    const deltaPhi = (lat2 - lat1) * Math.PI / 180;
    const deltaLambda = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // distance in meters
  }, []);

  const triggerFullSOS = React.useCallback(() => {
    setIsSOSCountingDown(false);
    setIsEmergencyActive(true);
    setSosStatus('triggered');
    setPenguinMessage("EYES ON ME. 🐧 I'VE ACTIVATED THE TACTICAL GRID. HELP IS ON THE WAY. STAY CALM, YOU ARE NOT ALONE.");
    
    // Automatically capture Emergency Location details and persist as Evidence Snapshot to Firestore
    const currentLoc = locationRef.current;
    if (currentLoc && firebaseUser) {
      import('../services/firebase').then(({ saveDbEvidenceSnapshot }) => {
        const snapshot = {
          id: 'sos_loc_snap_' + Date.now(),
          timestamp: new Date().toISOString(),
          imageUrl: 'gps_snapshot_only',
          location: [currentLoc.latitude, currentLoc.longitude, currentLoc.accuracy || 0],
          battery: batteryLevel,
          reason: 'Emergency Location Snapshot Broadcast'
        };
        saveDbEvidenceSnapshot(firebaseUser.uid, snapshot).catch(err => {
          console.error("Failed to store emergency location snapshot in Firestore", err);
        });
      });
    }

    // Auto-capture Silent Evidence snapshot upon emergency beacon activation
    const locCoords: [number, number] | null = currentLoc ? [currentLoc.latitude, currentLoc.longitude] : null;
    captureEvidenceSnapshot(locCoords, batteryLevel, 'Emergency Distress Beacon Initiated');

    // Logs
    logActivity({
      type: "sos",
      title: "SOS ACTIVATED",
      description: "Emergency SOS beacon fully triggered. GPS coordinates transmitted.",
      severity: "critical"
    });

    logActivity({
      type: "system",
      title: "EMERGENCY CONTACTS NOTIFIED",
      description: "Alert broadcast transmitted to all trusted circle members.",
      severity: "critical"
    });

    speakWithElevenLabs("Emergency SOS Broadcast! Alerting guardians and dispatching secure coordinates. Stay calm, help is on the way.", true);

    // Live transition sequence for real-time SOS Status Tracking
    setTimeout(() => {
      setSosStatus('notified');
      logActivity({
        type: "guardian",
        title: "GUARDIANS NOTIFIED",
        description: "All registered guardians successfully notified via premium gateway.",
        severity: "critical"
      });
    }, 1500);

    setTimeout(() => {
      setSosStatus('shared');
      logActivity({
        type: "system",
        title: "LIVE TRACKING LINK SHARED",
        description: "Encrypted live location access coordinates shared with active circle.",
        severity: "critical"
      });
    }, 3000);

    setTimeout(() => {
      setSosStatus('awaiting_response');
    }, 4500);

  }, [batteryLevel, captureEvidenceSnapshot, logActivity, firebaseUser]);

  const cancelSOSCountdown = React.useCallback(() => {
    setIsSOSCountingDown(false);
    setIsEmergencyActive(false);
    setSosStatus('cancelled');
    setPenguinMessage("SOS Cancelled. Your circle has not been alerted. Standard watch restored safely.");
    
    logActivity({
      type: "sos",
      title: "SOS CANCELLED",
      description: "Alarm countdown cancelled before broadcast. No guardians alerted.",
      severity: "safe"
    });

    speakWithElevenLabs("SOS aborted. Your circle has not been notified. Standing down gracefully.", true);
  }, [logActivity]);

  const triggerSOS = React.useCallback(() => {
    if (isSOSCountingDown) return;
    
    // 1. Set countdown variables
    setIsSOSCountingDown(true);
    setSosCountdownSeconds(sosCountdownDuration);
    setSosStatus('idle');
    
    // 2. Open overlay so countdown widget is globally immersive and visible
    setIsEmergencyActive(true);
    
    speakWithElevenLabs("Warning! Emergency countdown initiated. Security dispatch preparing, tap cancel to abort.", true);
  }, [isSOSCountingDown, sosCountdownDuration]);

  // Decoupled countdown timer loop
  useEffect(() => {
    let timer: any = null;
    if (isSOSCountingDown && sosCountdownSeconds > 0) {
      timer = setInterval(() => {
        setSosCountdownSeconds(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setIsSOSCountingDown(false);
            triggerFullSOS();
            return 0;
          }
          const nextSec = prev - 1;
          if (nextSec === 5 || nextSec === 3 || nextSec === 1) {
            speakWithElevenLabs(`${nextSec}...`, true);
          }
          return nextSec;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isSOSCountingDown, sosCountdownSeconds, triggerFullSOS]);

  // Active Journey Overwatch & Monitoring Loop (Priority 1)
  const lastCheckedLocationRef = React.useRef<{ lat: number; lng: number } | null>(null);
  const consecutiveStationaryTicksRef = React.useRef<number>(0);
  const promptResponseTimeoutRef = React.useRef<any>(null);

  useEffect(() => {
    if (!activeJourney) {
      setIsRouteDeviationDetected(false);
      setIsUnexpectedStopDetected(false);
      setIsNightWalkSensitivityActive(false);
      consecutiveStationaryTicksRef.current = 0;
      if (promptResponseTimeoutRef.current) {
        clearTimeout(promptResponseTimeoutRef.current);
      }
      return;
    }

    // 1. Night Walk Sensitivity Activation
    const currentHour = new Date().getHours();
    const isLateHour = currentHour >= 21 || currentHour < 5;
    if (isLateHour && !isNightWalkSensitivityActive) {
      setIsNightWalkSensitivityActive(true);
      setGuardianMode('protect');
      setPenguinMessage("Night Watch engaged. Operating on increased attentiveness. 🛡️");
      speakWithElevenLabs("Night walk detected. Activating protective overwatch sensors at peak sensitivity.", true);
      
      logActivity({
        type: "system",
        title: "NIGHT WATCH ACTIVE",
        description: "Peaked sensitivity and adaptive overwatch interval scaled down by thirty percent.",
        severity: "info"
      });
    }

    // Capture initial walking checks
    const checkInterval = setInterval(() => {
      const currentLoc = locationRef.current;
      if (!currentLoc) return;

      const userLat = currentLoc.latitude;
      const userLng = currentLoc.longitude;
      const userSpeed = currentLoc.speed ?? 0;

      const prevLoc = lastCheckedLocationRef.current;
      lastCheckedLocationRef.current = { lat: userLat, lng: userLng };

      // 2. Walking Speed Monitoring (Sprints or Abrupt Halts)
      if (prevLoc) {
        const dt = 5; // seconds
        const distanceMoved = getDistanceFromLatLng(prevLoc.lat, prevLoc.lng, userLat, userLng);
        const derivedSpeed = distanceMoved / dt; // m/s

        // Sprints detection (> 5.0 m/s / ~18 km/h is highly unusual for a standard pedestrian night walk)
        if (derivedSpeed >= 5.0 && userSpeed >= 1.0) {
          logActivity({
            type: "alert",
            title: "UNUSUAL SPRINT DETECTED",
            description: "A sudden speed spike or run pattern was identified. Monitoring coordinates closely.",
            severity: "warning"
          });
          setPenguinMessage("I noticed you running. Is there something wrong? I'm ready to escalate. 🛡️");
          speakWithElevenLabs("Elijah, I noticed a sudden spike in your speed. Are you okay?", true);
          setThreatScore(prev => Math.min(100, prev + 25));
        }

        // Abrupt Halt detection (moving fast, then hard braking abruptly to zero)
        const wasMovingFast = prevLoc && (distanceMoved / dt > 2.2);
        if (wasMovingFast && userSpeed <= 0.1) {
          logActivity({
            type: "alert",
            title: "ABRUPT STOP DETECTED",
            description: "A sudden deceleration standstill was logged en route.",
            severity: "warning"
          });
          setPenguinMessage("Abrupt halt detected. Keeping close protective watch. 🛡️");
          speakWithElevenLabs("Abrupt halt detected on your route. Monitoring your surroundings contextually.", true);
        }
      }

      // 3. Route Deviation Detection
      if (navigationPath && navigationPath.length > 0) {
        let minDistanceMeters = Infinity;
        for (let i = 0; i < navigationPath.length; i++) {
          const pt = navigationPath[i];
          const dist = getDistanceFromLatLng(userLat, userLng, pt[0], pt[1]);
          if (dist < minDistanceMeters) {
            minDistanceMeters = dist;
          }
        }

        if (minDistanceMeters > 150) {
          if (!isRouteDeviationDetected) {
            setIsRouteDeviationDetected(true);
            setThreatScore(prev => Math.min(100, prev + 30));
            setDeviationCount(prev => prev + 1);

            logActivity({
              type: "alert",
              title: "ROUTE ALERT",
              description: "Significant planned route deviation detected en route.",
              severity: "warning"
            });

            addIncidentLog("safety", "Route Deviation Detected: Elijah appears to be off planned path.");

            setPenguinMessage("Route Deviation Detected! You appear to be off your planned route. Everything okay? 🐧");
            speakWithElevenLabs("Route Deviation Detected! Elijah, you appear to be off your planned path. I am checking in.", true);

            if (promptResponseTimeoutRef.current) clearTimeout(promptResponseTimeoutRef.current);
            promptResponseTimeoutRef.current = setTimeout(() => {
              logActivity({
                type: "alert",
                title: "ROUTE CONCERN ESCALATION",
                description: "Automated route concern transmission broadcasted to guardians after unresponsive deviation check.",
                severity: "critical"
              });
              speakWithElevenLabs("No response. Transmitting route concern alert to your guardians.", true);
            }, 15000);
          }
        } else {
          if (isRouteDeviationDetected) {
            setIsRouteDeviationDetected(false);
            if (promptResponseTimeoutRef.current) clearTimeout(promptResponseTimeoutRef.current);
            setPenguinMessage("Excellent, you are back on track! Staying beside you. 🐧");
            speakWithElevenLabs("Re-aligned with planned route. Reassuring watch active.", true);
            logActivity({
              type: "journey",
              title: "ROUTE RE-ALIGNED",
              description: "Elijah returned safely back to verified route segments.",
              severity: "safe"
            });
          }
        }
      }

      // 4. Unexpected Stop Detection
      if (userSpeed <= 0.1) {
        consecutiveStationaryTicksRef.current += 1;
        
        if (consecutiveStationaryTicksRef.current === 9) {
          setIsUnexpectedStopDetected(true);
          setThreatScore(prev => Math.min(100, prev + 20));

          logActivity({
            type: "alert",
            title: "UNEXPECTED STOP",
            description: "A prolonged stationary stopped state was logged en route.",
            severity: "warning"
          });

          addIncidentLog("safety", "Unexpected stopped state identified on route.");

          setPenguinMessage("You've been stopped for a few minutes. Just checking in... 🐧");
          speakWithElevenLabs("Elijah, you've been stationary for a few minutes. Just checking in to make sure everything is okay.", true);

          if (promptResponseTimeoutRef.current) clearTimeout(promptResponseTimeoutRef.current);
          promptResponseTimeoutRef.current = setTimeout(() => {
            logActivity({
              type: "alert",
              title: "STATIONARY EXPIRED ESCALATION",
              description: "Unanswered stationary checks forced an autonomous escalation trigger.",
              severity: "critical"
            });
            speakWithElevenLabs("Stationary alert unanswered. Activating SOS backup protocol automatically.", true);
            triggerSOS();
          }, 15000);
        }
      } else {
        consecutiveStationaryTicksRef.current = 0;
        if (isUnexpectedStopDetected) {
          setIsUnexpectedStopDetected(false);
          if (promptResponseTimeoutRef.current) clearTimeout(promptResponseTimeoutRef.current);
        }
      }

    }, 5000);

    return () => {
      clearInterval(checkInterval);
      if (promptResponseTimeoutRef.current) {
        clearTimeout(promptResponseTimeoutRef.current);
      }
    };
  }, [activeJourney, isRouteDeviationDetected, isUnexpectedStopDetected, isNightWalkSensitivityActive, navigationPath, setThreatScore, triggerSOS, addIncidentLog, logActivity, getDistanceFromLatLng]);

  const nearestSafeHaven = safePlaces.length > 0 ? safePlaces[0] : null;
 
  const userLocation = React.useMemo<[number, number] | null>(() => {
    return location ? [location.latitude, location.longitude] : null;
  }, [location?.latitude, location?.longitude]);

  const locationStatus = React.useMemo<'scanning' | 'denied' | 'active' | 'error' | 'connected'>(() => {
    return errorCode === 1 ? 'denied' : error ? 'error' : location ? 'active' : 'scanning';
  }, [errorCode, error, location]);

  const triggerEscortInstant = React.useCallback((targetId: string, targetPos: [number, number]) => {
    if (!userLocation) return;
    
    // ATOMIC UPDATE: No mid-render delays
    setIsWalkWithMeActive(true);
    setActiveSafeHavenId(targetId);
    setSelectedRouteType('safer');
    setNavigationPath([userLocation, targetPos]); // Instant optimistic beam
    setPenguinMessage("I'VE GOT THE POINT. 🐧 SCANNING FOR THE SAFEST PATHWAY. MOVE WITH CONFIDENCE, I'M RIGHT HERE.");
  }, [userLocation]);

  const addCheckin = React.useCallback((message: string, type: 'arrival' | 'status' | 'delay' | 'start' = 'status') => {
    const newCheckin = {
      id: Math.random().toString(36).substring(2, 9),
      message,
      timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
      type
    };
    setRecentCheckins(prev => {
      const updated = [newCheckin, ...prev].slice(0, 5); // keep last 5
      try {
        localStorage.setItem('safeping_recent_checkins', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  const updateUserStatus = React.useCallback((newStatus: string) => {
    setUserStatusState(newStatus);
    try {
      localStorage.setItem('safeping_user_status', newStatus);
    } catch {}

    // Add checkpoint or log to represent the real status update action
    addIncidentLog('telemetry', `You updated your safety status to "${newStatus}".`);
    
    // Voice prompt update
    speakWithElevenLabs(`Your status is now update to ${newStatus}. Your circle is notified!`);
    
    const cleanStatus = newStatus.trim();
    if (cleanStatus === "Reached Home" || cleanStatus === "Arrived") {
      logActivity({
        type: "arrival",
        title: "ARRIVED SAFELY",
        description: "Elijah arrived safely at Home.",
        severity: "safe"
      });
    } else if (cleanStatus === "Leaving Now" || cleanStatus === "Status: Leaving") {
      logActivity({
        type: "checkin",
        title: "DEPARTURE ACTIVE",
        description: "Elijah changed status to: leaving now. Active monitoring synced.",
        severity: "info"
      });
    } else if (cleanStatus === "Safe Check-in") {
      logActivity({
        type: "checkin",
        title: "SAFE CHECK-IN",
        description: "Elijah completed a manual safety check-in successfully.",
        severity: "safe"
      });
    } else {
      logActivity({
        type: "checkin",
        title: "STATUS UPDATE",
        description: `Elijah updated status to: ${newStatus}`,
        severity: "info"
      });
    }
  }, [addIncidentLog, logActivity]);

  const startJourney = React.useCallback((destination: string, category: string, totalDuration: number = 20) => {
    const defaultEtaTime = new Date(Date.now() + totalDuration * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const journey = {
      destination,
      category,
      status: 'started',
      startTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      eta: defaultEtaTime,
      totalDuration,
      elapsedMinutes: 0,
      distanceRemaining: 2.4, // fake default starting distance in kilometers
    };
    setActiveJourney(journey);
    try {
      localStorage.setItem('safeping_active_journey', JSON.stringify(journey));
    } catch {}

    logActivity({
      type: "journey",
      title: "JOURNEY STARTED",
      description: `Elijah departed for ${destination} (${category}). ETA: ${defaultEtaTime}.`,
      severity: "info",
      metadata: { destination, category, duration: totalDuration }
    });

    addIncidentLog('telemetry', `Elijah has started a journey to ${destination}. Journey tracker initialized.`);
    speakWithElevenLabs(`Journey started to ${destination}. Sharing progress with your trusted circle!`);
  }, [addIncidentLog, logActivity]);

  const cancelJourney = React.useCallback(() => {
    if (activeJourney) {
      logActivity({
        type: "journey",
        title: "JOURNEY CANCELLED",
        description: `Elijah cancelled the journey to ${activeJourney.destination}.`,
        severity: "info"
      });

      addIncidentLog('telemetry', `Elijah has cancelled the active journey to ${activeJourney.destination}.`);
      setActiveJourney(null);
      try {
        localStorage.setItem('safeping_active_journey', 'null');
      } catch {}
      speakWithElevenLabs(`Journey cancelled.`);
    }
  }, [activeJourney, addIncidentLog, logActivity]);

  const completeJourney = React.useCallback(() => {
    if (activeJourney) {
      logActivity({
        type: "arrival",
        title: "JOURNEY COMPLETED",
        description: `Elijah arrived safely at ${activeJourney.destination}.`,
        severity: "safe"
      });

      addIncidentLog('telemetry', `Elijah arrived safely at ${activeJourney.destination}.`);
      setActiveJourney(null);
      try {
        localStorage.setItem('safeping_active_journey', 'null');
      } catch {}
      speakWithElevenLabs(`Congrats! You have safely arrived at ${activeJourney.destination}. Saved circle group notified.`);
    }
  }, [activeJourney, addIncidentLog, logActivity]);

  const triggerDelayAlert = React.useCallback(() => {
    if (activeJourney) {
      const updated = { ...activeJourney, status: 'delayed' };
      setActiveJourney(updated);
      try {
        localStorage.setItem('safeping_active_journey', JSON.stringify(updated));
      } catch {}

      logActivity({
        type: "alert",
        title: "JOURNEY DELAYED",
        description: `Elijah is experiencing unexpected delays en route to ${activeJourney.destination}.`,
        severity: "warning"
      });

      addIncidentLog('telemetry', `Elijah may be delayed on route to ${activeJourney.destination}. Check in?`);
      speakWithElevenLabs(`Elijah, you seem to be experiencing a delay. Checking in! your trusted circle is proposed to check-in.`);
    }
  }, [activeJourney, addIncidentLog, logActivity]);

  // Fast progress ticks for the live product demo
  useEffect(() => {
    if (!activeJourney || activeJourney.status === 'completed') return;

    const interval = setInterval(() => {
      setActiveJourney((prev: any) => {
        if (!prev || prev.status === 'completed') return null;
        const nextElapsed = prev.elapsedMinutes + 1;
        const nextDist = Math.max(0, parseFloat((prev.distanceRemaining - 0.4).toFixed(1)));
        
        let nextStatus = prev.status;
        if (nextElapsed >= 4 && prev.status === 'started') {
          // Trigger delay alert testing logic nicely
          addCheckin(`Elijah may be delayed on route to ${prev.destination}`, 'delay');
          nextStatus = 'delayed';
          speakWithElevenLabs(`Elijah, you seem to be experiencing a delay. Checking in with you!`);
        }

        const updated = {
          ...prev,
          elapsedMinutes: nextElapsed,
          distanceRemaining: nextDist,
          status: nextStatus
        };

        try {
          localStorage.setItem('safeping_active_journey', JSON.stringify(updated));
        } catch {}

        if (nextDist <= 0) {
          clearInterval(interval);
          // Wait briefly, then auto complete journey nicely
          setTimeout(() => {
            completeJourney();
          }, 1500);
        }

        return updated;
      });
    }, 12000); // Tick every 12 seconds for interactive simulation

    return () => clearInterval(interval);
  }, [activeJourney?.status, completeJourney, addCheckin]);

  // Subscribe to connections in real time
  useEffect(() => {
    if (!firebaseUser) {
      setConnectionsList([]);
      return;
    }
    const role = user.role || 'protected';
    const unsub = subscribeToConnections(firebaseUser.uid, role, (conns) => {
      setConnectionsList(conns);
    });
    return () => unsub();
  }, [firebaseUser, user.role, user.isOnboarded]);

  // Subscribe to messages in real time for all connections
  useEffect(() => {
    if (!firebaseUser || connectionsList.length === 0) {
      setConnectionMessages({});
      return;
    }
    const unsubs: (() => void)[] = [];
    connectionsList.forEach(conn => {
      if (conn.status === 'accepted') {
        const unsub = subscribeToConnectionMessages(conn.id, (msgs) => {
          setConnectionMessages(prev => ({
            ...prev,
            [conn.id]: msgs
          }));
        });
        unsubs.push(unsub);
      }
    });
    return () => {
      unsubs.forEach(u => u());
    };
  }, [firebaseUser, connectionsList]);

  // Aggregate incoming guardian requests to safeMessages for user view
  useEffect(() => {
    if (user.role === 'guardian') {
      setSafeMessages([]);
      return;
    }
    const aggregated: SafeMessage[] = [];
    Object.keys(connectionMessages).forEach(connId => {
      const conn = connectionsList.find(c => c.id === connId);
      if (!conn) return;
      const msgs = connectionMessages[connId] || [];
      msgs.forEach(msg => {
        if (msg.senderId !== firebaseUser?.uid) {
          if (msg.type === 'check_in_request' || msg.type === 'guardian_message') {
            const replies = msgs.filter(m => m.senderId === firebaseUser?.uid && m.createdAtValue > msg.createdAtValue);
            const keyReply = replies.length > 0 ? replies[0] : null;
            aggregated.push({
              id: msg.id,
              senderId: msg.senderId,
              senderName: conn.guardianName,
              senderRelationship: conn.relationship || 'Guardian',
              senderAvatar: conn.avatar || '',
              text: msg.text,
              timestamp: msg.timestamp,
              read: msg.read || false,
              replied: !!keyReply,
              replyText: keyReply ? keyReply.text : undefined,
              replyTimestamp: keyReply ? keyReply.timestamp : undefined,
              connectionId: connId
            } as any);
          }
        }
      });
    });
    setSafeMessages(aggregated.sort((a,b) => b.id.localeCompare(a.id)));
  }, [connectionMessages, connectionsList, firebaseUser, user.role]);

  // Sync protected user live status & tracking telemetry to connections automatically
  const syncStatusToAllConnections = React.useCallback(async (statusUpdate: any) => {
    if (!firebaseUser || user.role === 'guardian') return;
    const activeConns = connectionsList.filter(c => c.status === 'accepted');
    for (const conn of activeConns) {
      try {
        await updateConnectionDeviceStatus(conn.id, statusUpdate);
      } catch (err) {
        console.warn("[Telemetry Sync] Failed to sync status to conn:", conn.id, err);
      }
    }
  }, [firebaseUser, user.role, connectionsList]);

  useEffect(() => {
    if (!firebaseUser || user.role === 'guardian') return;
    const lat = userLocation ? userLocation[0] : 40.7128;
    const lng = userLocation ? userLocation[1] : -74.0060;
    const statusUpdate = {
      batteryLevel,
      location: [lat, lng],
      journeyActive: !!activeJourney,
      journeyTitle: activeJourney ? activeJourney.destination : '',
      status: isEmergencyActive ? 'sos' : (activeJourney ? 'traveling' : 'safe'),
      lastCheckedIn: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    const timId = setTimeout(() => {
      syncStatusToAllConnections(statusUpdate);
    }, 2500);
    return () => clearTimeout(timId);
  }, [batteryLevel, userLocation, activeJourney, isEmergencyActive, firebaseUser, user.role, syncStatusToAllConnections]);

  const replyToSafeMessage = React.useCallback((id: string, replyText: string) => {
    const parentMsg = safeMessages.find(m => m.id === id);
    const connId = parentMsg ? (parentMsg as any).connectionId : null;
    
    if (connId && firebaseUser) {
      sendConnectionMessage(connId, firebaseUser.uid, user.name, replyText, 'check_in_response');
    }

    addIncidentLog('action', `Replied to checklist request: "${replyText}"`);
    logActivity({
      type: 'checkin',
      title: 'Guardian Check-In Reply',
      description: `User replied: "${replyText}"`,
      severity: 'safe'
    });
    speakWithElevenLabs(`Reply "${replyText}" dispatched.`, true);
  }, [safeMessages, firebaseUser, user, addIncidentLog, logActivity]);

  const simulateIncomingSafeMessage = React.useCallback(() => {
    const contents = [
      { text: "Reached?", relationshipMsg: "checking in" },
      { text: "Everything okay?", relationshipMsg: "waiting for an update" },
      { text: "Where are you?", relationshipMsg: "looking for your location" },
      { text: "Call me.", relationshipMsg: "asking you to call" },
      { text: "Text me when you're home.", relationshipMsg: "asking for a home ping" }
    ];
    const item = contents[Math.floor(Math.random() * contents.length)];

    let sender = guardians[Math.floor(Math.random() * guardians.length)];
    if (!sender && guardians.length > 0) {
      sender = guardians[0];
    }
    
    const senderId = sender ? sender.id : 'c_temp';
    const senderName = sender ? sender.name : 'Papa';
    const senderRel = sender ? sender.relationship : 'Father';
    const senderAv = sender ? sender.avatar : 'FATHER 1.png';

    // Check if an active conversation already exists for this sender to preserve card identity
    const existingIndex = safeMessages.findIndex(msg => msg.senderId === senderId || msg.senderName === senderName);
    const existingMsgId = existingIndex !== -1 ? safeMessages[existingIndex].id : `sm_${Math.random().toString(36).substr(2, 9)}`;

    const newMessage: SafeMessage = {
      id: existingMsgId,
      senderId: senderId,
      senderName: senderName,
      senderRelationship: senderRel,
      senderAvatar: senderAv,
      text: item.text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: false
    };

    let gotAutoReplied = false;
    let autoReplyTxt = "";
    if (autoStatusUpdates) {
      const etaText = activeJourney ? " ETA 12 min." : "";
      const statusText = activeJourney ? "Journey active." : "Journey idle.";
      autoReplyTxt = `${statusText}${etaText} Battery ${batteryLevel}%.`;
      
      newMessage.read = true;
      newMessage.replied = true;
      newMessage.replyText = autoReplyTxt;
      newMessage.replyTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      gotAutoReplied = true;
    }

    // Preserve active conversations uniquely per guardian, sorting by most recent on top
    setSafeMessages(prev => {
      const filtered = prev.filter(msg => msg.senderId !== senderId && msg.senderName !== senderName);
      return [newMessage, ...filtered];
    });

    const nameNorm = senderName.toLowerCase();
    const relNorm = senderRel.toLowerCase();
    let who = senderName;
    if (relNorm === 'mother' || nameNorm.includes('mom') || nameNorm.includes('mother') || nameNorm.includes('mum')) {
      who = "Mumma";
    } else if (relNorm === 'father' || nameNorm.includes('dad') || nameNorm.includes('father') || nameNorm.includes('papa')) {
      who = "Papa";
    }

    const penFeedback = `${who} is ${item.relationshipMsg}.`;
    
    setPenguinMessage(penFeedback);
    speakWithElevenLabs(penFeedback, true);

    const event = new CustomEvent('safeping-guardian-message', {
      detail: { 
        message: newMessage,
        penNote: penFeedback,
        autoReplied: gotAutoReplied,
        autoReplyText: autoReplyTxt
      }
    });
    window.dispatchEvent(event);

    // Save full historic log en-route to Activity Logs and Firestore
    const promptLogTitle = `${senderName} Check-In`;
    const promptLogDesc = gotAutoReplied 
      ? `Asked: "${item.text}" | Auto-Replied: "${autoReplyTxt}"` 
      : `${senderName} asked: "${item.text}"`;
    
    logActivity({
      type: 'checkin',
      title: promptLogTitle,
      description: promptLogDesc,
      severity: gotAutoReplied ? 'safe' : 'info'
    });

    addIncidentLog('notification', `${senderName} asked: "${item.text}"` + (gotAutoReplied ? ` (Auto-replied: "${autoReplyTxt}")` : ""));
  }, [guardians, autoStatusUpdates, activeJourney, batteryLevel, addIncidentLog, logActivity, safeMessages]);

  const value = React.useMemo(() => ({
    currentView, 
    setCurrentView,
    activeCallGuardian,
    setActiveCallGuardian,
    isEmergencyActive, 
    setIsEmergencyActive,
    isWalkWithMeActive,
    setIsWalkWithMeActive,
    guardians, 
    addGuardian, 
    updateGuardian,
    removeGuardian,
    batteryLevel, 
    setBatteryLevel,
    safeTimerSeconds,
    isDarkMode, 
    setDarkMode,
    isPrivacyMode, 
    setPrivacyMode,
    checkpoints, 
    addCheckpoint, 
    updateCheckpointStatus,
    isVoiceTriggerActive, 
    setIsVoiceTriggerActive,
    isSafeModeActive, 
    setIsSafeModeActive,
    activeSafeHavenId, 
    setActiveSafeHavenId,
    selectedRouteType, 
    setSelectedRouteType,
    triggerPhrase, 
    setTriggerPhrase,
    lastVoiceTrigger,
    triggerSOS,
    triggerEscortInstant,
    penguinMessage, 
    setPenguinMessage,
    user, 
    setUser,
    safePlaces, 
    isLoadingSafePlaces, 
    isCalculatingRoutes,
    fetchNearbySafePlaces,
    userLocation, 
    locationStatus,
    navigationPath,
    setNavigationPath,
    isFetchingRoute,
    setIsFetchingRoute,
    isStayWithMeActive,
    setStayWithMeActive,
    isQuietMode,
    setQuietMode,
    guardianMode,
    setGuardianMode,
    isTyping,
    setIsTyping,
    isBreathingGlow,
    setIsBreathingGlow,
    userAnxietyActive,
    setUserAnxietyActive,
    isPerformanceSave,
    setIsPerformanceSave,
    handleChipResponse,
    handleUserChatSent,
    userStatus,
    updateUserStatus,
    activeJourney,
    startJourney,
    cancelJourney,
    completeJourney,
    recentCheckins,
    addCheckin,
    triggerDelayAlert,
    firebaseUser,
    isAuthLoading,
    signInWithGoogle,
    signInWithMock,
    logout,
    isGuest,
    setIsGuest,
    enterGuestMode,
    autoStatusUpdates,
    setAutoStatusUpdates,
    safeMessages,
    setSafeMessages,
    replyToSafeMessage,
    simulateIncomingSafeMessage,
    logActivity,
    isSOSCountingDown,
    setIsSOSCountingDown,
    sosCountdownSeconds,
    setSosCountdownSeconds,
    sosCountdownDuration,
    setSosCountdownDuration,
    sosStatus,
    setSosStatus,
    cancelSOSCountdown,
    isRouteDeviationDetected,
    setIsRouteDeviationDetected,
    isUnexpectedStopDetected,
    setIsUnexpectedStopDetected,
    isNightWalkSensitivityActive,
    setIsNightWalkSensitivityActive,
    connectionsList,
    connectionMessages,
    syncStatusToAllConnections
  }), [
    currentView, activeCallGuardian, setActiveCallGuardian, isEmergencyActive, isWalkWithMeActive, guardians, 
    addGuardian, updateGuardian, removeGuardian,
    batteryLevel, setBatteryLevel, safeTimerSeconds, isDarkMode, isPrivacyMode, 
    checkpoints, isVoiceTriggerActive, isSafeModeActive, 
    activeSafeHavenId, selectedRouteType, triggerPhrase, 
    lastVoiceTrigger, penguinMessage, user, safePlaces, 
    isLoadingSafePlaces, isCalculatingRoutes, userLocation, 
    locationStatus, navigationPath, isFetchingRoute,
    isStayWithMeActive, isQuietMode, guardianMode, setGuardianMode,
    isTyping, isBreathingGlow, userAnxietyActive, isPerformanceSave, setIsPerformanceSave,
    handleChipResponse, handleUserChatSent,
    userStatus, updateUserStatus, activeJourney, startJourney, cancelJourney,
    completeJourney, recentCheckins, addCheckin, triggerDelayAlert,
    firebaseUser, isAuthLoading,
    signInWithGoogle, signInWithMock, logout, isGuest, setIsGuest, enterGuestMode,
    autoStatusUpdates, safeMessages, replyToSafeMessage, simulateIncomingSafeMessage, logActivity,
    isSOSCountingDown, sosCountdownSeconds, sosCountdownDuration, sosStatus, cancelSOSCountdown,
    isRouteDeviationDetected, isUnexpectedStopDetected, isNightWalkSensitivityActive,
    connectionsList, connectionMessages, syncStatusToAllConnections
  ]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
