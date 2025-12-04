import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ContinuousHandMetrics } from '../services/handMetrics';

interface CursorEffectsProps {
  metrics: ContinuousHandMetrics;
  simulationMode: boolean;
}

interface TrailPoint {
  id: number;
  x: number;
  y: number;
  timestamp: number;
  velocity: number;
}

interface ClickBurst {
  id: number;
  x: number;
  y: number;
  type: 'left' | 'right';
}

export const CursorEffects: React.FC<CursorEffectsProps> = ({ metrics, simulationMode }) => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [trail, setTrail] = useState<TrailPoint[]>([]);
  const [clickBursts, setClickBursts] = useState<ClickBurst[]>([]);
  const [isPressed, setIsPressed] = useState({ left: false, right: false });
  const trailIdRef = useRef(0);
  const burstIdRef = useRef(0);
  const lastPosRef = useRef({ x: 0, y: 0 });

  // Track mouse position
  useEffect(() => {
    if (!simulationMode) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - lastPosRef.current.x;
      const dy = e.clientY - lastPosRef.current.y;
      const velocity = Math.sqrt(dx * dx + dy * dy);
      
      setMousePos({ x: e.clientX, y: e.clientY });

      // Add trail point
      if (velocity > 2) {
        const newPoint: TrailPoint = {
          id: trailIdRef.current++,
          x: e.clientX,
          y: e.clientY,
          timestamp: Date.now(),
          velocity: Math.min(velocity, 50),
        };
        setTrail(prev => [...prev.slice(-30), newPoint]);
      }

      lastPosRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        setIsPressed(prev => ({ ...prev, left: true }));
        addClickBurst(e.clientX, e.clientY, 'left');
      }
      if (e.button === 2) {
        setIsPressed(prev => ({ ...prev, right: true }));
        addClickBurst(e.clientX, e.clientY, 'right');
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) setIsPressed(prev => ({ ...prev, left: false }));
      if (e.button === 2) setIsPressed(prev => ({ ...prev, right: false }));
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [simulationMode]);

  // Clean up old trail points
  useEffect(() => {
    if (!simulationMode) return;

    const interval = setInterval(() => {
      const now = Date.now();
      setTrail(prev => prev.filter(p => now - p.timestamp < 400));
    }, 50);

    return () => clearInterval(interval);
  }, [simulationMode]);

  const addClickBurst = useCallback((x: number, y: number, type: 'left' | 'right') => {
    const burst: ClickBurst = {
      id: burstIdRef.current++,
      x,
      y,
      type,
    };
    setClickBursts(prev => [...prev, burst]);
    setTimeout(() => {
      setClickBursts(prev => prev.filter(b => b.id !== burst.id));
    }, 800);
  }, []);

  if (!simulationMode || !metrics.isPresent) return null;

  // Get color based on current action
  const getTrailColor = () => {
    if (metrics.pinchStrength > 0.5) return '#ff00ff';
    if (metrics.gripStrength > 0.5) return '#ffaa00';
    return '#00ffff';
  };

  const trailColor = getTrailColor();

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {/* Trail particles */}
      {trail.map((point, index) => {
        const age = Date.now() - point.timestamp;
        const opacity = Math.max(0, 1 - age / 400);
        const scale = 0.3 + (point.velocity / 50) * 0.7;
        
        return (
          <motion.div
            key={point.id}
            className="absolute rounded-full"
            style={{
              left: point.x,
              top: point.y,
              width: 8 * scale,
              height: 8 * scale,
              background: trailColor,
              boxShadow: `0 0 ${10 * scale}px ${trailColor}`,
              opacity,
              transform: 'translate(-50%, -50%)',
            }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
          />
        );
      })}

      {/* Cursor glow ring */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          left: mousePos.x,
          top: mousePos.y,
          transform: 'translate(-50%, -50%)',
        }}
        animate={{
          width: isPressed.left || isPressed.right ? 60 : 40,
          height: isPressed.left || isPressed.right ? 60 : 40,
          borderColor: isPressed.left ? '#ff00ff' : isPressed.right ? '#ffaa00' : trailColor,
          boxShadow: `0 0 ${isPressed.left || isPressed.right ? 30 : 15}px ${isPressed.left ? '#ff00ff' : isPressed.right ? '#ffaa00' : trailColor}`,
        }}
        transition={{ duration: 0.15 }}
      >
        <div
          className="w-full h-full rounded-full border-2 opacity-60"
          style={{ borderColor: 'inherit' }}
        />
      </motion.div>

      {/* Inner cursor dot */}
      <motion.div
        className="absolute rounded-full"
        style={{
          left: mousePos.x,
          top: mousePos.y,
          width: 8,
          height: 8,
          background: trailColor,
          transform: 'translate(-50%, -50%)',
          boxShadow: `0 0 10px ${trailColor}`,
        }}
        animate={{
          scale: isPressed.left || isPressed.right ? 0.5 : 1,
        }}
        transition={{ duration: 0.1 }}
      />

      {/* Orbiting particles when active */}
      {metrics.expressiveness > 0.3 && (
        <OrbitingParticles
          x={mousePos.x}
          y={mousePos.y}
          color={trailColor}
          count={Math.floor(metrics.expressiveness * 6)}
        />
      )}

      {/* Click burst effects */}
      <AnimatePresence>
        {clickBursts.map(burst => (
          <ClickBurstEffect key={burst.id} burst={burst} />
        ))}
      </AnimatePresence>

      {/* Energy aura when high energy */}
      {metrics.energy > 0.6 && (
        <motion.div
          className="absolute rounded-full"
          style={{
            left: mousePos.x,
            top: mousePos.y,
            transform: 'translate(-50%, -50%)',
            background: `radial-gradient(circle, ${trailColor}30 0%, transparent 70%)`,
          }}
          animate={{
            width: [80, 100, 80],
            height: [80, 100, 80],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 0.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}
    </div>
  );
};

// Orbiting particles around cursor
const OrbitingParticles: React.FC<{
  x: number;
  y: number;
  color: string;
  count: number;
}> = ({ x, y, color, count }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full"
          style={{
            left: x,
            top: y,
            background: color,
            boxShadow: `0 0 6px ${color}`,
          }}
          animate={{
            x: [
              Math.cos((i / count) * Math.PI * 2) * 25,
              Math.cos((i / count) * Math.PI * 2 + Math.PI) * 25,
              Math.cos((i / count) * Math.PI * 2) * 25,
            ],
            y: [
              Math.sin((i / count) * Math.PI * 2) * 25,
              Math.sin((i / count) * Math.PI * 2 + Math.PI) * 25,
              Math.sin((i / count) * Math.PI * 2) * 25,
            ],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      ))}
    </>
  );
};

// Click burst effect
const ClickBurstEffect: React.FC<{ burst: ClickBurst }> = ({ burst }) => {
  const color = burst.type === 'left' ? '#ff00ff' : '#ffaa00';
  const particles = Array.from({ length: 16 }, (_, i) => ({
    angle: (i / 16) * Math.PI * 2,
    distance: 30 + Math.random() * 40,
    size: 3 + Math.random() * 4,
  }));

  return (
    <motion.div
      className="absolute"
      style={{
        left: burst.x,
        top: burst.y,
      }}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Expanding rings */}
      {[0, 1, 2].map((ring) => (
        <motion.div
          key={ring}
          className="absolute rounded-full"
          style={{
            left: 0,
            top: 0,
            transform: 'translate(-50%, -50%)',
            border: `${2 - ring * 0.5}px solid ${color}`,
          }}
          initial={{ width: 10, height: 10, opacity: 0.8 }}
          animate={{
            width: 100 + ring * 30,
            height: 100 + ring * 30,
            opacity: 0,
          }}
          transition={{
            duration: 0.6,
            delay: ring * 0.1,
            ease: 'easeOut',
          }}
        />
      ))}

      {/* Particle burst */}
      {particles.map((p, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            left: 0,
            top: 0,
            width: p.size,
            height: p.size,
            background: color,
            boxShadow: `0 0 8px ${color}`,
            transform: 'translate(-50%, -50%)',
          }}
          initial={{ x: 0, y: 0, opacity: 1 }}
          animate={{
            x: Math.cos(p.angle) * p.distance,
            y: Math.sin(p.angle) * p.distance,
            opacity: 0,
            scale: 0,
          }}
          transition={{
            duration: 0.5,
            ease: 'easeOut',
          }}
        />
      ))}

      {/* Central flash */}
      <motion.div
        className="absolute rounded-full"
        style={{
          left: 0,
          top: 0,
          transform: 'translate(-50%, -50%)',
          background: color,
          boxShadow: `0 0 30px ${color}`,
        }}
        initial={{ width: 20, height: 20, opacity: 1 }}
        animate={{ width: 5, height: 5, opacity: 0 }}
        transition={{ duration: 0.3 }}
      />
    </motion.div>
  );
};

export default CursorEffects;


