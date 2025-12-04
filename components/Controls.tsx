import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ParticleShape } from '../types';
import { ContinuousHandMetrics } from '../services/handMetrics';

interface ControlsProps {
  currentShape: ParticleShape;
  setShape: (shape: ParticleShape) => void;
  color: string;
  setColor: (color: string) => void;
  metrics: ContinuousHandMetrics;
}

export const Controls: React.FC<ControlsProps> = ({
  currentShape,
  setShape,
  color,
  setColor,
  metrics,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [hoveredShape, setHoveredShape] = useState<ParticleShape | null>(null);

  // Dynamic accent color
  const getAccentColor = () => {
    if (!metrics.isPresent) return '#00ffff';
    if (metrics.pinchStrength > 0.5) return '#ff00ff';
    if (metrics.gripStrength > 0.5) return '#ffaa00';
    return '#00ffff';
  };

  const accentColor = getAccentColor();

  // Get status text
  const getStatusText = () => {
    if (!metrics.isPresent) return 'Aguardando...';
    const effects: string[] = [];
    if (metrics.pinchStrength > 0.5) effects.push('Pinça');
    if (metrics.gripStrength > 0.5) effects.push('Garra');
    if (metrics.pointStrength > 0.3) effects.push('Feixe');
    if (metrics.openness < 0.3) effects.push('Fechado');
    if (metrics.openness > 0.8) effects.push('Aberto');
    if (metrics.fingerSpread > 0.6) effects.push('Disperso');
    return effects.length > 0 ? effects.join(' + ') : 'Neutro';
  };

  // Shape icons mapping
  const shapeIcons: Record<ParticleShape, string> = {
    [ParticleShape.SPHERE]: '⬤',
    [ParticleShape.HEART]: '♥',
    [ParticleShape.GALAXY]: '🌀',
    [ParticleShape.FLOWER]: '✿',
    [ParticleShape.ENTITY]: '◈',
  };

  // Preset colors
  const presetColors = [
    { color: '#00ffff', name: 'Cyan' },
    { color: '#ff00ff', name: 'Magenta' },
    { color: '#ffff00', name: 'Amarelo' },
    { color: '#00ff88', name: 'Verde' },
    { color: '#ff4444', name: 'Vermelho' },
    { color: '#ffffff', name: 'Branco' },
  ];

  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none flex flex-col justify-between p-6 z-10">
      {/* Header Section */}
      <header className="pointer-events-auto flex justify-between items-start">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.h1
            className="text-3xl font-extralight tracking-[0.4em] uppercase text-white"
            style={{
              textShadow: `0 0 20px ${accentColor}60`,
              fontFamily: '"Orbitron", "Segoe UI", sans-serif',
            }}
            whileHover={{ scale: 1.02 }}
          >
            Etherial
          </motion.h1>
          <motion.p
            className="text-xs tracking-[0.3em] mt-1"
            style={{ color: `${accentColor}90` }}
          >
            CONTROLE CONTÍNUO
          </motion.p>
        </motion.div>

        {/* Live Status Badge */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <StatusBadge 
            metrics={metrics} 
            accentColor={accentColor}
            statusText={getStatusText()}
          />
        </motion.div>
      </header>

      {/* Energy Ring Visualization (Center) */}
      <EnergyRing metrics={metrics} accentColor={accentColor} />

      {/* Main Control Panel */}
      <motion.div
        className="pointer-events-auto self-center md:self-end"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <motion.div
          className="relative overflow-hidden rounded-2xl backdrop-blur-2xl"
          style={{
            background: 'linear-gradient(135deg, rgba(0, 20, 40, 0.85) 0%, rgba(10, 10, 30, 0.9) 100%)',
            border: `1px solid ${accentColor}30`,
            boxShadow: `0 8px 32px rgba(0, 0, 0, 0.4), 0 0 40px ${accentColor}10`,
            width: isExpanded ? 320 : 200,
          }}
          animate={{
            borderColor: `${accentColor}30`,
            boxShadow: `0 8px 32px rgba(0, 0, 0, 0.4), 0 0 40px ${accentColor}10`,
          }}
          layout
        >
          {/* Panel Header */}
          <div 
            className="flex items-center justify-between px-4 py-3 cursor-pointer"
            onClick={() => setIsExpanded(!isExpanded)}
            style={{ borderBottom: `1px solid ${accentColor}20` }}
          >
            <div className="flex items-center gap-2">
              <motion.div
                className="w-2 h-2 rounded-full"
                style={{ background: accentColor }}
                animate={{
                  boxShadow: [`0 0 5px ${accentColor}`, `0 0 15px ${accentColor}`, `0 0 5px ${accentColor}`],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span className="text-xs font-medium tracking-wider" style={{ color: accentColor }}>
                CONTROLES
              </span>
            </div>
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 6l4 4 4-4" stroke={accentColor} strokeWidth="2" strokeLinecap="round" />
              </svg>
            </motion.div>
          </div>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="p-4 space-y-4">
                  {/* Shape Selector */}
                  <div className="space-y-2">
                    <label className="block text-xs font-medium tracking-wider" style={{ color: `${accentColor}90` }}>
                      FORMA
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                      {Object.values(ParticleShape).map((shape) => (
                        <ShapeButton
                          key={shape}
                          shape={shape}
                          icon={shapeIcons[shape]}
                          isSelected={currentShape === shape}
                          isHovered={hoveredShape === shape}
                          onSelect={() => setShape(shape)}
                          onHover={() => setHoveredShape(shape)}
                          onLeave={() => setHoveredShape(null)}
                          accentColor={accentColor}
                        />
                      ))}
                    </div>
                    {/* Shape name tooltip */}
                    <AnimatePresence>
                      {hoveredShape && (
                        <motion.p
                          className="text-center text-[10px] tracking-wider"
                          style={{ color: accentColor }}
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                        >
                          {hoveredShape}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Color Selector */}
                  <div className="space-y-2">
                    <label className="block text-xs font-medium tracking-wider" style={{ color: `${accentColor}90` }}>
                      COR
                    </label>
                    <div className="flex items-center gap-3">
                      {/* Color wheel button */}
                      <motion.div
                        className="relative"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <input
                          type="color"
                          value={color}
                          onChange={(e) => setColor(e.target.value)}
                          className="w-10 h-10 rounded-full cursor-pointer opacity-0 absolute inset-0 z-10"
                        />
                        <div
                          className="w-10 h-10 rounded-full border-2"
                          style={{
                            background: `conic-gradient(red, yellow, lime, aqua, blue, magenta, red)`,
                            borderColor: color,
                            boxShadow: `0 0 15px ${color}50`,
                          }}
                        />
                      </motion.div>

                      {/* Preset colors */}
                      <div className="flex gap-1.5 flex-1">
                        {presetColors.map((preset) => (
                          <ColorButton
                            key={preset.color}
                            color={preset.color}
                            isSelected={color === preset.color}
                            onSelect={() => setColor(preset.color)}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Live Metrics (when hand present) */}
                  <AnimatePresence>
                    {metrics.isPresent && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-3 border-t" style={{ borderColor: `${accentColor}20` }}>
                          <label className="block text-xs font-medium tracking-wider mb-2" style={{ color: `${accentColor}90` }}>
                            MÉTRICAS
                          </label>
                          <div className="space-y-2">
                            <AnimatedMeter label="Abertura" value={metrics.openness} color="#00ffff" />
                            <AnimatedMeter label="Pinça" value={metrics.pinchStrength} color="#ff00ff" />
                            <AnimatedMeter label="Garra" value={metrics.gripStrength} color="#ffaa00" />
                            <AnimatedMeter label="Energia" value={metrics.energy} color="#ffff00" />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Footer Status */}
                  <div 
                    className="pt-3 border-t text-center"
                    style={{ borderColor: `${accentColor}10` }}
                  >
                    <motion.p
                      className="text-[10px] tracking-wider"
                      style={{ color: 'rgba(255,255,255,0.4)' }}
                      animate={{ opacity: [0.4, 0.7, 0.4] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      {metrics.isPresent 
                        ? `ƒs­ ${Math.round(metrics.expressiveness * 100)}% expressividade`
                        : 'Mostre sua mao'}
                    </motion.p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </div>
  );
};

// Status Badge Component
const StatusBadge: React.FC<{
  metrics: ContinuousHandMetrics;
  accentColor: string;
  statusText: string;
}> = ({ metrics, accentColor, statusText }) => (
  <motion.div
    className="flex items-center gap-3 px-4 py-2 rounded-full backdrop-blur-xl"
    style={{
      background: `${accentColor}15`,
      border: `1px solid ${accentColor}40`,
      boxShadow: metrics.isPresent ? `0 0 20px ${accentColor}30` : 'none',
    }}
    animate={{
      borderColor: `${accentColor}40`,
      boxShadow: metrics.isPresent ? `0 0 20px ${accentColor}30` : 'none',
    }}
  >
    {/* Mini metric dots */}
    <div className="flex gap-1">
      {[
        { value: metrics.openness, color: '#00ffff' },
        { value: metrics.pinchStrength, color: '#ff00ff' },
        { value: metrics.gripStrength, color: '#ffaa00' },
        { value: metrics.energy, color: '#ffff00' },
      ].map((m, i) => (
        <motion.div
          key={i}
          className="w-3 h-3 rounded-full"
          style={{
            background: m.color,
            opacity: 0.3 + m.value * 0.7,
          }}
          animate={{
            boxShadow: m.value > 0.5 ? `0 0 8px ${m.color}` : 'none',
            scale: m.value > 0.7 ? [1, 1.2, 1] : 1,
          }}
          transition={{ duration: 0.5 }}
        />
      ))}
    </div>
    
    <div className="flex flex-col">
      <motion.span
        className="text-sm font-bold tracking-wider"
        style={{ color: accentColor }}
        key={statusText}
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {statusText.toUpperCase()}
      </motion.span>
      <span className="text-[10px] text-white/50">
        {metrics.isPresent ? `${Math.round(metrics.confidence * 100)}% confiança` : 'Offline'}
      </span>
    </div>
  </motion.div>
);

// Energy Ring Component
const EnergyRing: React.FC<{
  metrics: ContinuousHandMetrics;
  accentColor: string;
}> = ({ metrics, accentColor }) => {
  const showRing = metrics.isPresent && metrics.expressiveness > 0.2;

  return (
    <motion.div
      className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
      animate={{ opacity: showRing ? 1 : 0 }}
      transition={{ duration: 0.5 }}
    >
      <svg width="200" height="200" className="animate-spin-slow">
        <defs>
          <linearGradient id="energyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={accentColor} />
            <stop offset="50%" stopColor="#00ffff" />
            <stop offset="100%" stopColor="#ff00ff" />
          </linearGradient>
        </defs>

        {/* Outer ring - openness */}
        <circle cx="100" cy="100" r="95" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
        <motion.circle
          cx="100" cy="100" r="95"
          fill="none"
          stroke="url(#energyGradient)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={597}
          animate={{ strokeDashoffset: 597 * (1 - metrics.openness) }}
          transition={{ duration: 0.2 }}
          style={{ filter: `drop-shadow(0 0 5px ${accentColor})` }}
        />

        {/* Inner ring - energy */}
        <circle cx="100" cy="100" r="80" fill="none" stroke="rgba(255,255,0,0.1)" strokeWidth="3" />
        <motion.circle
          cx="100" cy="100" r="80"
          fill="none"
          stroke="#ffff00"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={502}
          animate={{ strokeDashoffset: 502 * (1 - metrics.energy) }}
          transition={{ duration: 0.2 }}
          style={{ filter: 'drop-shadow(0 0 5px #ffff00)' }}
        />
      </svg>
    </motion.div>
  );
};

// Shape Button Component
const ShapeButton: React.FC<{
  shape: ParticleShape;
  icon: string;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: () => void;
  onHover: () => void;
  onLeave: () => void;
  accentColor: string;
}> = ({ shape, icon, isSelected, isHovered, onSelect, onHover, onLeave, accentColor }) => (
  <motion.button
    onClick={onSelect}
    onMouseEnter={onHover}
    onMouseLeave={onLeave}
    className="aspect-square rounded-xl flex items-center justify-center text-lg relative overflow-hidden"
    style={{
      background: isSelected 
        ? `linear-gradient(135deg, ${accentColor}30 0%, ${accentColor}20 100%)`
        : 'rgba(255,255,255,0.05)',
      border: `1px solid ${isSelected ? accentColor : 'rgba(255,255,255,0.1)'}`,
      boxShadow: isSelected ? `0 0 15px ${accentColor}30` : 'none',
    }}
    whileHover={{ 
      scale: 1.1, 
      background: `linear-gradient(135deg, ${accentColor}20 0%, ${accentColor}10 100%)`,
    }}
    whileTap={{ scale: 0.95 }}
  >
    <motion.span
      animate={{
        scale: isSelected ? [1, 1.1, 1] : 1,
        filter: isSelected ? `drop-shadow(0 0 4px ${accentColor})` : 'none',
      }}
      transition={{ duration: 0.5, repeat: isSelected ? Infinity : 0 }}
    >
      {icon}
    </motion.span>
  </motion.button>
);

// Color Button Component
const ColorButton: React.FC<{
  color: string;
  isSelected: boolean;
  onSelect: () => void;
}> = ({ color, isSelected, onSelect }) => (
  <motion.button
    onClick={onSelect}
    className="w-7 h-7 rounded-full"
    style={{
      background: color,
      border: isSelected ? '2px solid white' : '2px solid transparent',
      boxShadow: isSelected ? `0 0 15px ${color}` : 'none',
    }}
    whileHover={{ scale: 1.2, boxShadow: `0 0 15px ${color}80` }}
    whileTap={{ scale: 0.9 }}
  />
);

// Animated Meter Component
const AnimatedMeter: React.FC<{
  label: string;
  value: number;
  color: string;
}> = ({ label, value, color }) => (
  <div className="flex items-center gap-2">
    <span className="text-[9px] text-white/50 w-14 truncate">{label}</span>
    <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden relative">
      <motion.div
        className="h-full rounded-full relative"
        style={{
          background: `linear-gradient(90deg, ${color}80, ${color})`,
          boxShadow: value > 0.3 ? `0 0 10px ${color}` : 'none',
        }}
        initial={{ width: 0 }}
        animate={{ width: `${value * 100}%` }}
        transition={{ duration: 0.15 }}
      >
        {/* Shimmer effect */}
        {value > 0.3 && (
          <motion.div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)`,
            }}
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
      </motion.div>
      
      {/* Floating particles inside bar */}
      {value > 0.5 && (
        <>
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full"
              style={{
                background: 'white',
                top: '50%',
                transform: 'translateY(-50%)',
              }}
              animate={{
                left: [`${i * 30}%`, `${i * 30 + 20}%`, `${i * 30}%`],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 1,
                delay: i * 0.3,
                repeat: Infinity,
              }}
            />
          ))}
        </>
      )}
    </div>
    <span 
      className="text-[9px] w-8 text-right font-mono"
      style={{ color: value > 0.5 ? color : 'rgba(255,255,255,0.4)' }}
    >
      {Math.round(value * 100)}%
    </span>
  </div>
);

export default Controls;
