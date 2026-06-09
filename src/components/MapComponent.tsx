import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { useEmergency } from '../context/EmergencyContext';
import { MapPin, Check, X, AlertTriangle, Navigation, Loader2, Shield } from 'lucide-react';
import { fetchWalkingRoute } from '../services/routeService';

// Fix for default marker icons
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Custom marker component to sync map center and handle resizing dynamically
function MapController({ center, isEmergency, isDispatched }: { center: [number, number]; isEmergency?: boolean; isDispatched?: boolean }) {
  const map = useMap();
  useEffect(() => {
    // Zoom map slightly during active SOS and fully dispatch
    const targetZoom = isEmergency ? (isDispatched ? 16 : 15) : 13;
    map.setView(center, targetZoom, { animate: true });
    // Zero-delay invalidation for maximum speed
    requestAnimationFrame(() => {
      map.invalidateSize();
    });
  }, [center, map, isEmergency, isDispatched]);
  return null;
}

export default function MapComponent() {
  const {
    checkpoints,
    updateCheckpointStatus,
    isEmergencyActive,
    isWalkWithMeActive,
    setIsWalkWithMeActive,
    isSafeModeActive,
    setIsSafeModeActive,
    setPenguinMessage,
    activeSafeHavenId,
    setActiveSafeHavenId,
    selectedRouteType,
    navigationPath,
    setNavigationPath,
    isFetchingRoute,
    setIsFetchingRoute,
    safePlaces,
    fetchNearbySafePlaces,
    userLocation,
    locationStatus,
    currentView,
    isStayWithMeActive,
    setStayWithMeActive,
    guardians
  } = useApp();

  const { isFullyDispatched } = useEmergency();

  const [center, setCenter] = useState<[number, number] | null>(null);
  const [lastFetchPos, setLastFetchPos] = useState<[number, number] | null>(null);
  const [lastRoutePos, setLastRoutePos] = useState<[number, number] | null>(null);
  const [penguinPosition, setPenguinPosition] = useState<[number, number] | null>(null);
  const [femalePosition, setFemalePosition] = useState<[number, number] | null>(null);
  const [penguinRotation, setPenguinRotation] = useState(0);
  const [femaleRotation, setFemaleRotation] = useState(0);
  const [isUserMoving, setIsUserMoving] = useState(false);
  const [isMovingDebounced, setIsMovingDebounced] = useState(false);
  const [lastUserPos, setLastUserPos] = useState<[number, number] | null>(null);
  const [activeCheckpoint, setActiveCheckpoint] = useState<string | null>(null);
  const [messageIndex, setMessageIndex] = useState(0);
  const [hasArrived, setHasArrived] = useState(false);
  const [isRouteDrawerOpen, setIsRouteDrawerOpen] = useState(false);

  // Smooth visual positions for animation
  const [visualUserPos, setVisualUserPos] = useState<[number, number] | null>(null);
  const [visualPenguinPos, setVisualPenguinPos] = useState<[number, number] | null>(null);

  // Refs for manual DOM manipulation (rotation) to avoid re-creating icons every frame
  const femaleMarkerRef = React.useRef<L.Marker>(null);
  const penguinMarkerRef = React.useRef<L.Marker>(null);

  // Helper: Linear interpolation between two coordinates
  const interpolate = (p1: [number, number], p2: [number, number], t: number): [number, number] => {
    if (!p1 || isNaN(p1[0]) || isNaN(p1[1])) return p2;
    if (!p2 || isNaN(p2[0]) || isNaN(p2[1])) return p1;
    const finalT = isNaN(t) ? 0 : t;
    return [
      p1[0] + (p2[0] - p1[0]) * finalT,
      p1[1] + (p2[1] - p1[1]) * finalT
    ];
  };

  // Helper: Get cumulative distance of segments in a path
  const getPathSegments = (path: [number, number][]) => {
    const segments: { length: number; start: number }[] = [];
    let totalLength = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const len = getDistance(path[i], path[i + 1]);
      segments.push({ length: len, start: totalLength });
      totalLength += len;
    }
    return { segments, totalLength };
  };

  // Helper: Find point on path at specific distance from start
  const getPointOnPathAtDistance = (path: [number, number][], distance: number) => {
    if (path.length < 2) return path[0] || null;
    const { segments, totalLength } = getPathSegments(path);
    const target = Math.max(0, Math.min(distance, totalLength));

    for (let i = 0; i < segments.length; i++) {
      if (target <= segments[i].start + segments[i].length) {
        if (segments[i].length === 0) return path[i];
        const segmentProgress = (target - segments[i].start) / segments[i].length;
        return interpolate(path[i], path[i + 1], segmentProgress);
      }
    }
    return path[path.length - 1];
  };

  // Helper: Find closest point on path to a target coordinate and its distance from start
  const projectPointOnPath = (point: [number, number], path: [number, number][]) => {
    if (path.length < 2) return { point: path[0] || point, distance: 0, offPathDistance: 0 };

    let minDistance = Infinity;
    let closestPoint: [number, number] = path[0];
    let distanceOnPath = 0;
    let accumulatedDistance = 0;

    for (let i = 0; i < path.length - 1; i++) {
      const p1 = path[i];
      const p2 = path[i + 1];
      const segLen = getDistance(p1, p2);

      // Simple projection: check 10 points on segment (efficient enough for walking routes)
      for (let j = 0; j <= 10; j++) {
        const t = j / 10;
        const testPoint = interpolate(p1, p2, t);
        const d = getDistance(point, testPoint);
        if (d < minDistance) {
          minDistance = d;
          closestPoint = testPoint;
          distanceOnPath = accumulatedDistance + t * segLen;
        }
      }
      accumulatedDistance += segLen;
    }

    return { point: closestPoint, distance: distanceOnPath, offPathDistance: minDistance };
  };

  // Fetch real walking route
  useEffect(() => {
    let isMounted = true;
    async function updateRoute() {
      if (activeSafeHavenId && userLocation) {
        const target = safePlaces.find(p => p.id === activeSafeHavenId);
        if (!target) return;

        // INSTANT FEEDBACK: Set optimistic path immediately if no real path exists yet
        const movedDistance = lastRoutePos ? getDistance(userLocation, lastRoutePos) : Infinity;

        // If we haven't moved much AND we already have a real path, keep it
        if (lastRoutePos && movedDistance < 30 && navigationPath.length > 2) {
          return;
        }

        // Show direct tactical line immediately while fetching
        setNavigationPath([userLocation, target.position]);

        setIsFetchingRoute(true);
        if (isEmergencyActive) {
          setPenguinMessage("SCANNING SECURE ESCORT PATH... STAY CLOSE! 🐧");
        }

        try {
          const route = await fetchWalkingRoute(userLocation, target.position);
          if (!isMounted) return;

          console.log(`[TACTICAL] Path synced. Points: ${route.coordinates.length}`);
          setNavigationPath(route.coordinates);
          setLastRoutePos(userLocation);

          if (route.coordinates.length > 2) {
            if (isEmergencyActive) {
              setPenguinMessage("SAFE ROUTE ESTABLISHED. MOVING NOW! 🐧");
            } else if (isSafeModeActive) {
              setPenguinMessage(`Tactical path calculated. ${Math.round(route.distance / 100) / 10}km trek ahead. 🐧`);
            }
          }
        } catch (error) {
          if (!isMounted) return;
          console.error("[TACTICAL] Routing error:", error);
          // Fallback handled by retaining the direct line 
        } finally {
          if (isMounted) setIsFetchingRoute(false);
        }
      } else if (!activeSafeHavenId && !isEmergencyActive && !isWalkWithMeActive) {
        setNavigationPath([]);
        setLastRoutePos(null);
      }
    }

    updateRoute();
    return () => { isMounted = false; };
  }, [activeSafeHavenId, userLocation, selectedRouteType, isEmergencyActive, isWalkWithMeActive]);

  // Sync internal center with global userLocation
  useEffect(() => {
    if (userLocation) {
      // If we don't have a center yet, set it
      if (!center) {
        setCenter(userLocation);
        setLastUserPos(userLocation);
        setPenguinPosition(userLocation);
      } else if (!activeSafeHavenId || isWalkWithMeActive) {
        // If not in navigation, or in Walk With Me mode, center follows user
        setCenter(userLocation);
      }
    }
  }, [userLocation, activeSafeHavenId, isWalkWithMeActive]);

  // Trigger safe haven fetching
  useEffect(() => {
    if (userLocation) {
      if (!lastFetchPos || getDistance(userLocation, lastFetchPos) > 500) {
        fetchNearbySafePlaces(userLocation[0], userLocation[1]);
        setLastFetchPos(userLocation);
      }
    }
  }, [userLocation]);

  // Force map invalidation when emergency or mode changes to prevent rendering glitches
  useEffect(() => {
    const timer = setTimeout(() => {
      // Find all Leaflet maps and invalidate them (there might be two)
      const maps = document.querySelectorAll('.leaflet-container');
      maps.forEach((mapEl: any) => {
        const map = mapEl._leaflet_map;
        if (map) map.invalidateSize();
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [isEmergencyActive, isSafeModeActive, currentView]);

  // Debounce movement state to avoid flickering
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMovingDebounced(isUserMoving);
    }, 500);
    return () => clearTimeout(timer);
  }, [isUserMoving]);

  const femaleIcon = React.useMemo(() => L.divIcon({
    className: "mascot-marker-container",
    html: `
      <div class="mascot-wrapper relative flex items-center justify-center">
        <!-- Soft breathing glow aura -->
        <div class="absolute w-28 h-28 rounded-full bg-[#3BE0B9]/15 blur-xl animate-pulse pointer-events-none"></div>
        
        <!-- Soft expanding radar pulse rings (movement reactive) -->
        <div class="absolute w-36 h-36 border border-cyan-400/20 rounded-full user-pulse-ring-1 ${isMovingDebounced ? 'pulse-fast' : ''}"></div>
        <div class="absolute w-36 h-36 border border-[#3BE0B9]/20 rounded-full user-pulse-ring-2 ${isMovingDebounced ? 'pulse-fast' : ''}"></div>
        <div class="absolute w-36 h-36 border border-[#3BE0B9]/10 rounded-full user-pulse-ring-3 ${isMovingDebounced ? 'pulse-fast' : ''}"></div>

        ${isMovingDebounced
        ? `<video src="/femaleTracker.webm" class="female-mascot-img relative z-10" muted playsinline autoplay loop></video>`
        : `<img src="/femaleAvatar1.png" class="female-mascot-img relative z-10" />`
      }
      </div>
    `,
    iconSize: [200, 200],
    iconAnchor: [100, 160],
  }), [isMovingDebounced]);

  const penguinIcon = React.useMemo(() => L.divIcon({
    className: "mascot-marker-container",
    html: `
      <div class="mascot-wrapper ${isEmergencyActive ? 'sos-mascot-active mascot-hero-mode' : ''}">
        ${isMovingDebounced || isEmergencyActive
        ? `<video src="/penguinTracker.webm" class="penguin-mascot-img" muted playsinline autoplay loop style="${isEmergencyActive ? 'filter: drop-shadow(0 0 15px rgba(255,255,255,0.4)); scale: 1.2;' : ''}"></video>`
        : `<img src="/penguinTracker1.png" class="penguin-mascot-img" />`
      }
      </div>
    `,
    iconSize: isEmergencyActive ? [180, 180] : [130, 130],
    iconAnchor: isEmergencyActive ? [90, 160] : [55, 116],
  }), [isMovingDebounced, isEmergencyActive]);

  // Tactical Scanning HUD Component
  const ScanningHUD = () => {
    const [seconds, setSeconds] = useState(0);

    useEffect(() => {
      const interval = setInterval(() => setSeconds(s => s + 0.1), 100);
      return () => clearInterval(interval);
    }, []);

    if (!isFetchingRoute || !isEmergencyActive) return null;

    return (
      <div className="absolute top-24 left-1/2 -translate-x-1/2 z-[500] w-[300px] bg-[#1A1528]/95 backdrop-blur-xl border border-[#6A3DE8]/30 rounded-2xl p-5 shadow-[0_0_50px_rgba(106,61,232,0.15)] overflow-hidden">
        {/* Ambient Radar Sweep */}
        <div className="radar-sweep opacity-20" style={{ transform: 'scale(0.5)' }} />

        <div className="relative z-10 flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-3 h-3 bg-secondary rounded-full animate-ping absolute inset-0" />
              <div className="w-3 h-3 bg-secondary rounded-full relative" />
            </div>
            <span className="text-[11px] font-mono text-secondary uppercase tracking-widest font-black italic">Finding Safe Path</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1 h-1 bg-white/20 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
            <span className="w-1 h-1 bg-white/20 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
            <span className="w-1 h-1 bg-white/20 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
            <span className="text-[10px] font-mono text-white/50 tracking-tighter tactical-scanning-timer ml-1">
              {seconds.toFixed(1)}s
            </span>
          </div>
        </div>

        <div className="relative z-10 space-y-3">
          <p className="text-[12px] font-mono text-white tracking-wide leading-tight min-h-[32px]">
            {seconds < 1.0 ? ">> INITIALIZING SAFE LINK..." :
              seconds < 2.5 ? ">> LOCATING SANCTUARIES..." :
                seconds < 4.0 ? ">> GENTLY MAPPING YOUR WAY..." :
                  ">> SECURING COMPANION WAY..."}
          </p>
          <div className="scanning-progress-bar rounded-full">
            <div className="scanning-progress-fill" />
          </div>
        </div>

        <div className="relative z-10 mt-4 flex justify-between items-center opacity-40 border-t border-white/5 pt-3">
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="w-0.5 h-3 bg-secondary/50 rounded-full" />
            ))}
          </div>
          <span className="text-[8px] font-mono text-white/40 tracking-[0.2em]">NODE_ID: 0xPENGUIN_PROTECT</span>
        </div>
      </div>
    );
  };

  const [floatOffset, setFloatOffset] = useState({ x: 0, y: 0 });

  const companionshipMessages = isEmergencyActive ? [
    "You’re doing amazing. Stay with me ✨",
    "I’m tracking the safest route for you 🐧",
    "You are not alone right now. I'm right here 🫶",
    "Almost there — keep moving safely 🌸",
    "You’re safe with me 💖",
    "Take a deep breath. You’re doing okay ✨",
    "Safe route updated successfully.",
    "Nearby safe areas are being monitored 🛡️",
    "You’re getting closer to safety ✨",
    "Everything is under control. I've got you 🫶",
    "Scanning safe paths... You're secure 🛡️",
    "Overwatch active. You're doing great ✨",
    "Route integrity: 100%. Stay calm 🌸",
    "Almost there — moving to safe haven 🫶",
    "Safe haven coordinates confirmed ✨",
    "Guardian network is standing by 🛡️",
    "You're making excellent progress 💖",
    "Keep following the designated path 🐧"
  ] : [
    "Stay with me 🐧",
    "We're heading somewhere safe.",
    "You're doing great.",
    "Safer street ahead.",
    "Almost there.",
    "I'm right here with you.",
    "Watching your surroundings.",
    "You're moving well.",
    "Scanning nearby nodes...",
    "Everything looks clear ahead."
  ];

  // Helper: Tactical Reassurance cycling during emergency
  useEffect(() => {
    if (isEmergencyActive || isWalkWithMeActive) {
      const interval = setInterval(() => {
        setMessageIndex(prev => (prev + 1) % companionshipMessages.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [isEmergencyActive, isWalkWithMeActive, companionshipMessages.length]);

  // Helper: Haversine distance in meters
  const getDistance = (p1: [number, number], p2: [number, number]) => {
    if (!p1 || !p2 || isNaN(p1[0]) || isNaN(p1[1]) || isNaN(p2[0]) || isNaN(p2[1])) {
      return 0;
    }
    const R = 6371e3; // metres
    const φ1 = p1[0] * Math.PI / 180;
    const φ2 = p2[0] * Math.PI / 180;
    const Δφ = (p2[0] - p1[0]) * Math.PI / 180;
    const Δλ = (p2[1] - p1[1]) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const [showOnboarding, setShowOnboarding] = useState(false);
  const DEV_SHOW_HINT = false;

  useEffect(() => {
    const hasSeenOnboarding = sessionStorage.getItem('safeping_walk_onboarding');
    if ((DEV_SHOW_HINT || !hasSeenOnboarding) && !isSafeModeActive) {
      const timer = setTimeout(() => setShowOnboarding(true), 2500);
      const hideTimer = setTimeout(() => setShowOnboarding(false), 9000);
      return () => {
        clearTimeout(timer);
        clearTimeout(hideTimer);
      };
    }
  }, [isSafeModeActive]);

  // Handle live movement synchronization and Companion Logic
  useEffect(() => {
    if (userLocation) {
      if (!lastUserPos) setLastUserPos(userLocation);

      const dist = getDistance(userLocation, lastUserPos || userLocation);
      if (dist > 0.4) {
        setIsUserMoving(true);
        setLastUserPos(userLocation);
      } else {
        const timer = setTimeout(() => setIsUserMoving(false), 2500);
        return () => clearTimeout(timer);
      }
    }
  }, [userLocation, lastUserPos]);

  // Derived penguin position with immediate start
  useEffect(() => {
    if (userLocation && !penguinPosition) {
      setPenguinPosition([userLocation[0] + 0.0001, userLocation[1] + 0.0001]);
    }
  }, [userLocation, penguinPosition]);

  // Handle map zoom transitions for tactical focus
  useEffect(() => {
    if (isEmergencyActive || isWalkWithMeActive) {
      // Zoom in for tactical focus
      const maps = document.querySelectorAll('.leaflet-container');
      maps.forEach((mapEl: any) => {
        const map = mapEl._leaflet_map;
        if (map) {
          map.setZoom(17, { animate: true });
        }
      });
    }
  }, [isEmergencyActive, isWalkWithMeActive]);

  // Main high-performance animation loop for mascots
  useEffect(() => {
    let frame: number;
    let lastTime = 0;
    let prevPenguinRot = penguinRotation;
    let prevFemaleRot = femaleRotation;

    const animate = (time: number) => {
      if (!lastTime) lastTime = time;
      const deltaTime = (time - lastTime) / 1000;
      lastTime = time;

      if (!userLocation) {
        frame = requestAnimationFrame(animate);
        return;
      }

      // 1. Calculate Target Positions
      let femaleTarget = userLocation;
      let penguinTarget: [number, number] = userLocation;
      let pRotTarget = penguinRotation;
      let fRotTarget = femaleRotation;

      if (userLocation && !penguinPosition) {
        setPenguinPosition([userLocation[0] + 0.0001, userLocation[1] + 0.0001]);
      }

      if (activeSafeHavenId && navigationPath.length > 1) {
        const projection = projectPointOnPath(userLocation, navigationPath);

        // Female (User) target is the user location, but maybe snapped to path if close enough
        femaleTarget = projection.offPathDistance < 20 ? projection.point : userLocation;

        // Penguin (Companion) is ~15m ahead on the path
        const penguinDist = projection.distance + 15;
        const pPoint = getPointOnPathAtDistance(navigationPath, penguinDist);
        if (pPoint) penguinTarget = pPoint;

        // Calculate tilt for penguin (lean towards horizontal movement)
        const rotPoint = getPointOnPathAtDistance(navigationPath, penguinDist + 2);
        if (rotPoint && pPoint) {
          const dy = rotPoint[0] - pPoint[0];
          const dx = rotPoint[1] - pPoint[1];
          const angleRad = Math.atan2(dx, dy);
          // Target a subtle lean based on horizontal travel, clamped to ±25deg
          pRotTarget = Math.max(-25, Math.min(25, Math.sin(angleRad) * 25));
        }

        // Calculate tilt for female (look towards penguin)
        if (pPoint && femaleTarget) {
          const dy = pPoint[0] - femaleTarget[0];
          const dx = pPoint[1] - femaleTarget[1];
          const angleRad = Math.atan2(dx, dy);
          fRotTarget = Math.max(-25, Math.min(25, Math.sin(angleRad) * 20));
        }
      } else {
        // No path active, stay together with zero tilt
        penguinTarget = [
          userLocation[0] + 0.0001,
          userLocation[1] + 0.0001
        ];
        pRotTarget = 0;
        fRotTarget = 0;
      }

      // 2. Smoothly Interpolate positions and rotations
      // Increase lerp speed during emergency for "immediate" tactical response
      const baseLerp = isEmergencyActive || isWalkWithMeActive ? 15 : 5;
      const lerpFactor = baseLerp * deltaTime;

      setFemalePosition(prev => {
        if (!prev) return femaleTarget;
        // Snap instantly if distance is large (initial activation pulse)
        const dist = getDistance(prev, femaleTarget);
        if (dist > 100) return femaleTarget;
        return interpolate(prev, femaleTarget, Math.min(1, lerpFactor));
      });

      setPenguinPosition(prev => {
        if (!prev) return penguinTarget;
        // Snap instantly if distance is large (initial activation pulse)
        const dist = getDistance(prev, penguinTarget);
        if (dist > 100) return penguinTarget;
        return interpolate(prev, penguinTarget, Math.min(1, lerpFactor));
      });

      // Smoothly approach the target tilt (clamped lean)
      const pRotNew = prevPenguinRot + (pRotTarget - prevPenguinRot) * Math.min(1, lerpFactor * 2);
      setPenguinRotation(pRotNew);
      prevPenguinRot = pRotNew;

      const fRotNew = prevFemaleRot + (fRotTarget - prevFemaleRot) * Math.min(1, lerpFactor * 2);
      setFemaleRotation(fRotNew);
      prevFemaleRot = fRotNew;

      // Manual DOM update for rotation to avoid expensive icon re-creation
      if (femaleMarkerRef.current) {
        const el = femaleMarkerRef.current.getElement();
        if (el) {
          const wrapper = el.querySelector('.mascot-wrapper') as HTMLElement;
          if (wrapper) wrapper.style.transform = `rotate(${fRotNew}deg)`;
        }
      }
      if (penguinMarkerRef.current) {
        const el = penguinMarkerRef.current.getElement();
        if (el) {
          const wrapper = el.querySelector('.mascot-wrapper') as HTMLElement;
          if (wrapper) wrapper.style.transform = `rotate(${pRotNew}deg)`;
        }
      }

      // Floating effect
      const fx = Math.sin(time / 1000) * 5;
      const fy = Math.cos(time / 800) * 5;
      setFloatOffset({ x: fx, y: fy });

      // Check arrival
      if (activeSafeHavenId) {
        const target = safePlaces.find(p => p.id === activeSafeHavenId);
        if (target) {
          const distToTarget = getDistance(userLocation, target.position);
          if (distToTarget < 25) {
            if (!hasArrived) {
              setHasArrived(true);
              setPenguinMessage("Strategic objective reached. You are safe. 🐧");
            }
          } else {
            setHasArrived(false);
          }
        }
      }

      // Random messages - more frequent during emergency
      const messageTriggerChance = isEmergencyActive ? 0.98 : 0.995;
      if (isUserMoving && Math.random() > messageTriggerChance) {
        setMessageIndex(prev => (prev + 1) % companionshipMessages.length);
      }

      frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [userLocation, activeSafeHavenId, navigationPath, safePlaces, hasArrived, isUserMoving]);

  // Real GPS Watcher removed (now in AppContext)

  const customIcon = new L.Icon({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIcon2x,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  const safePlaceIcon = (color: string, isTarget: boolean, isNearest: boolean) => L.divIcon({
    className: 'safe-place-marker',
    html: `
      <div class="relative flex items-center justify-center">
        <div class="absolute w-12 h-12 rounded-full blur-xl opacity-40 ${isTarget ? 'bg-white' : isNearest ? 'bg-secondary' : ''}"></div>
        <div class="absolute w-8 h-8 rounded-full blur-md opacity-60 animate-pulse" style="background-color: ${isTarget ? '#ffffff' : color}"></div>
        <div class="w-4 h-4 rounded-full border-2 border-white shadow-lg relative z-10 transition-all duration-500 ${isTarget ? 'scale-150' : ''}" 
          style="background-color: ${isTarget ? '#ffffff' : color}"></div>
        ${isTarget ? '<div class="absolute -top-8 bg-white text-black text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-widest whitespace-nowrap">Target</div>' : ''}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });


  const bubbleText = hasArrived
    ? "Journey Accomplished Safely! You are safe. 🐧"
    : isEmergencyActive
      ? companionshipMessages[messageIndex]
      : !isUserMoving
        ? "Keeping a quiet eye around... 🐧"
        : activeSafeHavenId
          ? companionshipMessages[messageIndex]
          : "Quiet Companion Watch Active. 🐧";

  const bubbleIcon = React.useMemo(() => L.divIcon({
    className: 'penguin-bubble-marker',
    html: `
      <div class="penguin-speech-container ${isEmergencyActive ? 'mb-32 scale-110' : 'mb-20'}">
        <div class="penguin-speech-bubble ${hasArrived ? 'bubble-safe' : (isEmergencyActive ? 'bubble-emergency' : 'bubble-default')} animate-float">
          <p class="penguin-speech-text">
            ${bubbleText}
          </p>
          <div class="penguin-speech-tail"></div>
        </div>
      </div>
    `,
    iconSize: [600, 400],
    iconAnchor: [300, 360],
  }), [bubbleText, isEmergencyActive, hasArrived]);

  const getSafetyCheckpoints = () => {
    if (selectedRouteType !== 'safer' || !activeSafeHavenId || !userLocation || navigationPath.length < 3) return [];

    // For real routes, we might want to place checkpoints at strategic turns
    // For now, let's just use the midpoint of the calculated path
    const midIdx = Math.floor(navigationPath.length / 2);
    return [{ id: 'cp1', position: navigationPath[midIdx], type: 'light' }];
  };

  if (locationStatus === 'denied') {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#0D1117] rounded-[32px] border border-white/10 p-12 text-center gap-6">
        <div className="w-20 h-20 rounded-full bg-emergency/10 border border-emergency/20 flex items-center justify-center mb-2">
          <AlertTriangle size={40} className="text-emergency" />
        </div>
        <div>
          <h3 className="text-white font-black uppercase tracking-widest text-lg mb-2">GPS Link Severed</h3>
          <p className="text-white/40 text-[11px] font-medium leading-relaxed uppercase tracking-tighter">
            Staying close requires live map synchronization. <br />Please enable location services in your device settings.
          </p>
        </div>
      </div>
    );
  }

  // CRITICAL: Ensure map only renders when center is valid to prevent "loading infinite tiles"
  if (!center || !userLocation || isNaN(center[0]) || isNaN(center[1]) || isNaN(userLocation[0]) || isNaN(userLocation[1])) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-navy-dark rounded-[32px] border border-white/10 gap-6">
        <div className="relative">
          <div className="w-24 h-24 border-2 border-pink-500/20 rounded-full animate-ping absolute" />
          <div className="w-24 h-24 border-2 border-pink-500/40 border-t-pink-500 rounded-full animate-spin relative" />
        </div>
        <p className="text-[10px] font-black uppercase text-pink-500 tracking-[0.4em] animate-pulse">Syncing Compassionate Path...</p>
      </div>
    );
  }

  let safetyState: 'SAFE' | 'MOVING' | 'ELEVATED_RISK' | 'SOS_ACTIVE' = 'SAFE';
  if (isEmergencyActive) {
    safetyState = 'SOS_ACTIVE';
  } else if (isSafeModeActive) {
    safetyState = 'ELEVATED_RISK';
  } else if (isUserMoving || isWalkWithMeActive || isStayWithMeActive) {
    safetyState = 'MOVING';
  } else {
    safetyState = 'SAFE';
  }

  const stateColors = {
    SAFE: {
      border: 'border-[#3BE0B9]/20',
      glow: 'shadow-[0_0_30px_rgba(59,224,185,0.06)]',
      text: 'text-[#3BE0B9]',
      bg: 'bg-[#3BE0B9]/10',
      particlesColor: '#3BE0B9'
    },
    MOVING: {
      border: 'border-cyan-400/35',
      glow: 'shadow-[0_0_35px_rgba(34,211,238,0.12)]',
      text: 'text-cyan-400',
      bg: 'bg-cyan-400/10',
      particlesColor: '#22d3ee'
    },
    ELEVATED_RISK: {
      border: 'border-amber-400/50',
      glow: 'shadow-[0_0_40px_rgba(251,191,36,0.16)]',
      text: 'text-amber-400',
      bg: 'bg-amber-400/10',
      particlesColor: '#fbbf24'
    },
    SOS_ACTIVE: {
      border: 'border-rose-500/70',
      glow: 'shadow-[0_0_55px_rgba(244,63,94,0.35)]',
      text: 'text-rose-500',
      bg: 'bg-rose-500/15',
      particlesColor: '#f43f5e'
    }
  };

  return (
    <div className={`relative w-full h-full rounded-[32px] border ${stateColors[safetyState].border} bg-[#0B1023] ${stateColors[safetyState].glow} overflow-hidden transition-all duration-1000`}>
      
      {/* 3. Floating Cinematic Status Cards overlay */}
      <div className="absolute top-4 left-4 z-[450] flex flex-col gap-2 pointer-events-none">
        <motion.div
          initial={{ opacity: 0, x: -15 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/75 border border-[#3BE0B9]/20 backdrop-blur-xl shadow-lg"
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              safetyState === 'SOS_ACTIVE' ? 'bg-rose-500' :
              safetyState === 'ELEVATED_RISK' ? 'bg-amber-400' : 'bg-[#3BE0B9]'
            }`}></span>
            <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
              safetyState === 'SOS_ACTIVE' ? 'bg-rose-500' :
              safetyState === 'ELEVATED_RISK' ? 'bg-amber-400' : 'bg-[#3BE0B9]'
            }`}></span>
          </span>
          <span className="text-[9px] font-sans font-bold uppercase tracking-[0.12em] text-cyan-200">
            {safetyState === 'SOS_ACTIVE' ? 'SOS Active Connection' : 
             safetyState === 'ELEVATED_RISK' ? 'Monitoring Elevated Risk' : 'Location Synced'}
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -15 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/75 border border-white/5 backdrop-blur-xl shadow-lg"
        >
          <Shield size={10} className={stateColors[safetyState].text} />
          <span className="text-[9px] font-sans font-bold uppercase tracking-[0.12em] text-white">
            {activeSafeHavenId || isWalkWithMeActive ? "Safe corridor active" : "Safe corridor standby"}
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -15 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/75 border border-white/5 backdrop-blur-xl shadow-lg"
        >
          <svg className="w-2.5 h-2.5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <span className="text-[9px] font-sans font-bold uppercase tracking-[0.12em] text-cyan-100">
            {guardians.length > 0
              ? `${guardians.length} guardian${guardians.length > 1 ? 's' : ''} connected`
              : "Guardians watching live"}
          </span>
        </motion.div>
      </div>

      {/* 6. Atmospheric drifting fog layer */}
      <div className="absolute inset-0 pointer-events-none z-[410] overflow-hidden mix-blend-screen opacity-35">
        <div className="absolute top-0 left-0 w-[200%] h-[200%] bg-gradient-to-tr from-cyan-950/5 via-transparent to-teal-950/10 drifting-cloud-layer" />
      </div>

      {/* Ambient Twinkling Floating Particles */}
      <div className="absolute inset-0 pointer-events-none z-[415] overflow-hidden">
        {[...Array(10)].map((_, i) => {
          const size = 2 + (i % 3) * 1.5;
          const left = 5 + (i * 9) % 90;
          const top = 10 + (i * 8) % 80;
          return (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                width: size,
                height: size,
                left: `${left}%`,
                top: `${top}%`,
                backgroundColor: stateColors[safetyState].particlesColor,
                filter: 'blur(0.5px)'
              }}
              animate={{
                y: [-10, -40],
                x: [-5, 5],
                opacity: [0, 0.6, 0]
              }}
              transition={{
                duration: 7 + (i % 2) * 5,
                repeat: Infinity,
                delay: i * 0.8,
                ease: "easeInOut"
              }}
            />
          );
        })}
      </div>

      {/* 5. Safe Route Contextual Assistance Slide-in Drawer */}
      <AnimatePresence>
        {isRouteDrawerOpen && (
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            className="absolute top-0 right-0 h-full w-full sm:w-[325px] bg-[#070b13]/95 backdrop-blur-2xl border-l border-white/10 z-[1200] p-5 flex flex-col gap-4 overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex flex-col">
                <span className={`text-[10px] uppercase tracking-widest ${stateColors[safetyState].text} font-black`}>
                  Journey Escort
                </span>
                <h3 className="text-sm font-black uppercase text-white tracking-tight">Safe Route Assistance</h3>
              </div>
              <button 
                onClick={() => setIsRouteDrawerOpen(false)}
                className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all cursor-pointer pointer-events-auto"
              >
                <X size={12} />
              </button>
            </div>

            {/* Quick Context Info */}
            <div className={`p-4 rounded-2xl ${stateColors[safetyState].bg} border border-[#3BE0B9]/15 flex flex-col gap-1.5`}>
              <div className="flex items-center gap-2">
                <span className="text-sm">🛡️</span>
                <span className="text-[10px] font-black uppercase tracking-wider text-white">Continuous Security Status</span>
              </div>
              <p className="text-[10px] leading-relaxed text-cyan-200">
                You are traversing a pre-verified secure corridor. Nearby police hubs and lit pathways are prioritized.
              </p>
            </div>

            {/* Walk With Me Mode Toggle inside Drawer */}
            <div className="p-4 rounded-3xl bg-slate-900/50 border border-white/5 flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] font-black uppercase tracking-wider text-[#3BE0B9]">Safety Escort Protocol</span>
                  <h4 className="text-[12px] font-black uppercase text-white">Walk With Me Mode</h4>
                </div>
                <button
                  onClick={() => {
                    const nextVal = !isWalkWithMeActive;
                    setIsWalkWithMeActive(nextVal);
                    if (nextVal) {
                      setPenguinMessage("Active overwatch armed. I'm taking care of you until you arrive safely! 🐧");
                    } else {
                      setPenguinMessage("Companion suspended. Standby watcher mode. 🐧");
                    }
                  }}
                  className={`relative w-11 h-6 rounded-full p-0.5 transition-all outline-none flex items-center pointer-events-auto cursor-pointer ${
                    isWalkWithMeActive ? 'bg-[#3BE0B9]' : 'bg-white/10'
                  }`}
                >
                  <motion.div
                    layout
                    className="w-5 h-5 rounded-full bg-[#070b13] shadow-md pointer-events-none"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    style={{ marginLeft: isWalkWithMeActive ? 'auto' : '0' }}
                  />
                </button>
              </div>
              
              <p className="text-[10px] leading-relaxed text-white/40">
                Arm active guardian sync, automatic periodic reassurance checks, and heightened tactical tracking.
              </p>

              {isWalkWithMeActive && (
                <div className="flex items-center gap-1.5 bg-[#3BE0B9]/10 px-2.5 py-1 rounded-full border border-[#3BE0B9]/20 self-start">
                  <div className="w-1.5 h-1.5 bg-[#3BE0B9] rounded-full animate-ping" />
                  <span className="text-[8px] font-black tracking-widest uppercase text-[#3BE0B9]">SYNCED WITH GUARDIANS</span>
                </div>
              )}
            </div>

            {/* Tactical Safe places */}
            <div className="flex flex-col gap-3">
              <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Verified Safe Places Nearby</span>
              
              <div className="flex flex-col gap-2">
                {safePlaces.slice(0, 4).map((place) => {
                  const isCur = activeSafeHavenId === place.id;
                  return (
                    <div
                      key={place.id}
                      onClick={() => {
                        setActiveSafeHavenId(place.id);
                        setPenguinMessage(`Slight diversion, setting target to ${place.name}. 🐧`);
                      }}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex justify-between items-center pointer-events-auto ${
                        isCur 
                          ? 'bg-[#3BE0B9]/5 border-[#3BE0B9] shadow-[0_0_12px_rgba(59,224,185,0.15)]' 
                          : 'bg-white/5 border-white/5 hover:border-white/10'
                      }`}
                    >
                      <div className="flex flex-col gap-0.5 max-w-[80%]">
                        <span className="text-[11px] font-bold text-white uppercase truncate">{place.name}</span>
                        <div className="flex gap-1.5">
                          <span className="text-[8px] px-1 py-0.5 rounded bg-white/5 text-white/50 uppercase border border-white/5">
                            {place.tierLabel || 'Safe Zone'}
                          </span>
                          <span className="text-[8px] font-bold text-cyan-400">
                            {place.distance ? `${Math.round(place.distance)}m` : ''}
                          </span>
                        </div>
                      </div>
                      <div className={`w-2.5 h-2.5 rounded-full ${isCur ? 'bg-[#3BE0B9]' : 'bg-white/15'}`} />
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <MapContainer
        center={center}
        zoom={13}
        scrollWheelZoom={true}
        className="w-full h-full"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors'
          url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
          className={isEmergencyActive ? 'tactical-moon-filter' : ''}
        />

        {/* Cyberpunk Holographic HUD Overlay */}
        <div
          className={`absolute inset-0 z-[400] pointer-events-none transition-all duration-1000 ${isSafeModeActive || isEmergencyActive || isStayWithMeActive ? 'mix-blend-screen opacity-100' : 'mix-blend-screen opacity-60'}`}
          style={{
            background: isEmergencyActive
              ? 'radial-gradient(circle at center, transparent 40%, rgba(13, 17, 23, 0.5) 100%), linear-gradient(135deg, rgba(106, 61, 232, 0.06), rgba(26, 21, 40, 0.2))'
              : (isStayWithMeActive
                ? 'radial-gradient(circle at center, transparent 30%, rgba(11, 20, 38, 0.8) 100%), linear-gradient(135deg, rgba(29, 187, 138, 0.06), rgba(106, 61, 232, 0.08))'
                : (isSafeModeActive
                  ? 'linear-gradient(135deg, rgba(106, 61, 232, 0.2), rgba(29, 187, 138, 0.15), rgba(106, 61, 232, 0.1))'
                  : 'linear-gradient(135deg, rgba(106, 61, 232, 0.08), rgba(29, 187, 138, 0.05), rgba(106, 61, 232, 0.04))'))
          }}
        >
          {isEmergencyActive && (
            <div className="absolute inset-0 tactical-scanning-grid opacity-10" />
          )}
          {isStayWithMeActive && (
            <div className="absolute inset-0 bg-secondary/[0.03] animate-pulse pointer-events-none duration-[5000ms]" />
          )}
        </div>

        {center && <MapController center={center} isEmergency={isEmergencyActive} isDispatched={isFullyDispatched} />}

        {/* Clean Emergency Mode */}
        {isEmergencyActive && userLocation && (
          <Marker
            position={userLocation}
            icon={L.divIcon({
              className: 'clean-emergency-marker',
              html: `
        <div class="relative flex items-center justify-center">
          <div class="w-8 h-8 rounded-full bg-emergency/20 animate-ping absolute"></div>
          <div class="w-4 h-4 rounded-full ${isFullyDispatched ? 'bg-secondary shadow-[0_0_20px_rgba(29,187,138,0.95)]' : 'bg-emergency shadow-[0_0_20px_rgba(232,69,42,0.8)]'} border-2 border-white"></div>
        </div>
      `,
              iconSize: [24, 24],
              iconAnchor: [12, 12]
            })}
          />
        )}

        {/* Monitored-area pulse effects around Safe Havens */}
        {isFullyDispatched && safePlaces.map((place) => (
          <Circle
            key={`pulse-${place.id}`}
            center={place.position}
            radius={180}
            pathOptions={{
              color: place.id === activeSafeHavenId ? '#1DBB8A' : '#6A3DE8',
              fillColor: place.id === activeSafeHavenId ? '#1DBB8A' : '#6A3DE8',
              fillOpacity: 0.1,
              weight: 1.5,
              dashArray: '5, 8'
            }}
          />
        ))}

        {/* Extra Neon glowing route underlay */}
        {isFullyDispatched && navigationPath.length > 0 && (
          <Polyline
            positions={navigationPath}
            pathOptions={{
              color: '#10b981',
              weight: 14,
              opacity: 0.2,
              lineJoin: 'round',
              lineCap: 'round'
            }}
          />
        )}

        {/* Cinematic Multi-Tiered Safe Route Corridor (soft glow + energy particles flowing) */}
        {(activeSafeHavenId || isWalkWithMeActive || isStayWithMeActive) && (isEmergencyActive || selectedRouteType === 'safer') && navigationPath.length > 0 && (
          <>
            {/* 1. Broad soft safe aura underlay */}
            <Polyline
              positions={navigationPath}
              pathOptions={{
                color: safetyState === 'SOS_ACTIVE' ? '#f43f5e' : (safetyState === 'ELEVATED_RISK' ? '#fbbf24' : '#3BE0B9'),
                weight: 15,
                opacity: 0.12,
                lineJoin: 'round',
                lineCap: 'round'
              }}
              className="safe-corridor-broad-aura"
            />

            {/* 2. Glowing main core channel */}
            <Polyline
              positions={navigationPath}
              pathOptions={{
                color: safetyState === 'SOS_ACTIVE' ? '#f43f5e' : (safetyState === 'ELEVATED_RISK' ? '#fbbf24' : '#3BE0B9'),
                weight: 5,
                opacity: 0.55,
                lineJoin: 'round',
                lineCap: 'round'
              }}
              className={
                isFetchingRoute 
                  ? 'optimistic-route-line' 
                  : (safetyState === 'SOS_ACTIVE' 
                     ? 'safe-corridor-flow-line-emergency' 
                     : (safetyState === 'ELEVATED_RISK' 
                        ? 'safe-corridor-flow-line-risk' 
                        : 'safe-corridor-flow-line'))
              }
            />

            {/* 3. Outer flow of active energy particles (flowing spots/segments) */}
            {!isFetchingRoute && (
              <Polyline
                positions={navigationPath}
                pathOptions={{
                  color: '#ffffff',
                  weight: 2.5,
                  opacity: 0.85,
                  lineJoin: 'round',
                  lineCap: 'round'
                }}
                className="safe-corridor-particles"
              />
            )}
          </>
        )}

        {activeSafeHavenId && selectedRouteType === 'faster' && navigationPath.length > 0 && (
          <Polyline
            positions={navigationPath}
            pathOptions={{
              color: '#34d399',
              weight: 4,
              opacity: 0.7,
              lineJoin: 'round',
              lineCap: 'round'
            }}
            className="faster-route-line"
          />
        )}

        {/* Safety Checkpoints along Safer Route */}
        {getSafetyCheckpoints().map(cp => (
          <Marker
            key={cp.id}
            position={cp.position}
            icon={L.divIcon({
              className: 'checkpoint-marker',
              html: `
                <div class="flex flex-col items-center gap-1 group">
                  <div class="w-2 h-2 rounded-full bg-primary animate-ping absolute"></div>
                  <div class="w-4 h-4 rounded-full bg-primary border-2 border-white shadow-[0_0_10px_rgba(106,61,232,0.8)] relative z-10"></div>
                  <div class="bg-[#1A1528]/90 px-2 py-1 rounded-lg border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    <span class="text-[8px] font-black text-primary uppercase tracking-tighter">High Visibility Zone</span>
                  </div>
                </div>
              `,
              iconSize: [20, 20],
              iconAnchor: [10, 10]
            })}
          />
        ))}

        {/* Safe Places Markers */}
        {(isSafeModeActive || isEmergencyActive) && safePlaces.map((place, index) => (
          <Marker
            key={place.id}
            position={place.position}
            icon={safePlaceIcon(place.hex, activeSafeHavenId === place.id, index === 0)}
            eventHandlers={{
              click: () => setActiveSafeHavenId(place.id)
            }}
          >
            <Popup offset={[0, -5]}>
              <div className="text-[10px] font-bold text-navy-dark text-center">
                {place.name} <br />
                <span className="text-[8px] opacity-70 uppercase tracking-widest">Safe Haven</span>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Pulsing Bezier Beacon & Radar Orbits */}
        {femalePosition && (
          <>
            <Circle
              center={femalePosition}
              radius={25}
              pathOptions={{
                color: isStayWithMeActive ? '#10b981' : '#22d3ee',
                fillColor: isStayWithMeActive ? '#10b981' : '#22d3ee',
                fillOpacity: 0.18,
                weight: 1.5
              }}
            />
            <Circle
              center={femalePosition}
              radius={60}
              pathOptions={{
                color: isStayWithMeActive ? '#10b981' : '#22d3ee',
                fillColor: 'transparent',
                weight: 1,
                dashArray: '4, 8'
              }}
            />
          </>
        )}

        {/* Female User Marker */}
        {femalePosition && (
          <Marker
            position={femalePosition}
            icon={femaleIcon}
            zIndexOffset={10000}
            ref={femaleMarkerRef}
          />
        )}

        {/* Penguin Companion */}
        {(isSafeModeActive || isEmergencyActive || isWalkWithMeActive || isStayWithMeActive) && penguinPosition && (
          <Marker
            position={penguinPosition}
            icon={penguinIcon}
            zIndexOffset={11000}
            ref={penguinMarkerRef}
          />
        )}

        {/* Penguin Speech Bubble with Dynamic Rotating Messages */}
        {(isSafeModeActive || isEmergencyActive || isWalkWithMeActive || isStayWithMeActive) && penguinPosition && (
          <Marker
            position={penguinPosition}
            icon={bubbleIcon}
          />
        )}

        {/* Checkpoints */}
        {checkpoints.map(cp => (
          <Marker
            key={cp.id}
            position={[cp.position.lat, cp.position.lng]}
            icon={customIcon}
            eventHandlers={{
              click: () => setActiveCheckpoint(cp.id),
            }}
          >
            <Popup>
              <div className="text-xs font-bold text-navy-dark">{cp.name}</div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Checkpoint Status Modal overlay */}
      <AnimatePresence>
        {activeCheckpoint && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="absolute bottom-4 left-4 right-4 z-[1000] bg-navy-dark/95 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex flex-col gap-4 shadow-2xl"
          >
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-bold tracking-tight text-white">Are you safe?</h4>
              <span className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Checkpoint</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => { updateCheckpointStatus(activeCheckpoint, 'safe'); setActiveCheckpoint(null); }}
                className="flex flex-col items-center gap-1 p-3 rounded-xl bg-secondary/10 border border-secondary/20 active:scale-95 transition-transform"
              >
                <Check size={18} className="text-secondary" />
                <span className="text-[9px] font-bold uppercase text-secondary">Yes</span>
              </button>
              <button
                onClick={() => { updateCheckpointStatus(activeCheckpoint, 'uncomfortable'); setActiveCheckpoint(null); }}
                className="flex flex-col items-center gap-1 p-3 rounded-xl bg-primary/10 border border-primary/25 active:scale-95 transition-transform"
              >
                <AlertTriangle size={18} className="text-primary" />
                <span className="text-[9px] font-bold uppercase text-primary">Uneasy</span>
              </button>
              <button
                onClick={() => { updateCheckpointStatus(activeCheckpoint, 'unsafe'); setActiveCheckpoint(null); }}
                className="flex flex-col items-center gap-1 p-3 rounded-xl bg-emergency/10 border border-emergency/20 active:scale-95 transition-transform"
              >
                <X size={18} className="text-emergency" />
                <span className="text-[9px] font-bold uppercase text-emergency">No</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute bottom-6 right-6 flex flex-col gap-3 z-[1000]">
        {/* Simulation Tool (Only for testing escort logic in static environment) */}
        {activeSafeHavenId && !hasArrived && (
          <button
            onClick={() => {
              setIsUserMoving(true);

              setTimeout(() => {
                setIsUserMoving(false);
              }, 3000);
            }}
            className="px-4 py-2 rounded-xl bg-primary/20 backdrop-blur-md text-[#E8E6F0] text-[10px] font-black uppercase border border-primary/30 flex items-center gap-2 hover:bg-primary/30 transition-all pointer-events-auto cursor-pointer"
          >
            <Navigation size={12} className="animate-pulse" />
            Simulate Step
          </button>
        )}

        <button
          onClick={() => {
            if (userLocation) {
              setCenter(userLocation);
            }
          }}
          className="w-12 h-12 rounded-2xl bg-[#1A1528]/85 backdrop-blur-md text-[#E8E6F0] flex items-center justify-center border border-white/10 shadow-xl active:scale-95 transition-all hover:bg-[#1A1528] pointer-events-auto cursor-pointer"
        >
          <Navigation size={20} />
        </button>
      </div>

      {/* Floating Unsafe Action Button on Right Edge */}
      <div className="absolute right-[-24px] top-1/2 -translate-y-1/2 z-[1000] flex items-center">
        <AnimatePresence>
          {showOnboarding && !isSafeModeActive && (
            <motion.div
              initial={{ opacity: 0, x: 10, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 10, scale: 0.9 }}
              className="absolute right-16 top-1/2 -translate-y-1/2 pointer-events-none"
            >
              <div className="relative">
                <div className="bg-[#1A1528]/90 backdrop-blur-xl border border-primary/30 px-4 py-2.5 rounded-2xl shadow-[0_0_20px_rgba(106,61,232,0.15)] animate-float whitespace-nowrap">
                  <p className="text-[10px] font-bold text-primary uppercase tracking-widest">
                    Need a safer route? I'll guide you.
                  </p>
                </div>
                {/* Pointer */}
                <div className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-3 h-3 bg-[#1A1528]/90 rotate-45 border-t border-r border-[#6A3DE8]/20"></div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            setIsRouteDrawerOpen(!isRouteDrawerOpen);
            setShowOnboarding(false);
          }}
          className={`
            flex flex-col items-center justify-center w-14 h-32 rounded-3xl backdrop-blur-xl border-2 transition-all duration-500 shadow-2xl pointer-events-auto cursor-pointer
            ${isRouteDrawerOpen
              ? 'bg-[#3BE0B9]/20 border-[#3BE0B9] shadow-[#3BE0B9]/20'
              : 'bg-[#1a1528]/85 border-white/10 hover:border-[#3BE0B9]/40 shadow-xl'}
          `}
        >
          <Shield className={`${isRouteDrawerOpen ? 'text-[#3BE0B9] font-black' : 'text-cyan-400'} mb-2 ${!isRouteDrawerOpen && 'animate-pulse'}`} size={22} />
          <div className={`[writing-mode:vertical-lr] rotate-180 text-[10px] uppercase font-black tracking-[0.3em] ${isRouteDrawerOpen ? 'text-[#3BE0B9]' : 'text-cyan-400'}`}>
            {isRouteDrawerOpen ? 'Open' : 'Safe Route'}
          </div>
        </motion.button>
      </div>
    </div>
  );
}
