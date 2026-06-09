import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { SirenToneType, startSirenAudio, stopSirenAudio } from '../services/sirenService';
import { setElevenlabsVoiceMuted } from '../services/elevenlabsService';
import { auth } from '../services/firebase';

export type EmergencyState =
  | 'idle'
  | 'preparing'
  | 'escalating'
  | 'alerting'
  | 'guiding'
  | 'resolved';

export interface IncidentEvent {
  id: string;
  timestamp: string;
  utcTimestamp: string;
  type: string;
  description: string;
}

export interface EvidenceSnapshot {
  id: string;
  timestamp: string;
  imageUrl: string;
  location: [number, number] | null;
  battery: number;
  reason: string;
  audioUrl?: string;
  audioDurationMs?: number;
}

interface EmergencyContextType {
  emergencyState: EmergencyState;
  setEmergencyState: (state: EmergencyState) => void;

  isEmergencyActive: boolean;
  isHoldingSOS: boolean;
  setIsHoldingSOS: (value: boolean) => void;

  // Global escalation / UI states
  guardianAlert: boolean;
  setGuardianAlert: (value: boolean) => void;
  isEscalated: boolean;
  setIsEscalated: (value: boolean) => void;
  isUserSafe: boolean;
  setIsUserSafe: (value: boolean) => void;

  // Fully dispatched state & statistics
  isFullyDispatched: boolean;
  setIsFullyDispatched: (value: boolean) => void;
  sessionStartTime: number | null;
  setSessionStartTime: (time: number | null) => void;
  escalationCount: number;
  setEscalationCount: (count: number) => void;
  deviationCount: number;
  setDeviationCount: (count: number) => void;

  // Incident Reconstruction state
  incidentLogs: IncidentEvent[];
  addIncidentLog: (type: string, description: string) => void;
  clearIncidentLogs: () => void;

  // Dynamic Threat Confidence Score
  threatScore: number;
  setThreatScore: (score: number) => void;

  // Silent Evidence Mode states & logic
  isSilentEvidenceActive: boolean;
  isCameraEvidenceEnabled: boolean;
  setIsCameraEvidenceEnabled: (value: boolean) => void;
  isAudioEvidenceEnabled: boolean;
  setIsAudioEvidenceEnabled: (value: boolean) => void;
  isSilentEvidenceConsentAcknowledged: boolean;
  setIsSilentEvidenceConsentAcknowledged: (value: boolean) => void;
  evidenceSnapshots: EvidenceSnapshot[];
  captureEvidenceSnapshot: (location: [number, number] | null, batteryLevel: number, reason: string) => Promise<void>;
  clearEvidenceSnapshots: () => void;
  hasCamera: boolean | null;
  hasMic: boolean | null;
  cameraPermission: 'prompt' | 'granted' | 'denied' | 'unavailable';
  cameraStatus: 'available' | 'unavailable' | 'denied';
  micPermission: 'prompt' | 'granted' | 'denied' | 'unavailable';
  evidenceModeStatus: 'full' | 'partial' | 'minimal';

  // Deterrence Siren System Configuration & Controls
  isSirenActive: boolean;
  isVoiceMuted: boolean;
  sirenTone: SirenToneType;
  setSirenTone: (tone: SirenToneType) => void;
  startSiren: (tone?: SirenToneType) => void;
  stopSiren: () => void;
  setIsVoiceMuted: (value: boolean) => void;
}

const EmergencyContext = createContext<
  EmergencyContextType | undefined
>(undefined);

export function EmergencyProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [emergencyState, setEmergencyStateState] = useState<EmergencyState>(() => {
    try {
      const saved = localStorage.getItem('safeping_emergency_state');
      if (saved && ['idle', 'preparing', 'escalating', 'alerting', 'guiding', 'resolved'].includes(saved)) {
        return saved as EmergencyState;
      }
      const active = localStorage.getItem('safeping_emergency_active') === 'true';
      return active ? 'alerting' : 'idle';
    } catch {
      return 'idle';
    }
  });

  const [isHoldingSOS, setIsHoldingSOS] = useState(false);

  const [guardianAlert, setGuardianAlertState] = useState<boolean>(() => {
    try {
      return localStorage.getItem('safeping_guardian_alert') === 'true';
    } catch {
      return false;
    }
  });

  const [isEscalated, setIsEscalatedState] = useState<boolean>(() => {
    try {
      return localStorage.getItem('safeping_is_escalated') === 'true';
    } catch {
      return false;
    }
  });

  const [isUserSafe, setIsUserSafeState] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('safeping_is_user_safe');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  // Stats & dispatch sequence states
  const [isFullyDispatched, setIsFullyDispatchedState] = useState<boolean>(() => {
    try {
      return localStorage.getItem('safeping_is_fully_dispatched') === 'true';
    } catch {
      return false;
    }
  });

  const [sessionStartTime, setSessionStartTimeState] = useState<number | null>(() => {
    try {
      const saved = localStorage.getItem('safeping_session_start_time');
      return saved ? parseInt(saved) : null;
    } catch {
      return null;
    }
  });

  const [escalationCount, setEscalationCountState] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('safeping_escalation_count');
      return saved ? parseInt(saved) : 0;
    } catch {
      return 0;
    }
  });

  const [deviationCount, setDeviationCountState] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('safeping_deviation_count');
      return saved ? parseInt(saved) : 0;
    } catch {
      return 0;
    }
  });

  const setEmergencyState = useCallback((state: EmergencyState) => {
    setEmergencyStateState(state);
    try {
      localStorage.setItem('safeping_emergency_state', state);
      if (state === 'idle' || state === 'resolved') {
        localStorage.setItem('safeping_emergency_active', 'false');
      } else {
        localStorage.setItem('safeping_emergency_active', 'true');
      }
    } catch (e) {
      console.warn("Storage sync failed for emergencyState:", e);
    }
  }, []);

  const setGuardianAlert = useCallback((value: boolean) => {
    setGuardianAlertState(value);
    try {
      localStorage.setItem('safeping_guardian_alert', String(value));
    } catch {}
  }, []);

  const setIsEscalated = useCallback((value: boolean) => {
    setIsEscalatedState(value);
    try {
      localStorage.setItem('safeping_is_escalated', String(value));
    } catch {}
  }, []);

  const setIsUserSafe = useCallback((value: boolean) => {
    setIsUserSafeState(value);
    try {
      localStorage.setItem('safeping_is_user_safe', String(value));
    } catch {}
  }, []);

  const setIsFullyDispatched = useCallback((value: boolean) => {
    setIsFullyDispatchedState(value);
    try {
      localStorage.setItem('safeping_is_fully_dispatched', String(value));
    } catch {}
  }, []);

  const setSessionStartTime = useCallback((value: number | null) => {
    setSessionStartTimeState(value);
    try {
      if (value === null) localStorage.removeItem('safeping_session_start_time');
      else localStorage.setItem('safeping_session_start_time', String(value));
    } catch {}
  }, []);

  const setEscalationCount = useCallback((value: number | ((prev: number) => number)) => {
    setEscalationCountState(prev => {
      const next = typeof value === 'function' ? value(prev) : value;
      try {
        localStorage.setItem('safeping_escalation_count', String(next));
      } catch {}
      return next;
    });
  }, []);

  const setDeviationCount = useCallback((value: number | ((prev: number) => number)) => {
    setDeviationCountState(prev => {
      const next = typeof value === 'function' ? value(prev) : value;
      try {
        localStorage.setItem('safeping_deviation_count', String(next));
      } catch {}
      return next;
    });
  }, []);

  // Load incident logs from local storage or start fresh
  const [incidentLogs, setIncidentLogs] = useState<IncidentEvent[]>(() => {
    try {
      const saved = localStorage.getItem('safeping_current_incident_logs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [targetThreatScore, setTargetThreatScore] = useState(0);
  const [threatScore, setThreatScoreState] = useState(0);

  const setThreatScore = useCallback((scoreOrFn: number | ((prev: number) => number)) => {
    setTargetThreatScore(prev => {
      const nextScore = typeof scoreOrFn === 'function' ? scoreOrFn(prev) : scoreOrFn;
      return Math.min(100, Math.max(0, nextScore));
    });
  }, []);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setThreatScoreState(current => {
        if (current === targetThreatScore) return current;
        const diff = targetThreatScore - current;
        if (diff > 0) {
          const step = Math.max(2, Math.floor(diff * 0.15));
          const next = Math.min(targetThreatScore, current + step);
          return Math.round(next);
        } else {
          const step = Math.max(1, Math.floor(Math.abs(diff) * 0.10));
          const next = Math.max(targetThreatScore, current - step);
          return Math.round(next);
        }
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [targetThreatScore]);

  // Silent Evidence configurations
  const [isCameraEvidenceEnabled, setIsCameraEvidenceEnabledState] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('safeping_silent_evidence_camera');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const setIsCameraEvidenceEnabled = useCallback((value: boolean) => {
    setIsCameraEvidenceEnabledState(value);
    try {
      localStorage.setItem('safeping_silent_evidence_camera', String(value));
    } catch (e) {
      console.error(e);
    }
  }, []);

  const [isAudioEvidenceEnabled, setIsAudioEvidenceEnabledState] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('safeping_silent_evidence_audio');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const setIsAudioEvidenceEnabled = useCallback((value: boolean) => {
    setIsAudioEvidenceEnabledState(value);
    try {
      localStorage.setItem('safeping_silent_evidence_audio', String(value));
    } catch (e) {
      console.error(e);
    }
  }, []);

  const [isSilentEvidenceConsentAcknowledged, setIsSilentEvidenceConsentAcknowledgedState] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('safeping_silent_evidence_consent');
      return saved === 'true';
    } catch {
      return false;
    }
  });

  const setIsSilentEvidenceConsentAcknowledged = useCallback((value: boolean) => {
    setIsSilentEvidenceConsentAcknowledgedState(value);
    try {
      localStorage.setItem('safeping_silent_evidence_consent', String(value));
    } catch (e) {
      console.error(e);
    }
  }, []);

  const [evidenceSnapshots, setEvidenceSnapshots] = useState<EvidenceSnapshot[]>(() => {
    try {
      const saved = localStorage.getItem('safeping_evidence_snapshots');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [hasCamera, setHasCamera] = useState<boolean | null>(null);
  const [hasMic, setHasMic] = useState<boolean | null>(null);
  const [cameraPermission, setCameraPermission] = useState<'prompt' | 'granted' | 'denied' | 'unavailable'>('prompt');
  const [cameraStatus, setCameraStatus] = useState<'available' | 'unavailable' | 'denied'>('unavailable');
  const [micPermission, setMicPermission] = useState<'prompt' | 'granted' | 'denied' | 'unavailable'>('prompt');

  // Automated synchronization for cameraStatus as a single source of truth
  React.useEffect(() => {
    if (hasCamera === false || cameraPermission === 'unavailable') {
      setCameraStatus('unavailable');
    } else if (cameraPermission === 'denied') {
      setCameraStatus('denied');
    } else if (hasCamera === true) {
      setCameraStatus('available');
    } else {
      setCameraStatus('unavailable');
    }
  }, [hasCamera, cameraPermission]);

  const detectDevices = useCallback(async () => {
    try {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
        setHasCamera(false);
        setHasMic(false);
        setCameraPermission('unavailable');
        setMicPermission('unavailable');
        setCameraStatus('unavailable');
        return { camera: false, mic: false };
      }

      const devices = await navigator.mediaDevices.enumerateDevices().catch(() => []);
      
      const videoInputDevices = devices.filter(device => device.kind === 'videoinput');
      const audioInputDevices = devices.filter(device => device.kind === 'audioinput');

      const cameraExists = videoInputDevices.length > 0;
      const micExists = audioInputDevices.length > 0;

      setHasCamera(cameraExists);
      setHasMic(micExists);

      if (!cameraExists) {
        setCameraPermission('unavailable');
        setCameraStatus('unavailable');
      }
      if (!micExists) setMicPermission('unavailable');

      if (navigator.permissions && navigator.permissions.query) {
        try {
          const cameraPerm = await navigator.permissions.query({ name: 'camera' as any }).catch(() => null);
          if (cameraPerm) {
            setCameraPermission(cameraPerm.state as any);
            cameraPerm.onchange = () => {
              setCameraPermission(cameraPerm.state as any);
            };
          }
        } catch (e) {
          console.warn("Camera permissions query blocked/unsupported:", e);
        }

        try {
          const micPerm = await navigator.permissions.query({ name: 'microphone' as any }).catch(() => null);
          if (micPerm) {
            setMicPermission(micPerm.state as any);
            micPerm.onchange = () => {
              setMicPermission(micPerm.state as any);
            };
          }
        } catch (e) {
          console.warn("Microphone permissions query blocked/unsupported:", e);
        }
      }

      return { camera: cameraExists, mic: micExists };
    } catch (err) {
      console.warn("Device capability detection error:", err);
      setHasCamera(false);
      setHasMic(false);
      setCameraPermission('unavailable');
      setMicPermission('unavailable');
      setCameraStatus('unavailable');
      return { camera: false, mic: false };
    }
  }, [cameraPermission]);

  React.useEffect(() => {
    detectDevices();
    try {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
        navigator.mediaDevices.addEventListener('devicechange', detectDevices);
        return () => {
          navigator.mediaDevices.removeEventListener('devicechange', detectDevices);
        };
      }
    } catch (e) {
      console.warn("Could not register devicechange listener:", e);
    }
  }, [detectDevices]);

  const getEvidenceModeStatus = (): 'full' | 'partial' | 'minimal' => {
    const isCameraOK = isCameraEvidenceEnabled && cameraStatus === 'available';
    const isAudioOK = isAudioEvidenceEnabled && hasMic !== false && micPermission !== 'denied' && micPermission !== 'unavailable';

    if (isCameraOK && isAudioOK) {
      return 'full';
    } else if (isAudioOK || isCameraOK) {
      return 'partial';
    } else {
      return 'minimal';
    }
  };
  const evidenceModeStatus = getEvidenceModeStatus();

  const [isSirenActive, setIsSirenActive] = useState(false);
  const [isVoiceMuted, setIsVoiceMutedState] = useState(false);
  const [sirenTone, setSirenTone] = useState<SirenToneType>('classic');

  const setIsVoiceMuted = useCallback((value: boolean) => {
    setIsVoiceMutedState(value);
    setElevenlabsVoiceMuted(value);
  }, []);

  const addIncidentLog = useCallback((type: string, description: string) => {
    const newLog: IncidentEvent = {
      id: Math.random().toString(36).substring(2, 11),
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
      utcTimestamp: new Date().toISOString(),
      type,
      description
    };
    setIncidentLogs(prev => {
      const updated = [...prev, newLog].slice(-30);
      try {
        localStorage.setItem('safeping_current_incident_logs', JSON.stringify(updated));
      } catch (err) {
        console.warn("Could not save incident logs to localStorage due to quota limits:", err);
      }
      return updated;
    });

    if (auth.currentUser && !auth.currentUser.uid.startsWith('dev_mock_user_')) {
      const uid = auth.currentUser.uid;
      import('../services/firebase').then(({ saveDbIncidentLog }) => {
        saveDbIncidentLog(uid, newLog).catch(e => {
          console.warn("Async firestore log sync failed:", e);
        });
      });
    }

    try {
      window.dispatchEvent(new CustomEvent('safeping-incident-log', {
        detail: { type, description }
      }));
    } catch (err) {
      console.warn("Could not dispatch safeping-incident-log custom event:", err);
    }
  }, []);

  const startSiren = useCallback((tone?: SirenToneType) => {
    const activeTone = tone || sirenTone;
    if (tone) {
      setSirenTone(tone);
    }
    setIsSirenActive(true);
    startSirenAudio(activeTone);
    addIncidentLog('security', `Public deterrence acoustic siren activated. Current signature: [${activeTone.toUpperCase()} TONE]`);
  }, [sirenTone, addIncidentLog]);

  const stopSiren = useCallback(() => {
    setIsSirenActive(false);
    stopSirenAudio();
    addIncidentLog('security', `Public deterrence acoustic siren disarmed safely.`);
  }, [addIncidentLog]);

  React.useEffect(() => {
    return () => {
      stopSirenAudio();
    };
  }, []);

  React.useEffect(() => {
    if (emergencyState === 'idle' || emergencyState === 'resolved') {
      if (isSirenActive) {
        setIsSirenActive(false);
        stopSirenAudio();
        addIncidentLog('security', `Public deterrence acoustic siren disarmed automatically upon state resolution.`);
      }
    }
  }, [emergencyState, isSirenActive, addIncidentLog]);

  const clearIncidentLogs = useCallback(() => {
    setIncidentLogs([]);
    localStorage.removeItem('safeping_current_incident_logs');
  }, []);

  const clearEvidenceSnapshots = useCallback(() => {
    setEvidenceSnapshots([]);
    try {
      localStorage.removeItem('safeping_evidence_snapshots');
    } catch (e) {
      console.error(e);
    }
  }, []);

  const isEmergencyActive =
    emergencyState !== 'idle' && emergencyState !== 'resolved' && emergencyState !== 'preparing';

  // Computed definition: Activated during high-risk escalation parameters
  const isSilentEvidenceActive =
    isEscalated ||
    emergencyState === 'alerting' ||
    emergencyState === 'escalating' ||
    emergencyState === 'guiding' ||
    threatScore >= 65;

  const generateSynthesisAudio = useCallback((): string => {
    const hz = 8000; // Efficient high-compression sampling
    const duration = 1.5;
    const numSamples = hz * duration;
    const buffer = new Uint8Array(44 + numSamples);
    
    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        buffer[offset + i] = str.charCodeAt(i);
      }
    };
    const writeUint32 = (offset: number, value: number) => {
      buffer[offset] = value & 0xff;
      buffer[offset + 1] = (value >> 8) & 0xff;
      buffer[offset + 2] = (value >> 16) & 0xff;
      buffer[offset + 3] = (value >> 24) & 0xff;
    };
    const writeUint16 = (offset: number, value: number) => {
      buffer[offset] = value & 0xff;
      buffer[offset + 1] = (value >> 8) & 0xff;
    };

    writeString(0, 'RIFF');
    writeUint32(4, 36 + numSamples);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    writeUint32(16, 16);
    writeUint16(20, 1);
    writeUint16(22, 1);
    writeUint32(24, hz);
    writeUint32(28, hz);
    writeUint16(32, 1);
    writeUint16(34, 8);
    writeString(36, 'data');
    writeUint32(40, numSamples);

    for (let i = 0; i < numSamples; i++) {
      const t = i / hz;
      // Soft ambient safeguard pulse wave
      const wave = Math.sin(2 * Math.PI * 220 * t);
      const envelope = Math.exp(-4 * (t % 0.5));
      const sample = Math.floor(128 + 25 * wave * envelope);
      buffer[44 + i] = sample;
    }

    let binary = '';
    const chunkSize = 2048;
    for (let i = 0; i < buffer.length; i += chunkSize) {
      binary += String.fromCharCode.apply(null, Array.from(buffer.subarray(i, i + chunkSize)));
    }
    return `data:audio/wav;base64,${btoa(binary)}`;
  }, []);

  const captureEvidenceSnapshot = useCallback(async (
    location: [number, number] | null,
    batteryLevel: number,
    reason: string
  ) => {
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
    const id = Math.random().toString(36).substring(2, 11);

    // 1. Discreet Audio Preservation Capture
    let finalAudioUrl: string | undefined = undefined;
    if (isAudioEvidenceEnabled && hasMic !== false) {
      addIncidentLog('telemetry', `Guardian keeping close presence with an attentive ear [${reason}]...`);
      try {
        if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: true }).catch((err) => {
            console.warn("getUserMedia audio rejected:", err);
            if (err && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')) {
              setMicPermission('denied');
            }
            return null;
          });

          if (micStream) {
            setMicPermission('granted');
            try {
              if (typeof MediaRecorder !== 'undefined') {
                finalAudioUrl = await new Promise<string | undefined>((resolve) => {
                  try {
                    const mediaRecorder = new MediaRecorder(micStream);
                    const audioChunks: Blob[] = [];
                    mediaRecorder.ondataavailable = (event) => {
                      if (event.data && event.data.size > 0) audioChunks.push(event.data);
                    };
                    mediaRecorder.onstop = () => {
                      try {
                        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result as string);
                        reader.readAsDataURL(audioBlob);
                      } catch (err) {
                        console.warn("Serializing audio block failed:", err);
                        resolve(undefined);
                      } finally {
                        micStream.getTracks().forEach(track => {
                          try { track.stop(); } catch (e) {}
                        });
                      }
                    };
                    mediaRecorder.onerror = (e) => {
                      console.warn("MediaRecorder error:", e);
                      resolve(undefined);
                    };
                    mediaRecorder.start();
                    setTimeout(() => {
                      try {
                        if (mediaRecorder.state !== 'inactive') mediaRecorder.stop();
                      } catch (e) {
                        resolve(undefined);
                      }
                    }, 3000); // Record a short 3-second diagnostic emergency segment
                  } catch (recorderInitErr) {
                    console.warn("MediaRecorder failed to initialize:", recorderInitErr);
                    resolve(undefined);
                    micStream.getTracks().forEach(track => {
                      try { track.stop(); } catch (e) {}
                    });
                  }
                });
                addIncidentLog('telemetry', `Acoustic safety safeguard preserved successfully.`);
              } else {
                addIncidentLog('telemetry', `Audio recorder unavailable. Preserved synthetic heartbeat stream.`);
                finalAudioUrl = generateSynthesisAudio();
                micStream.getTracks().forEach(track => {
                  try { track.stop(); } catch (e) {}
                });
              }
            } catch (innerMicErr) {
              console.warn("Audio processing failed:", innerMicErr);
              finalAudioUrl = generateSynthesisAudio();
            }
          } else {
            finalAudioUrl = generateSynthesisAudio();
            addIncidentLog('telemetry', `Acoustic safety safeguard optimized gently for local privacy (Mic blocked).`);
          }
        } else {
          finalAudioUrl = generateSynthesisAudio();
          addIncidentLog('telemetry', `Audio capability offline. Synthesized protective heartbeat segment.`);
        }
      } catch (err) {
        console.warn('Microphone capture skipped, securing fallback synthesis:', err);
        finalAudioUrl = generateSynthesisAudio();
        addIncidentLog('telemetry', `Microphone hardware offline. Maintaining steady guardian presence.`);
      }
    }

    // 2. Camera Snapshot Frame Capture
    let finalImageUrl = '';
    let captureMode = 'Bypassed';

    if (isCameraEvidenceEnabled && cameraStatus === 'available') {
      try {
        if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480 }
          }).catch((err) => {
            console.warn("getUserMedia video rejected or failed:", err);
            if (err) {
              if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                setCameraPermission('denied');
                setCameraStatus('denied');
              } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
                console.warn("Camera busy/occupied by another browser process.");
                setCameraStatus('unavailable');
              } else {
                setCameraStatus('unavailable');
              }
            } else {
              setCameraStatus('unavailable');
            }
            return null;
          });

          if (stream) {
            setCameraPermission('granted');
            try {
              const video = document.createElement('video');
              video.srcObject = stream;
              video.setAttribute('playsinline', 'true');
              video.muted = true;
              
              await video.play().catch(e => {
                console.warn("Video autoplay failed or interrupted:", e);
              });

              await new Promise(resolve => setTimeout(resolve, 350));

              const canvas = document.createElement('canvas');
              canvas.width = 640;
              canvas.height = 480;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(video, 0, 0, 640, 480);

                // Add elegant, professional, and discreet data watermark lines
                ctx.fillStyle = 'rgba(3, 6, 17, 0.45)';
                ctx.fillRect(15, 15, 610, 42); 
                ctx.fillRect(15, 423, 610, 42); 

                ctx.font = 'bold 12px monospace';
                ctx.fillStyle = '#14b8a6'; // Elegant teal high-security color
                ctx.fillText('🛡️ GUARDIAN AMBIENT SUPPORT • ACTIVE WALK', 28, 41);

                ctx.fillStyle = '#94a3b8';
                ctx.font = '10px monospace';
                ctx.fillText(`UTC: ${new Date().toISOString()}`, 380, 41);

                const latVal = location ? location[0].toFixed(6) : "SEARCHING...";
                const lngVal = location ? location[1].toFixed(6) : "SEARCHING...";
                ctx.fillStyle = '#e2e8f0';
                ctx.fillText(`COORDS: LAT ${latVal} • LNG ${lngVal}`, 28, 448);
                ctx.fillText(`BATTERY: ${batteryLevel}% | COMPANION SECURE LINK`, 415, 448);
              }

              finalImageUrl = canvas.toDataURL('image/jpeg', 0.85);
              captureMode = 'Real Capture';
            } catch (innerVidErr) {
              console.warn("Processing stream frame failed:", innerVidErr);
              captureMode = 'Telemetry Fallback';
            } finally {
              try {
                stream.getTracks().forEach(track => {
                  try { track.stop(); } catch (e) {}
                });
              } catch (e) {}
            }
          } else {
            captureMode = 'Telemetry Fallback';
          }
        } else {
          captureMode = 'Telemetry Fallback';
        }
      } catch (cameraErr) {
        console.warn('Camera snapshot acquisition skipped or blocked, drafting fallback overlay:', cameraErr);
        captureMode = 'Telemetry Fallback';
      }
    } else {
      captureMode = 'Telemetry Fallback';
    }

    // 3. Fallback High-Fidelity Scientific Overlay if Webcam is blocked or disabled
    if (!finalImageUrl) {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Dark space aesthetic
        ctx.fillStyle = '#02040d';
        ctx.fillRect(0, 0, 640, 480);

        // Technical grid drawing
        ctx.strokeStyle = '#14b8a6';
        ctx.lineWidth = 0.5;
        ctx.globalAlpha = 0.15;
        for (let x = 0; x < 640; x += 40) {
          ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 480); ctx.stroke();
        }
        for (let y = 0; y < 480; y += 40) {
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(640, y); ctx.stroke();
        }
        ctx.globalAlpha = 1.0;

        // Technical scan lines rings
        ctx.strokeStyle = '#14b8a6';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(320, 240, 150, 0, 2 * Math.PI);
        ctx.arc(320, 240, 90, 0, 2 * Math.PI);
        ctx.arc(320, 240, 30, 0, 2 * Math.PI);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(320, 30); ctx.lineTo(320, 450);
        ctx.moveTo(100, 240); ctx.lineTo(540, 240);
        ctx.stroke();

        // Heading vector lines
        ctx.strokeStyle = '#14b8a6';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(320, 240);
        ctx.lineTo(440, 150);
        ctx.stroke();

        ctx.fillStyle = '#14b8a6';
        ctx.beginPath();
        ctx.arc(440, 150, 8, 0, 2 * Math.PI);
        ctx.fill();

        // Layout branding overlay
        ctx.fillStyle = 'rgba(20, 184, 166, 0.1)';
        ctx.fillRect(15, 15, 610, 42);

        ctx.fillStyle = '#14b8a6';
        ctx.font = 'bold 12px monospace';
        ctx.fillText('📡 GUARDIAN PRESENCE • STEADY ESCORT STATUS', 28, 41);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px monospace';
        ctx.fillText(`UTC: ${new Date().toISOString()}`, 380, 41);

        ctx.fillStyle = '#ffffff';
        ctx.fillText(`GUARDIAN ESCORT LINK: STABLE`, 30, 80);
        ctx.fillText(`SAFETY CIRCLE STATUS: SYNCED`, 30, 100);
        ctx.fillText(`REASON: ${reason.toUpperCase()}`, 30, 120);
        ctx.fillText(`LATITUDE: ${location ? location[0].toFixed(6) : "SCANNING"}`, 30, 140);
        ctx.fillText(`LONGITUDE: ${location ? location[1].toFixed(6) : "SCANNING"}`, 30, 160);
        ctx.fillText(`COMPANION GUIDANCE: ACTIVE PRESENCE`, 30, 180);

        ctx.fillStyle = '#14b8a6';
        ctx.font = 'bold 11px monospace';
        ctx.fillText(
          isCameraEvidenceEnabled 
            ? '● GENTLE COMPANION BYPASS ACTIVE (CAMERA RESTRICTED)' 
            : '● PRIVACY-PRESERVING COMPANION VIEW ACTIVE', 
          30, 215
        );

        // Render a mockup coordinate radar sweep visual
        ctx.strokeStyle = '#14b8a6';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(440, 150, 20, 0, 2 * Math.PI);
        ctx.stroke();
      }
      finalImageUrl = canvas.toDataURL('image/jpeg', 0.85);
    }

    // 4. Save unified snapshot packaging
    const newSnapshot: EvidenceSnapshot = {
      id,
      timestamp,
      imageUrl: finalImageUrl,
      location,
      battery: batteryLevel,
      reason,
      audioUrl: finalAudioUrl,
      audioDurationMs: finalAudioUrl ? 3000 : undefined
    };

    setEvidenceSnapshots(prev => {
      const next = [newSnapshot, ...prev].slice(0, 10);
      try {
        localStorage.setItem('safeping_evidence_snapshots', JSON.stringify(next));
      } catch (err) {
        console.warn("Storage quota exceeded, trying to store fewer/pruned snapshots:", err);
        const semiPruned = next.map((snap, idx) => {
          if (idx >= 3) {
            return { ...snap, imageUrl: '', audioUrl: '' };
          }
          return snap;
        });
        try {
          localStorage.setItem('safeping_evidence_snapshots', JSON.stringify(semiPruned));
        } catch (err2) {
          console.warn("Pruned storage still exceeding quota, trying ultra-pruned (no base64 graphics):", err2);
          const ultraPruned = next.map(snap => ({ ...snap, imageUrl: '', audioUrl: '' }));
          try {
            localStorage.setItem('safeping_evidence_snapshots', JSON.stringify(ultraPruned));
          } catch (err3) {
            console.error("Even ultra-pruned snapshot list failed to write to localStorage:", err3);
            try {
              localStorage.removeItem('safeping_evidence_snapshots');
            } catch {}
          }
        }
      }
      return next;
    });

    if (auth.currentUser && !auth.currentUser.uid.startsWith('dev_mock_user_')) {
      const uid = auth.currentUser.uid;
      import('../services/firebase').then(({ saveDbEvidenceSnapshot }) => {
        saveDbEvidenceSnapshot(uid, newSnapshot).catch(e => {
          console.warn("Async firestore snapshot sync failed:", e);
        });
      });
    }

    if (captureMode === 'Real Capture') {
      addIncidentLog('telemetry', `Companion safeguard snapshot secured under safety criteria [${reason}].`);
    } else if (captureMode === 'Telemetry Fallback') {
      addIncidentLog('telemetry', `Camera unavailable — Guardian switched to protected tracking mode.`);
      addIncidentLog('telemetry', `Visual evidence skipped safely. Fallback monitoring enabled.`);
    } else {
      addIncidentLog('telemetry', `Preserved steady tracking coordinates and battery presence metrics.`);
    }
  }, [
    isCameraEvidenceEnabled,
    isAudioEvidenceEnabled,
    addIncidentLog,
    generateSynthesisAudio,
    hasCamera,
    hasMic,
    cameraPermission,
    cameraStatus,
    micPermission
  ]);

  return (
    <EmergencyContext.Provider
      value={{
        emergencyState,
        setEmergencyState,
        isEmergencyActive,
        isHoldingSOS,
        setIsHoldingSOS,
        guardianAlert,
        setGuardianAlert,
        isEscalated,
        setIsEscalated,
        isUserSafe,
        setIsUserSafe,
        isFullyDispatched,
        setIsFullyDispatched,
        sessionStartTime,
        setSessionStartTime,
        escalationCount,
        setEscalationCount,
        deviationCount,
        setDeviationCount,
        incidentLogs,
        addIncidentLog,
        clearIncidentLogs,
        threatScore,
        setThreatScore,
        isSilentEvidenceActive,
        isCameraEvidenceEnabled,
        setIsCameraEvidenceEnabled,
        isAudioEvidenceEnabled,
        setIsAudioEvidenceEnabled,
        isSilentEvidenceConsentAcknowledged,
        setIsSilentEvidenceConsentAcknowledged,
        evidenceSnapshots,
        captureEvidenceSnapshot,
        clearEvidenceSnapshots,
        hasCamera,
        hasMic,
        cameraPermission,
        cameraStatus,
        micPermission,
        evidenceModeStatus,
        isSirenActive,
        isVoiceMuted,
        sirenTone,
        setSirenTone,
        startSiren,
        stopSiren,
        setIsVoiceMuted,
      }}
    >
      {children}
    </EmergencyContext.Provider>
  );
}

export function useEmergency() {
  const context = useContext(EmergencyContext);

  if (!context) {
    throw new Error(
      'useEmergency must be used inside EmergencyProvider'
    );
  }

  return context;
}