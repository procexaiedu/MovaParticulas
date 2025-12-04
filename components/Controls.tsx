import React from 'react';
import { ParticleShape } from '../types';
import { ContinuousHandMetrics } from '../services/handMetrics';

interface ControlsProps {
  currentShape: ParticleShape;
  setShape: (shape: ParticleShape) => void;
  color: string;
  setColor: (color: string) => void;
  metrics: ContinuousHandMetrics;
  simulationMode: boolean;
  setSimulationMode: (mode: boolean) => void;
}

export const Controls: React.FC<ControlsProps> = ({
  currentShape,
  setShape,
  color,
  setColor,
  metrics,
  simulationMode,
  setSimulationMode,
}) => {
  const m = metrics;
  
  // Dynamic status based on metrics
  const getStatusText = () => {
    if (!m.isPresent) return 'Aguardando mão...';
    
    const effects: string[] = [];
    if (m.pinchStrength > 0.5) effects.push('Pinça');
    if (m.gripStrength > 0.5) effects.push('Garra');
    if (m.pointStrength > 0.3) effects.push('Apontando');
    if (m.openness < 0.3) effects.push('Fechado');
    if (m.openness > 0.8) effects.push('Aberto');
    if (m.fingerSpread > 0.6) effects.push('Disperso');
    
    if (effects.length === 0) return 'Neutro';
    return effects.join(' + ');
  };

  // Color based on primary metric
  const getAccentColor = () => {
    if (!m.isPresent) return '#00ffff';
    
    // Blend between cyan (open) and magenta (pinch/grip)
    const intensity = Math.max(m.pinchStrength, m.gripStrength);
    const hue = 180 - intensity * 120; // 180 (cyan) to 60 (yellow-ish) to 300 (magenta)
    return `hsl(${180 - m.pinchStrength * 60 + m.gripStrength * 60}, 100%, 60%)`;
  };

  const accentColor = getAccentColor();

  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none flex flex-col justify-between p-6 z-10">
      
      {/* Header */}
      <header className="pointer-events-auto flex justify-between items-start">
        <div>
          <h1 className="text-white text-3xl font-light tracking-widest uppercase opacity-90 drop-shadow-lg">
            Etherial
          </h1>
          <p className="text-cyan-300 text-xs tracking-wider opacity-70 mt-1">
            Controle Contínuo de Partículas
          </p>
        </div>
        
        {/* Live Status Badge */}
        <div 
          className={`transition-all duration-500 ${m.isPresent ? 'opacity-100' : 'opacity-50'}`}
        >
          <div 
            className="flex items-center space-x-3 px-4 py-2 rounded-full border backdrop-blur-md"
            style={{ 
              backgroundColor: `${accentColor}15`,
              borderColor: `${accentColor}40`,
              boxShadow: m.isPresent ? `0 0 20px ${accentColor}30` : 'none'
            }}
          >
            {/* Mini metric visualizers */}
            <div className="flex space-x-1">
              <MetricDot label="A" value={m.openness} color="#00ffff" />
              <MetricDot label="P" value={m.pinchStrength} color="#ff00ff" />
              <MetricDot label="G" value={m.gripStrength} color="#ffaa00" />
              <MetricDot label="E" value={m.energy} color="#ffff00" />
            </div>
            
            <div className="flex flex-col">
              <span 
                className="text-sm font-bold tracking-wider"
                style={{ color: accentColor }}
              >
                {getStatusText().toUpperCase()}
              </span>
              <span className="text-[10px] text-white/60">
                {m.isPresent ? `Expressividade: ${Math.round(m.expressiveness * 100)}%` : 'Offline'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Central Energy Ring */}
      <div 
        className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
                    transition-opacity duration-500 pointer-events-none 
                    ${m.isPresent && m.expressiveness > 0.2 ? 'opacity-100' : 'opacity-0'}`}
      >
        <svg width="200" height="200" className="animate-spin-slow">
          <defs>
            <linearGradient id="energyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={accentColor} />
              <stop offset="50%" stopColor="#00ffff" />
              <stop offset="100%" stopColor="#ff00ff" />
            </linearGradient>
          </defs>
          
          {/* Outer ring - openness */}
          <circle
            cx="100" cy="100" r="95"
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="2"
          />
          <circle
            cx="100" cy="100" r="95"
            fill="none"
            stroke="url(#energyGrad)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={`${m.openness * 597} 597`}
            transform="rotate(-90 100 100)"
            style={{ filter: `drop-shadow(0 0 5px ${accentColor})` }}
          />
          
          {/* Inner ring - energy */}
          <circle
            cx="100" cy="100" r="80"
            fill="none"
            stroke="rgba(255,255,0,0.1)"
            strokeWidth="3"
          />
          <circle
            cx="100" cy="100" r="80"
            fill="none"
            stroke="#ffff00"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${m.energy * 502} 502`}
            transform="rotate(-90 100 100)"
            style={{ filter: 'drop-shadow(0 0 5px #ffff00)' }}
          />
        </svg>
      </div>

      {/* Main Controls Panel */}
      <div className="pointer-events-auto self-center md:self-end md:mb-10 w-full max-w-xs">
        <div className="bg-slate-900/50 backdrop-blur-xl border border-white/10 p-5 rounded-2xl shadow-2xl">
          
          {/* Mode Toggle */}
          <div className="mb-4 pb-4 border-b border-white/10">
            <button
              onClick={() => setSimulationMode(!simulationMode)}
              className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                simulationMode 
                  ? 'bg-purple-500/30 border border-purple-400 text-purple-300' 
                  : 'bg-white/5 border border-white/20 text-gray-400 hover:bg-white/10'
              }`}
            >
              {simulationMode ? '🎮 Mouse Ativo' : '📷 Câmera'}
            </button>
            
            {simulationMode && (
              <p className="text-[10px] text-purple-300/60 mt-2 text-center">
                Clique esquerdo = Pinça | Direito = Garra
              </p>
            )}
          </div>

          {/* Shape Selector */}
          <div className="mb-4">
            <label className="block text-cyan-300 text-xs font-bold uppercase tracking-wider mb-2">
              Forma Base
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {Object.values(ParticleShape).map((shape) => (
                <button
                  key={shape}
                  onClick={() => setShape(shape)}
                  className={`
                    px-2 py-1.5 text-[10px] rounded-lg transition-all duration-200 border
                    ${currentShape === shape 
                      ? 'bg-cyan-500/20 border-cyan-400 text-white' 
                      : 'bg-white/5 border-transparent text-gray-500 hover:bg-white/10 hover:text-white'}
                  `}
                >
                  {shape}
                </button>
              ))}
            </div>
          </div>

          {/* Color Picker */}
          <div className="mb-4">
            <label className="block text-cyan-300 text-xs font-bold uppercase tracking-wider mb-2">
              Cor
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-8 h-8 rounded-full cursor-pointer bg-transparent border-none p-0 overflow-hidden"
              />
              <div className="flex space-x-1">
                {['#00ffff', '#ff00ff', '#ffff00', '#00ff88', '#ff4444', '#ffffff'].map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`w-5 h-5 rounded-full border transition-transform hover:scale-125 ${
                      color === c ? 'border-white scale-110' : 'border-white/20'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Live Metrics (when hand present) */}
          {m.isPresent && (
            <div className="pt-3 border-t border-white/10">
              <label className="block text-cyan-300 text-xs font-bold uppercase tracking-wider mb-2">
                Métricas ao Vivo
              </label>
              <div className="space-y-1.5">
                <MiniMeter label="Abertura" value={m.openness} color="#00ffff" />
                <MiniMeter label="Pinça" value={m.pinchStrength} color="#ff00ff" />
                <MiniMeter label="Garra" value={m.gripStrength} color="#ffaa00" />
                <MiniMeter label="Dispersão" value={m.fingerSpread} color="#00ff88" />
                <MiniMeter label="Energia" value={m.energy} color="#ffff00" />
              </div>
            </div>
          )}
          
          {/* Status */}
          <div className="mt-3 pt-3 border-t border-white/10 text-[10px] text-gray-500 text-center">
            {m.isPresent 
              ? `Tensão: ${Math.round(m.tension * 100)}% | Velocidade: ${m.speed.toFixed(2)}`
              : simulationMode 
                ? 'Mova o mouse e use os botões'
                : 'Mostre sua mão para a câmera'}
          </div>
        </div>
      </div>
    </div>
  );
};

// Mini metric dot for header
const MetricDot: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div 
    className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold"
    style={{ 
      backgroundColor: `${color}${Math.round(value * 255).toString(16).padStart(2, '0')}`,
      color: value > 0.5 ? '#000' : '#fff',
      boxShadow: value > 0.3 ? `0 0 8px ${color}` : 'none'
    }}
    title={`${label}: ${Math.round(value * 100)}%`}
  >
    {label}
  </div>
);

// Mini meter bar for panel
const MiniMeter: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div className="flex items-center space-x-2">
    <span className="text-[9px] text-gray-500 w-16">{label}</span>
    <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
      <div 
        className="h-full rounded-full transition-all duration-150"
        style={{ 
          width: `${value * 100}%`,
          backgroundColor: color,
          boxShadow: value > 0.3 ? `0 0 6px ${color}` : 'none'
        }}
      />
    </div>
    <span className="text-[9px] text-gray-600 w-8 text-right">
      {Math.round(value * 100)}%
    </span>
  </div>
);
