import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ContinuousHandMetrics } from '../services/handMetrics';

interface GestureOverlayProps {
  metrics: ContinuousHandMetrics;
}

interface GestureEvent {
  id: string;
  type: 'pinch' | 'grip' | 'spread' | 'point' | 'wave' | 'energy';
  name: string;
  icon: string;
  color: string;
  position: { x: number; y: number };
  timestamp: number;
}

export const GestureOverlay: React.FC<GestureOverlayProps> = ({ metrics }) => {
  const [gestureEvents, setGestureEvents] = useState<GestureEvent[]>([]);
  const [lastStates, setLastStates] = useState({
    pinch: false,
    grip: false,
    spread: false,
    point: false,
    highEnergy: false,
  });

  const addGestureEvent = useCallback((
    type: GestureEvent['type'],
    name: string,
    icon: string,
    color: string
  ) => {
    const event: GestureEvent = {
      id: `${type}-${Date.now()}`,
      type,
      name,
      icon,
      color,
      position: {
        x: 50 + metrics.position.x * 30,
        y: 50 - metrics.position.y * 30,
      },
      timestamp: Date.now(),
    };
    setGestureEvents(prev => [...prev, event]);

    // Remove after animation
    setTimeout(() => {
      setGestureEvents(prev => prev.filter(e => e.id !== event.id));
    }, 1500);
  }, [metrics.position.x, metrics.position.y]);

  // Detect gesture transitions
  useEffect(() => {
    if (!metrics.isPresent) return;

    const newStates = {
      pinch: metrics.pinchStrength > 0.7,
      grip: metrics.gripStrength > 0.7,
      spread: metrics.fingerSpread > 0.7,
      point: metrics.pointStrength > 0.5,
      highEnergy: metrics.energy > 0.8,
    };

    // Trigger events on state changes
    if (newStates.pinch && !lastStates.pinch) {
      addGestureEvent('pinch', 'PINÇA', '🤏', '#ff00ff');
    }
    if (newStates.grip && !lastStates.grip) {
      addGestureEvent('grip', 'GARRA', '✊', '#ffaa00');
    }
    if (newStates.spread && !lastStates.spread) {
      addGestureEvent('spread', 'DISPERSÃO', '🖐️', '#00ff88');
    }
    if (newStates.point && !lastStates.point) {
      addGestureEvent('point', 'FEIXE', '👆', '#ff4444');
    }
    if (newStates.highEnergy && !lastStates.highEnergy) {
      addGestureEvent('energy', 'ENERGIA', '⚡', '#ffff00');
    }

    setLastStates(newStates);
  }, [
    metrics.isPresent,
    metrics.pinchStrength,
    metrics.gripStrength,
    metrics.fingerSpread,
    metrics.pointStrength,
    metrics.energy,
    lastStates,
    addGestureEvent,
  ]);

  return (
    <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
      <AnimatePresence>
        {gestureEvents.map((event) => (
          <GestureEventDisplay key={event.id} event={event} />
        ))}
      </AnimatePresence>

      {/* Ambient glow based on active metrics */}
      <AmbientGlow metrics={metrics} />
      
      {/* Energy burst effect */}
      <EnergyBurst metrics={metrics} />
    </div>
  );
};

// Individual Gesture Event Display
const GestureEventDisplay: React.FC<{ event: GestureEvent }> = ({ event }) => {
  const particles = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    angle: (i / 12) * Math.PI * 2,
    distance: 40 + Math.random() * 30,
  }));

  return (
    <motion.div
      className="absolute"
      style={{
        left: `${event.position.x}%`,
        top: `${event.position.y}%`,
        transform: 'translate(-50%, -50%)',
      }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5 }}
      transition={{ duration: 0.3 }}
    >
      {/* Central Icon */}
      <motion.div
        className="relative flex items-center justify-center"
        initial={{ rotate: -180, scale: 0 }}
        animate={{ rotate: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      >
        {/* Glow background */}
        <motion.div
          className="absolute w-24 h-24 rounded-full"
          style={{
            background: `radial-gradient(circle, ${event.color}40 0%, transparent 70%)`,
          }}
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.8, 0.4, 0.8],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
          }}
        />

        {/* Icon */}
        <motion.span
          className="text-4xl relative z-10"
          style={{
            filter: `drop-shadow(0 0 10px ${event.color})`,
          }}
          animate={{
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 0.5,
            repeat: 2,
          }}
        >
          {event.icon}
        </motion.span>
      </motion.div>

      {/* Gesture Name */}
      <motion.div
        className="absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <span
          className="text-xs font-bold tracking-widest px-3 py-1 rounded-full"
          style={{
            background: `${event.color}20`,
            color: event.color,
            border: `1px solid ${event.color}50`,
            boxShadow: `0 0 20px ${event.color}30`,
          }}
        >
          {event.name}
        </span>
      </motion.div>

      {/* Expanding Ring */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
        style={{ border: `2px solid ${event.color}` }}
        initial={{ width: 20, height: 20, opacity: 1 }}
        animate={{ width: 150, height: 150, opacity: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />

      {/* Secondary Ring */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
        style={{ border: `1px solid ${event.color}` }}
        initial={{ width: 20, height: 20, opacity: 0.5 }}
        animate={{ width: 200, height: 200, opacity: 0 }}
        transition={{ duration: 1, ease: 'easeOut', delay: 0.1 }}
      />

      {/* Particle Burst */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full"
          style={{
            background: event.color,
            boxShadow: `0 0 6px ${event.color}`,
          }}
          initial={{ x: 0, y: 0, opacity: 1 }}
          animate={{
            x: Math.cos(p.angle) * p.distance,
            y: Math.sin(p.angle) * p.distance,
            opacity: 0,
            scale: 0,
          }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      ))}
    </motion.div>
  );
};

// Ambient Glow Effect
const AmbientGlow: React.FC<{ metrics: ContinuousHandMetrics }> = ({ metrics }) => {
  if (!metrics.isPresent) return null;

  // Determine dominant color based on metrics
  const getGlowColor = () => {
    if (metrics.pinchStrength > 0.5) return '#ff00ff';
    if (metrics.gripStrength > 0.5) return '#ffaa00';
    if (metrics.pointStrength > 0.3) return '#ff4444';
    if (metrics.fingerSpread > 0.5) return '#00ff88';
    return '#00ffff';
  };

  const intensity = Math.max(
    metrics.pinchStrength,
    metrics.gripStrength,
    metrics.energy,
    metrics.expressiveness
  );

  return (
    <motion.div
      className="absolute inset-0 pointer-events-none"
      style={{
        background: `radial-gradient(ellipse at ${50 + metrics.position.x * 30}% ${50 - metrics.position.y * 30}%, ${getGlowColor()}15 0%, transparent 50%)`,
      }}
      animate={{
        opacity: intensity * 0.8,
      }}
      transition={{ duration: 0.3 }}
    />
  );
};

// Energy Burst Effect (when energy is high)
const EnergyBurst: React.FC<{ metrics: ContinuousHandMetrics }> = ({ metrics }) => {
  const [showBurst, setShowBurst] = useState(false);

  useEffect(() => {
    if (metrics.energy > 0.9 && !showBurst) {
      setShowBurst(true);
      setTimeout(() => setShowBurst(false), 500);
    }
  }, [metrics.energy, showBurst]);

  return (
    <AnimatePresence>
      {showBurst && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Central flash */}
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full"
            style={{
              background: '#ffff00',
              boxShadow: '0 0 100px 50px rgba(255, 255, 0, 0.5)',
            }}
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 20, opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />

          {/* Screen flash */}
          <motion.div
            className="absolute inset-0"
            style={{ background: 'rgba(255, 255, 0, 0.1)' }}
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default GestureOverlay;


