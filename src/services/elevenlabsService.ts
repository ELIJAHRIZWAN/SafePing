const API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY;
// Using "Nicole" (piYvOC4m1mRsJgbXWIDZ) - an exceptionally soft, warm, gentle, and calm
// young adult female voice that sounds like a caring late-night companion for our protective guardian penguin.
const VOICE_ID = "piYvOC4m1mRsJgbXWIDZ";

// IN-MEMORY AUDIO CACHE for ElevenLabs
const audioCache = new Map<string, Blob>();

// COOLDOWN LOGIC
let lastSpeechTimestamp = 0;
const textCooldownTrack = new Map<string, number>();

// Minimum general speech cooldown (prevent rapid spam, ensuring thoughtful breathing room)
const GENERAL_COOLDOWN_MS = 3000;

// Minimum cooldown for the EXACT same line (prevent continuous loops)
const SAME_TEXT_COOLDOWN_MS = 8000;

// PHONETIC MAPPINGS FOR EMOTIONAL TIMING & PACING
const PHONETIC_MAPPINGS: Record<string, string> = {
  "guardian network established.": "Guardian network... established.",
  "live route telemetry is now streaming.": "Live route telemetry... is now streaming.",
  "nearby safe points have been identified.": "Nearby safe points... have been identified.",
  "emergency telemetry link stabilized.": "Emergency telemetry link... stabilized.",
  "emergency beacon is now visible to guardians.": "Emergency beacon... is now visible... to guardians.",
  "you're moving away from the safer route.": "Alert... You are moving away... from the safer route.",
  "i noticed repeated route deviation.": "Warning... repeated route deviation... detected.",
  "are you safe? please confirm.": "Attention... Are you safe?... Please confirm.",
  "emergency escalation triggered.": "Warning. Emergency escalation... triggered. Beacon active.",
  "safety confirmed. you are safe now.": "Safety... confirmed. You are safe now. Standing down."
};

let isSpeakingNow = false;
let currentAudio: HTMLAudioElement | null = null;
let currentUtterance: SpeechSynthesisUtterance | null = null;
let cachedVoices: SpeechSynthesisVoice[] = [];
let isElevenLabsDeactivated = false;
let isAudioUnlocked = false;
let audioContext: AudioContext | null = null;
let isVoiceMutedGlobal = false;

export function setElevenlabsVoiceMuted(value: boolean) {
  isVoiceMutedGlobal = value;
  if (value) {
    stopSpeaking();
  }
}

// Autoplay recovery tracking
let lastAttemptedMessage: string | null = null;
let hasSpokenFirstSuccessfully = false;

// Event listeners list for state syncing
type VoiceStateListener = (isSpeaking: boolean) => void;
const listeners = new Set<VoiceStateListener>();

export function subscribeToVoiceState(listener: VoiceStateListener) {
  listeners.add(listener);
  listener(isSpeakingNow);
  return () => {
    listeners.delete(listener);
  };
}

function setSpeakingState(speaking: boolean) {
  isSpeakingNow = speaking;
  listeners.forEach(fn => {
    try { fn(speaking); } catch (e) {}
  });
}

// DEV MODE PERSISTENCE
export function isDevModeEnabled(): boolean {
  if (typeof window === "undefined") return true; 
  try {
    const val = localStorage.getItem("safeping_tts_dev_mode");
    // Default to true during development to actively protect ElevenLabs limits!
    return val === null ? true : val === "true";
  } catch (e) {
    return true;
  }
}

export function setDevModeEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("safeping_tts_dev_mode", enabled ? "true" : "false");
  } catch (e) {
    console.warn("[TTS] localStorage write blocked:", e);
  }
  console.log(`[TTS] Voice Optimizer / Dev Mode is now set to ${enabled}`);
}

const CRITICAL_KEYWORDS = [
  "emergency", 
  "escalated", 
  "escalation", 
  "beacon", 
  "dispatched", 
  "safe", 
  "guardian", 
  "telemetry", 
  "route", 
  "established", 
  "stabilized", 
  "identified",
  "walk with me"
];

function isEssentialMessage(text: string): boolean {
  const norm = text.toLowerCase();
  if (norm.includes("moving away") || norm.includes("noticed repeated") || norm.includes("confirm your code")) {
    return false;
  }
  return CRITICAL_KEYWORDS.some(kw => norm.includes(kw));
}

/**
 * Safely retrieve the browser's speechSynthesis object, preventing security or permission policy errors.
 */
export function getSafeSpeechSynthesis(): SpeechSynthesis | null {
  try {
    if (typeof window !== "undefined" && "speechSynthesis" in window && window.speechSynthesis) {
      return window.speechSynthesis;
    }
  } catch (e) {
    console.warn("SpeechSynthesis is blocked or not supported in this frame environment:", e);
  }
  return null;
}

/**
 * Initialize the voice system, cache browser voices, and set up state handlers.
 */
export function initializeVoiceSystem() {
  if (typeof window === "undefined") return;

  const synth = getSafeSpeechSynthesis();
  if (synth) {
    try {
      cachedVoices = synth.getVoices();
      synth.onvoiceschanged = () => {
        const s = getSafeSpeechSynthesis();
        if (s) cachedVoices = s.getVoices();
      };

      // Retry mechanism for Chrome / Android lazy loading
      setTimeout(() => {
        const s = getSafeSpeechSynthesis();
        if (s) cachedVoices = s.getVoices();
      }, 200);
      setTimeout(() => {
        const s = getSafeSpeechSynthesis();
        if (s) cachedVoices = s.getVoices();
      }, 1000);
    } catch (e) {
      console.warn("Error during speechSynthesis initialization:", e);
    }
  }
  
  console.log("Voice initialized successfully");
}

/**
 * Select the best female English voice available on the platform in priority order.
 */
export function getBestVoice(): SpeechSynthesisVoice | null {
  const synth = getSafeSpeechSynthesis();
  if (!synth) return null;
  try {
    const voices = synth.getVoices().length > 0 ? synth.getVoices() : cachedVoices;
    if (voices.length === 0) return null;

  // Filter out any known male names or deep voices to avoid the hoarse, manly fallback issue
  const maleKeywords = ["male", "david", "mark", "george", "ravi", "richard", "sean", "james", "stefan", "pavel", "sam", "josh", "adam", "patrick", "harry", "callum", "daniel", "charles", "thomas"];
  
  // Attempt to select english voices first
  const englishVoices = voices.filter(v => v.lang.toLowerCase().startsWith("en"));
  
  // Filter out male voices from our english list if possible
  const softEnglishFemaleVoices = englishVoices.filter(v => {
    const nameLower = v.name.toLowerCase();
    return !maleKeywords.some(kw => nameLower.includes(kw));
  });

  const candidates = softEnglishFemaleVoices.length > 0 ? softEnglishFemaleVoices : englishVoices;

  // Falling back priority rules within our candidate pool:
  // 1. Google UK English Female (extremely pleasant, clear, and soft)
  // 2. Microsoft Aria (a premium, very warm female voice)
  // 3. Samantha (crystal clear, soft apple female voice)
  // 4. Microsoft hazel/zira or other friendly female voices
  const priorityRules = [
    (v: SpeechSynthesisVoice) => v.name.toLowerCase().includes("google") && v.name.toLowerCase().includes("uk") && (v.name.toLowerCase().includes("female") || v.lang.includes("en-GB")),
    (v: SpeechSynthesisVoice) => v.lang.toLowerCase() === "en-gb" && v.name.toLowerCase().includes("google"),
    (v: SpeechSynthesisVoice) => v.name.toLowerCase().includes("aria"),
    (v: SpeechSynthesisVoice) => v.name.toLowerCase().includes("samantha"),
    (v: SpeechSynthesisVoice) => v.name.toLowerCase().includes("hazel") || v.name.toLowerCase().includes("zira") || v.name.toLowerCase().includes("female") || v.name.toLowerCase().includes("natural") || v.name.toLowerCase().includes("siri") || v.name.toLowerCase().includes("premium") || v.name.toLowerCase().includes("susan")
  ];

  for (const rule of priorityRules) {
    const matched = candidates.find(rule);
    if (matched) return matched;
  }

  return candidates[0] || voices[0] || null;
  } catch (err) {
    console.warn("getBestVoice error:", err);
    return null;
  }
}

/**
 * Programmatically unlocks browser autoplay block by running interactive playback handshakes.
 */
export function unlockAudio() {
  if (isAudioUnlocked) return;
  if (typeof window === "undefined") return;

  console.log("[TTS Unlocking 🔓] Attempting to unlock browser audio restrictions...");

  try {
    // Resume AudioContext if suspended
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      if (!audioContext) {
        audioContext = new AudioContextClass();
      }
      if (audioContext && audioContext.state === "suspended") {
        audioContext.resume().then(() => {
          console.log("[TTS] AudioContext active/resumed.");
        });
      }
    }

    // Interactive audio playback bypass
    const silentAudio = new Audio();
    silentAudio.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==";
    silentAudio.play()
      .then(() => {
        isAudioUnlocked = true;
        console.log("[TTS 🔐] Browser playback restrictions bypassed successfully via physical interaction.");
        
        // Replay any pending message that was blocked on start
        if (lastAttemptedMessage && !hasSpokenFirstSuccessfully) {
          console.log("[TTS] Autoplay bypassed. Replaying pending greeting line:", lastAttemptedMessage);
          setTimeout(() => {
            speakMessage(lastAttemptedMessage!, true);
          }, 150);
        }
      })
      .catch((e) => {
        console.warn("[TTS] Silent audio unlock request deferred until user interacts:", e.message);
      });

    // Speak empty text to warm up Web Speech engine
    const synth = getSafeSpeechSynthesis();
    if (synth) {
      try {
        synth.cancel();
        const warmUpUtterance = new SpeechSynthesisUtterance("");
        warmUpUtterance.volume = 0;
        synth.speak(warmUpUtterance);
      } catch (e) {
        console.warn("speechSynthesis warmup failed:", e);
      }
    }
  } catch (err) {
    console.error("[TTS] Audio unlock error:", err);
  }
}

// Automatically bind interaction hooks to the window context immediately
if (typeof window !== "undefined") {
  const handler = () => {
    unlockAudio();
    window.removeEventListener("click", handler);
    window.removeEventListener("touchend", handler);
    window.removeEventListener("keydown", handler);
  };
  window.addEventListener("click", handler, { passive: true });
  window.addEventListener("touchend", handler, { passive: true });
  window.addEventListener("keydown", handler, { passive: true });
}

/**
 * Halt any currently spoken narrative stream immediately and reset active states.
 */
export function stopSpeaking() {
  setSpeakingState(false);

  // Stop ElevenLabs Audio
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio.src = "";
      currentAudio.remove();
    } catch (e) {}
    currentAudio = null;
  }

  // Cancel Web Speech
  const synth = getSafeSpeechSynthesis();
  if (synth) {
    try {
      synth.cancel();
    } catch (e) {}
  }
  currentUtterance = null;
}

let currentWalkingSpeed = 0;
export function setCompanionWalkingSpeed(speed: number) {
  currentWalkingSpeed = speed;
}

/**
 * Speaks the text using browser SpeechSynthesis with the best female voice and calming rhythm adjustment.
 */
export async function speakWithBrowserSpeech(text: string, force: boolean = false) {
  if (isVoiceMutedGlobal) {
    console.log("[TTS] Prevented speaking because Guardian voice is muted:", text);
    return;
  }
  lastAttemptedMessage = text;
  const synth = getSafeSpeechSynthesis();
  if (!synth) {
    return;
  }

  if (force) {
    stopSpeaking();
  } else {
    try {
      synth.cancel();
    } catch (e) {}
  }

  setSpeakingState(true);

  try {
    const normalizedText = text.toLowerCase().trim();
    let tunedText = text;

    // Check phonetic and pause overrides
    const matchedKey = Object.keys(PHONETIC_MAPPINGS).find(
      key => normalizedText.includes(key) || key.includes(normalizedText)
    );

    if (matchedKey) {
      tunedText = PHONETIC_MAPPINGS[matchedKey];
    } else {
      tunedText = text
        .replace(/\b(SOS)\b/gi, "S.O.S.")
        .replace(/\b(GPS)\b/gi, "G.P.S.")
        .replace(/\bestablished\b/gi, "... established.")
        .replace(/\bstreaming\b/gi, "... streaming.")
        .replace(/\bstabilized\b/gi, "... stabilized.")
        .replace(/\btriggered\b/gi, "... triggered.")
        .replace(/([.!?])\s+/g, "$1... ");
    }

    tunedText = tunedText.replace(/\.{4,}/g, "...").trim();

    // Read dynamic settings configured in our custom voice app
    let savedRate = null;
    let savedPitch = null;
    let savedVoiceName = null;
    try {
      savedRate = localStorage.getItem("safeping_browser_voice_rate");
      savedPitch = localStorage.getItem("safeping_browser_voice_pitch");
      savedVoiceName = localStorage.getItem("safeping_browser_voice_name");
    } catch (e) {
      console.warn("[TTS] localStorage read in browser voice blocked:", e);
    }

    const utterance = new SpeechSynthesisUtterance(tunedText);
    currentUtterance = utterance;

    const currentHour = new Date().getHours();
    const isLateNight = currentHour >= 22 || currentHour < 5;

    // Dynamic emotional intelligence pacing
    let rate = savedRate ? parseFloat(savedRate) : 0.85; // slightly slower for relaxed emotional pacing
    let pitch = savedPitch ? parseFloat(savedPitch) : 1.15; // warm, youthful, bright, and charming

    // Late-night softness transition
    if (isLateNight) {
      rate = Math.max(0.68, rate - 0.1); // slower, whispering-like paced cadence
      pitch = Math.max(0.95, pitch - 0.08); // softer, gentler pitch
    }

    // High velocity/speed alertness transition
    if (currentWalkingSpeed > 1.5) {
      rate = Math.min(1.15, rate + 0.15); // quicker delivery to convey alertness & brief guidance
      pitch = Math.min(1.25, pitch + 0.05); // slightly higher to cut through focus focus
    }

    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = 1.0;

    // Use selected voice name if stored, otherwise use search fallback heuristics
    const voicesList = synth.getVoices().length > 0 ? synth.getVoices() : cachedVoices;
    let voice = null;
    if (savedVoiceName) {
      voice = voicesList.find(v => v.name === savedVoiceName);
    }
    if (!voice) {
      voice = getBestVoice();
    }

    if (voice) {
      utterance.voice = voice;
    }

    utterance.onstart = () => {
      console.log("Speech playback started");
      setSpeakingState(true);
      hasSpokenFirstSuccessfully = true;
    };

    utterance.onend = () => {
      if (currentUtterance === utterance) {
        setSpeakingState(false);
        currentUtterance = null;
      }
    };

    utterance.onerror = () => {
      if (currentUtterance === utterance) {
        setSpeakingState(false);
        currentUtterance = null;
      }
    };

    synth.speak(utterance);

    // Watchdog fallback
    setTimeout(() => {
      if (isSpeakingNow && currentUtterance === utterance) {
        setSpeakingState(false);
        currentUtterance = null;
      }
    }, 12000);

  } catch (err) {
    console.error("[TTS Browser SpeechSynthesis error]", err);
    setSpeakingState(false);
  }
}

/**
 * Speak a message using the premium voice engine (ElevenLabs) with automatic failover to the local Web Speech synthesizer.
 */
export async function speakMessage(text: string, force: boolean = false) {
  if (isVoiceMutedGlobal) {
    console.log("[TTS] Prevented speaking because ElevenLabs/Guardian voice is muted globally:", text);
    return;
  }
  lastAttemptedMessage = text;
  const now = Date.now();
  const cleanText = text.replace(/[^\w\s.,!?'-]/g, "").trim();
  const normalizedKey = cleanText.toLowerCase().replace(/\s+/g, " ");

  if (!normalizedKey) return;

  // Dev mode restrictions
  if (isDevModeEnabled() && !force) {
    if (!isEssentialMessage(cleanText)) {
      console.log(`[TTS Quota Saved] Skipping ElevenLabs for non-essential announcement in Dev Mode; using browser fallback for: "${cleanText}"`);
      await speakWithBrowserSpeech(text, force);
      return;
    }
  }

  // Cooldown rules
  const lastTimeSpoken = textCooldownTrack.get(normalizedKey) || 0;
  if (now - lastTimeSpoken < SAME_TEXT_COOLDOWN_MS && !force) {
    console.log(`[TTS Blocked] Cooldown active for exact same phrase: "${cleanText}"`);
    return;
  }

  if (now - lastSpeechTimestamp < GENERAL_COOLDOWN_MS && !force) {
    console.log(`[TTS Blocked] Rapid speech trigger debounced: "${cleanText}"`);
    return;
  }

  if (force) {
    stopSpeaking();
  }

  if (isSpeakingNow && !force) {
    console.log(`[TTS Blocked] Already speaking another phrase: "${cleanText}"`);
    return;
  }

  lastSpeechTimestamp = now;
  textCooldownTrack.set(normalizedKey, now);

  // If ElevenLabs is permanently deactivated during the session, jump straight to browser synthesis
  if (isElevenLabsDeactivated || !API_KEY) {
    if (!API_KEY && !isElevenLabsDeactivated) {
      console.warn("ElevenLabs unavailable — switching to local voice");
      isElevenLabsDeactivated = true;
    }
    await speakWithBrowserSpeech(text, force);
    return;
  }

  try {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio.src = "";
      currentAudio.remove();
      currentAudio = null;
    }

    setSpeakingState(true);

    // Cache hit
    const cachedBlob = audioCache.get(normalizedKey);
    if (cachedBlob) {
      console.log(`[TTS Cache HIT ⚡] Reusing cached ElevenLabs stream for: "${cleanText}"`);
      console.log("Speech playback started");
      const audioUrl = URL.createObjectURL(cachedBlob);
      const audio = new Audio();
      audio.src = audioUrl;
      currentAudio = audio;

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(async (error) => {
          console.warn("ElevenLabs cached play rejected, falling back to Browser TTS:", error);
          await speakWithBrowserSpeech(text, force);
        });
      }

      audio.onended = () => {
        setSpeakingState(false);
        URL.revokeObjectURL(audioUrl);
        if (currentAudio === audio) currentAudio = null;
      };

      audio.onerror = async () => {
        URL.revokeObjectURL(audioUrl);
        if (currentAudio === audio) currentAudio = null;
        await speakWithBrowserSpeech(text, force);
      };
      return;
    }

    // Call API
    console.log(`[TTS API Fetch 🪐] Streaming from ElevenLabs: "${cleanText}"`);
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream`,
      {
        method: "POST",
        headers: {
          "Accept": "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": API_KEY,
        },
        body: JSON.stringify({
          text: cleanText,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.60,
            similarity_boost: 0.85,
          }
        }),
      }
    );

    if (!response.ok) {
      isElevenLabsDeactivated = true;
      console.warn("ElevenLabs unavailable — switching to local voice");
      await speakWithBrowserSpeech(text, force);
      return;
    }

    const arrayBuffer = await response.arrayBuffer();
    const contentType = response.headers.get("Content-Type") || "audio/mpeg";

    if (arrayBuffer.byteLength === 0) {
      isElevenLabsDeactivated = true;
      console.warn("ElevenLabs unavailable — switching to local voice");
      await speakWithBrowserSpeech(text, force);
      return;
    }

    console.log("Speech playback started");
    const mimeType = contentType.includes("audio") ? contentType : "audio/mpeg";
    const blob = new Blob([arrayBuffer], { type: mimeType });
    audioCache.set(normalizedKey, blob);

    const audioUrl = URL.createObjectURL(blob);
    const audio = new Audio();
    audio.src = audioUrl;
    currentAudio = audio;

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(async (error) => {
        console.warn("ElevenLabs Stream Playback failed, falling back to Browser TTS:", error);
        await speakWithBrowserSpeech(text, force);
      });
    }

    audio.onended = () => {
      setSpeakingState(false);
      URL.revokeObjectURL(audioUrl);
      if (currentAudio === audio) currentAudio = null;
    };

    audio.onerror = async (e) => {
      console.warn("ElevenLabs stream error, falling back to Browser TTS:", e);
      URL.revokeObjectURL(audioUrl);
      if (currentAudio === audio) currentAudio = null;
      await speakWithBrowserSpeech(text, force);
    };

  } catch (err) {
    isElevenLabsDeactivated = true;
    console.warn("ElevenLabs unavailable — switching to local voice");
    await speakWithBrowserSpeech(text, force);
  }
}

// Preserve speakWithElevenLabs signature as an alias for complete backwards compatibility
export async function speakWithElevenLabs(text: string, force: boolean = false) {
  await speakMessage(text, force);
}
