// Siren Synthesizer Service using Web Audio API for SafePing
// Designed to be stable, interruption-safe, and runs natively in any modern browser without downloading assets.

export type SirenToneType = 'classic' | 'police' | 'distress';

let audioCtx: AudioContext | null = null;
let oscillator1: OscillatorNode | null = null;
let oscillator2: OscillatorNode | null = null;
let gainNode: GainNode | null = null;
let filterNode: BiquadFilterNode | null = null;
let sirenInterval: any = null;
let activeTone: SirenToneType = 'classic';

function initAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

export function startSirenAudio(tone: SirenToneType = 'classic') {
  try {
    // Stop any existing oscillator or intervals first
    stopSirenAudio();
    initAudioContext();

    if (!audioCtx) {
      console.warn('Web Audio API not supported in this environment.');
      return;
    }

    activeTone = tone;
    
    // Create nodes
    oscillator1 = audioCtx.createOscillator();
    oscillator2 = audioCtx.createOscillator();
    gainNode = audioCtx.createGain();
    filterNode = audioCtx.createBiquadFilter();

    // Volume configuration (not comedic, but persistent and protective)
    gainNode.gain.setValueAtTime(0.35, audioCtx.currentTime);

    // Filter to smooth out high distortions while preserving sharp focus and urgency
    filterNode.type = 'lowpass';
    filterNode.frequency.setValueAtTime(tone === 'distress' ? 3000 : 1800, audioCtx.currentTime);

    // Setup oscillators
    if (tone === 'classic') {
      // Classic Alarm - Rapid sirens: high frequency oscillation wail
      oscillator1.type = 'sawtooth';
      oscillator1.frequency.setValueAtTime(800, audioCtx.currentTime);
      
      // Secondary supporting oscillator to make it full body
      oscillator2.type = 'sine';
      oscillator2.frequency.setValueAtTime(820, audioCtx.currentTime);

      // Connect nodes
      oscillator1.connect(filterNode);
      oscillator2.connect(filterNode);
      filterNode.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      // Smooth oscillation loop
      let alternating = false;
      const intervalMs = 220; 
      sirenInterval = setInterval(() => {
        if (!audioCtx || !oscillator1 || !oscillator2) return;
        const targetFreq1 = alternating ? 1200 : 750;
        const targetFreq2 = alternating ? 1220 : 770;
        
        oscillator1.frequency.exponentialRampToValueAtTime(targetFreq1, audioCtx.currentTime + 0.18);
        oscillator2.frequency.exponentialRampToValueAtTime(targetFreq2, audioCtx.currentTime + 0.18);
        alternating = !alternating;
      }, intervalMs);

    } else if (tone === 'police') {
      // Police Deterrence Tone - Thick square/sine dual wail alternation
      oscillator1.type = 'triangle';
      oscillator1.frequency.setValueAtTime(580, audioCtx.currentTime);
      
      oscillator2.type = 'sawtooth';
      oscillator2.frequency.setValueAtTime(290, audioCtx.currentTime); // sub-octave growling for deterrence presence

      // Modulate oscillator 2 with slight lower volume
      const subGain = audioCtx.createGain();
      subGain.gain.setValueAtTime(0.12, audioCtx.currentTime);

      oscillator1.connect(filterNode);
      oscillator2.connect(subGain);
      subGain.connect(filterNode);
      filterNode.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      let alternateCycle = 0;
      const intervalMs = 600; // Police style sweep timing
      sirenInterval = setInterval(() => {
        if (!audioCtx || !oscillator1 || !oscillator2) return;
        
        let freq1 = 580;
        let freq2 = 290;
        
        if (alternateCycle === 0) {
          freq1 = 820; freq2 = 410;
        } else if (alternateCycle === 1) {
          freq1 = 610; freq2 = 305;
        } else if (alternateCycle === 2) {
          freq1 = 950; freq2 = 475;
        } else {
          freq1 = 450; freq2 = 225;
        }

        oscillator1.frequency.linearRampToValueAtTime(freq1, audioCtx.currentTime + 0.5);
        oscillator2.frequency.linearRampToValueAtTime(freq2, audioCtx.currentTime + 0.5);
        
        alternateCycle = (alternateCycle + 1) % 4;
      }, intervalMs);

    } else if (tone === 'distress') {
      // High frequency discrete locator distress ping
      oscillator1.type = 'sine';
      oscillator1.frequency.setValueAtTime(2200, audioCtx.currentTime);

      oscillator1.connect(filterNode);
      filterNode.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      let pulseOn = true;
      const intervalMs = 400; // SOS distress interval
      sirenInterval = setInterval(() => {
        if (!audioCtx || !gainNode) return;
        
        // Rapid square gated pulse
        if (pulseOn) {
          gainNode.gain.setValueAtTime(0.4, audioCtx.currentTime);
        } else {
          gainNode.gain.setValueAtTime(0.001, audioCtx.currentTime);
        }
        pulseOn = !pulseOn;
      }, intervalMs);
    }

    // Start playback
    oscillator1.start();
    if (tone !== 'distress') {
      oscillator2?.start();
    }

  } catch (err) {
    console.error('Failed to actuate deterrence siren synthesizer:', err);
  }
}

export function stopSirenAudio() {
  try {
    if (sirenInterval) {
      clearInterval(sirenInterval);
      sirenInterval = null;
    }

    if (oscillator1) {
      oscillator1.stop();
      oscillator1.disconnect();
      oscillator1 = null;
    }

    if (oscillator2) {
      try {
        oscillator2.stop();
      } catch {}
      oscillator2.disconnect();
      oscillator2 = null;
    }

    if (gainNode) {
      gainNode.disconnect();
      gainNode = null;
    }

    if (filterNode) {
      filterNode.disconnect();
      filterNode = null;
    }
  } catch (err) {
    console.warn('Silent disarm of active siren oscillator context carried out:', err);
  }
}
