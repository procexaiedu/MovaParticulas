import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ContinuousHandMetrics } from '../services/handMetrics';

interface VisualFeedbackProps {
  metrics: ContinuousHandMetrics;
}

export const VisualFeedback: React.FC<VisualFeedbackProps> = ({ metrics }) => {
  return (
    <div className="fixed inset-0 pointer-events-none z-30 overflow-hidden">
      {/* Screen Edge Glow */}
      <EdgeGlow metrics={metrics} />
      
      {/* Corner Status Indicators */}
      <CornerIndicators metrics={metrics} />
      
      {/* Central Pulse Rings */}
      <PulseRings metrics={metrics} />
      
      {/* Dynamic Vignette */}
      <DynamicVignette metrics={metrics} />
    </div>
  );
};

// Screen Edge Glow based on dominant metric
const EdgeGlow: React.FC<{ metrics: ContinuousHandMetrics }> = ({ metrics }) => {
  if (!metrics.isPresent) return null;

  const getDominantColor = () => {
    if (metrics.pinchStrength > 0.6) return { color: '#ff00ff', name: 'pinch' };
    if (metrics.gripStrength > 0.6) return { color: '#ffaa00', name: 'grip' };
    if (metrics.pointStrength > 0.4) return { color: '#ff4444', name: 'point' };
    if (metrics.fingerSpread > 0.6) return { color: '#00ff88', name: 'spread' };
    if (metrics.energy > 0.7) return { color: '#ffff00', name: 'energy' };
    return { color: '#00ffff', name: 'default' };
  };

  const { color } = getDominantColor();
  const intensity = Math.max(
    metrics.pinchStrength,
    metrics.gripStrength,
    metrics.energy,
    metrics.expressiveness
  ) * 0.4;

  return (
    <>
      {/* Top edge */}
      <motion.div
        className="absolute top-0 left-0 right-0 h-32"
        style={{
          background: `linear-gradient(to bottom, ${color}${Math.round(intensity * 255).toString(16).padStart(2, '0')}, transparent)`,
        }}
        animate={{ opacity: intensity }}
        transition={{ duration: 0.3 }}
      />
      
      {/* Bottom edge */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-32"
        style={{
          background: `linear-gradient(to top, ${color}${Math.round(intensity * 255).toString(16).padStart(2, '0')}, transparent)`,
        }}
        animate={{ opacity: intensity }}
        transition={{ duration: 0.3 }}
      />
      
      {/* Left edge */}
      <motion.div
        className="absolute top-0 bottom-0 left-0 w-32"
        style={{
          background: `linear-gradient(to right, ${color}${Math.round(intensity * 255).toString(16).padStart(2, '0')}, transparent)`,
        }}
        animate={{ opacity: intensity * 0.7 }}
        transition={{ duration: 0.3 }}
      />
      
      {/* Right edge */}
      <motion.div
        className="absolute top-0 bottom-0 right-0 w-32"
        style={{
          background: `linear-gradient(to left, ${color}${Math.round(intensity * 255).toString(16).padStart(2, '0')}, transparent)`,
        }}
        animate={{ opacity: intensity * 0.7 }}
        transition={{ duration: 0.3 }}
      />
    </>
  );
};

// Corner Status Indicators
const CornerIndicators: React.FC<{ metrics: ContinuousHandMetrics }> = ({ metrics }) => {
  const indicators = [
    {
      label: 'ABR',
      value: metrics.openness,
      color: '#00ffff',
      position: 'top-4 left-4',
    },
    {
      label: 'PIN',
      value: metrics.pinchStrength,
      color: '#ff00ff',
      position: 'top-4 right-4',
    },
    {
      label: 'GAR',
      value: metrics.gripStrength,
      color: '#ffaa00',
      position: 'bottom-4 right-4',
    },
    {
      label: 'ENE',
      value: metrics.energy,
      color: '#ffff00',
      position: 'bottom-4 left-4',
    },
  ];

  return (
    <>
      {indicators.map((ind, i) => (
        <motion.div
          key={i}
          className={`absolute ${ind.position} flex items-center gap-2`}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ 
            opacity: metrics.isPresent ? 0.8 : 0.3,
            scale: metrics.isPresent ? 1 : 0.9,
          }}
          transition={{ duration: 0.3 }}
        >
          {/* Mini arc indicator */}
          <svg width="32" height="32" className="transform -rotate-90">
            <circle
              cx="16"
              cy="16"
              r="12"
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="3"
            />
            <motion.circle
              cx="16"
              cy="16"
              r="12"
              fill="none"
              stroke={ind.color}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={75.4}
              initial={{ strokeDashoffset: 75.4 }}
              animate={{ strokeDashoffset: 75.4 * (1 - ind.value) }}
              transition={{ duration: 0.2 }}
              style={{
                filter: ind.value > 0.5 ? `drop-shadow(0 0 4px ${ind.color})` : 'none',
              }}
            />
          </svg>
          
          <div className="flex flex-col">
            <span 
              className="text-[8px] font-mono tracking-wider"
              style={{ color: ind.color }}
            >
              {ind.label}
            </span>
            <span className="text-[10px] font-mono text-white/60">
              {Math.round(ind.value * 100)}%
            </span>
          </div>
        </motion.div>
      ))}
    </>
  );
};

// Central Pulse Rings (when actions detected)
const PulseRings: React.FC<{ metrics: ContinuousHandMetrics }> = ({ metrics }) => {
  const [rings, setRings] = useState<Array<{ id: number; color: string }>>([]);
  const [lastTrigger, setLastTrigger] = useState(0);

  useEffect(() => {
    if (!metrics.isPresent) return;
    
    const now = Date.now();
    if (now - lastTrigger < 500) return; // Debounce

    // Trigger ring on high expressiveness or significant action
    if (metrics.expressiveness > 0.7 || metrics.energy > 0.85) {
      const color = metrics.energy > 0.85 ? '#ffff00' : '#00ffff';
      const newRing = { id: now, color };
      setRings(prev => [...prev, newRing]);
      setLastTrigger(now);

      setTimeout(() => {
        setRings(prev => prev.filter(r => r.id !== now));
      }, 1500);
    }
  }, [metrics.expressiveness, metrics.energy, metrics.isPresent, lastTrigger]);

  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
      <AnimatePresence>
        {rings.map((ring) => (
          <motion.div
            key={ring.id}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              border: `1px solid ${ring.color}`,
              boxShadow: `0 0 20px ${ring.color}40`,
            }}
            initial={{ width: 50, height: 50, opacity: 0.8 }}
            animate={{ width: 400, height: 400, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

// Dynamic Vignette
const DynamicVignette: React.FC<{ metrics: ContinuousHandMetrics }> = ({ metrics }) => {
  const intensity = metrics.isPresent 
    ? 0.3 + metrics.expressiveness * 0.3 + metrics.tension * 0.2
    : 0.4;

  return (
    <motion.div
      className="absolute inset-0 pointer-events-none"
      style={{
        background: `radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,${intensity}) 100%)`,
      }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    />
  );
};

export default VisualFeedback;


