import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ContinuousHandMetrics } from '../services/handMetrics';

interface HolographicHUDProps {
  metrics: ContinuousHandMetrics;
  videoElement: HTMLVideoElement | null;
  simulationMode?: boolean;
}

export const HolographicHUD: React.FC<HolographicHUDProps> = ({ 
  metrics, 
  videoElement, 
  simulationMode 
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const timeRef = useRef<number>(0);

  // Get dynamic accent color
  const getAccentColor = () => {
    if (!metrics.isPresent) return '#00ffff';
    if (metrics.pinchStrength > 0.5) return '#ff00ff';
    if (metrics.gripStrength > 0.5) return '#ffaa00';
    if (metrics.energy > 0.7) return '#ffff00';
    return '#00ffff';
  };

  const accentColor = getAccentColor();

  // Canvas rendering for hand visualization
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      timeRef.current += 0.016;
      const time = timeRef.current;
      const m = metrics;

      canvas.width = 200;
      canvas.height = 150;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Background with gradient
      const bgGrad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      bgGrad.addColorStop(0, 'rgba(0, 20, 40, 0.6)');
      bgGrad.addColorStop(1, 'rgba(0, 10, 30, 0.8)');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Animated scan line
      const scanY = (time * 50) % canvas.height;
      ctx.strokeStyle = `${accentColor}30`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, scanY);
      ctx.lineTo(canvas.width, scanY);
      ctx.stroke();

      // Grid lines (subtle)
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 20) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 20) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Video preview (if available and not simulation)
      if (!simulationMode && videoElement && videoElement.readyState >= 2) {
        ctx.save();
        ctx.globalAlpha = 0.4;
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.filter = 'hue-rotate(180deg) saturate(0.3)';
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        ctx.filter = 'none';
        ctx.restore();
      }

      // Hand skeleton visualization
      if (m.isPresent && m.landmarks.length > 0) {
        const scaleX = canvas.width * 0.8;
        const scaleY = canvas.height * 0.8;
        const offsetX = canvas.width * 0.1;
        const offsetY = canvas.height * 0.1;

        // Connections
        const connections = [
          [0, 1], [1, 2], [2, 3], [3, 4],
          [0, 5], [5, 6], [6, 7], [7, 8],
          [0, 9], [9, 10], [10, 11], [11, 12],
          [0, 13], [13, 14], [14, 15], [15, 16],
          [0, 17], [17, 18], [18, 19], [19, 20],
          [5, 9], [9, 13], [13, 17],
        ];

        // Draw connections with glow
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 8;
        ctx.shadowColor = accentColor;

        connections.forEach(([a, b]) => {
          if (m.landmarks[a] && m.landmarks[b]) {
            const la = m.landmarks[a];
            const lb = m.landmarks[b];
            const x1 = offsetX + (1 - (la.x / 2 + 0.5)) * scaleX;
            const y1 = offsetY + (1 - (la.y / 2 + 0.5)) * scaleY;
            const x2 = offsetX + (1 - (lb.x / 2 + 0.5)) * scaleX;
            const y2 = offsetY + (1 - (lb.y / 2 + 0.5)) * scaleY;

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
          }
        });

        // Draw landmark points
        m.landmarks.forEach((lm, i) => {
          const x = offsetX + (1 - (lm.x / 2 + 0.5)) * scaleX;
          const y = offsetY + (1 - (lm.y / 2 + 0.5)) * scaleY;
          const isTip = [4, 8, 12, 16, 20].includes(i);

          ctx.fillStyle = isTip ? '#ffffff' : accentColor;
          ctx.shadowBlur = isTip ? 12 : 6;
          ctx.beginPath();
          ctx.arc(x, y, isTip ? 4 : 3, 0, Math.PI * 2);
          ctx.fill();
        });

        ctx.shadowBlur = 0;
      } else if (simulationMode && m.isPresent) {
        // Simulation cursor visualization
        const posX = canvas.width / 2 + m.position.x * canvas.width / 2 * 0.8;
        const posY = canvas.height / 2 - m.position.y * canvas.height / 2 * 0.8;

        // Outer ring
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 15;
        ctx.shadowColor = accentColor;
        ctx.beginPath();
        ctx.arc(posX, posY, 15 + Math.sin(time * 4) * 3, 0, Math.PI * 2);
        ctx.stroke();

        // Inner dot
        ctx.fillStyle = accentColor;
        ctx.beginPath();
        ctx.arc(posX, posY, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
      }

      // Border frame with animated corners
      const borderPulse = Math.sin(time * 2) * 0.2 + 0.8;
      ctx.strokeStyle = `${accentColor}${Math.round(borderPulse * 255).toString(16).padStart(2, '0')}`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(1, 1, canvas.width - 2, canvas.height - 2, 8);
      ctx.stroke();

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [metrics, videoElement, simulationMode, accentColor]);

  return (
    <motion.div
      className="absolute bottom-6 left-6 z-20"
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      {/* Main Container */}
      <motion.div
        className="relative overflow-hidden rounded-2xl"
        style={{
          background: 'linear-gradient(135deg, rgba(0, 20, 40, 0.9) 0%, rgba(0, 10, 30, 0.95) 100%)',
          backdropFilter: 'blur(20px)',
          border: `1px solid ${accentColor}40`,
          boxShadow: `0 0 30px ${accentColor}20, inset 0 0 30px rgba(0, 0, 0, 0.5)`,
        }}
        animate={{
          borderColor: `${accentColor}40`,
          boxShadow: `0 0 30px ${accentColor}20, inset 0 0 30px rgba(0, 0, 0, 0.5)`,
        }}
        transition={{ duration: 0.3 }}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between px-4 py-2 cursor-pointer border-b"
          style={{ borderColor: `${accentColor}20` }}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2">
            <motion.div
              className="w-2 h-2 rounded-full"
              style={{ background: metrics.isPresent ? '#00ff88' : '#ff4444' }}
              animate={{
                scale: metrics.isPresent ? [1, 1.2, 1] : 1,
                boxShadow: metrics.isPresent 
                  ? ['0 0 5px #00ff88', '0 0 15px #00ff88', '0 0 5px #00ff88']
                  : '0 0 5px #ff4444',
              }}
              transition={{ duration: 1, repeat: Infinity }}
            />
            <span className="text-xs font-mono tracking-wider" style={{ color: accentColor }}>
              {metrics.isPresent ? 'TRACKING' : 'OFFLINE'}
            </span>
          </div>
          
          <motion.button
            className="text-white/40 hover:text-white/80 transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d={isExpanded 
                ? "M4 10l4-4 4 4" 
                : "M4 6l4 4 4-4"
              } stroke="currentColor" strokeWidth="2" fill="none" />
            </svg>
          </motion.button>
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Hand Visualization Canvas */}
              <div className="p-3">
                <canvas
                  ref={canvasRef}
                  className="rounded-lg w-full"
                  style={{ maxWidth: 200 }}
                />
              </div>

              {/* Metrics Section */}
              <div className="px-3 pb-3 space-y-3">
                {/* Finger Arc Indicators */}
                <FingerArcs metrics={metrics} accentColor={accentColor} />

                {/* Primary Metrics */}
                <div className="grid grid-cols-2 gap-2">
                  <MetricBar 
                    label="Abertura" 
                    value={metrics.openness} 
                    color="#00ffff"
                    icon="🖐️"
                  />
                  <MetricBar 
                    label="Pinça" 
                    value={metrics.pinchStrength} 
                    color="#ff00ff"
                    icon="🤏"
                  />
                  <MetricBar 
                    label="Garra" 
                    value={metrics.gripStrength} 
                    color="#ffaa00"
                    icon="✊"
                  />
                  <MetricBar 
                    label="Energia" 
                    value={metrics.energy} 
                    color="#ffff00"
                    icon="⚡"
                  />
                </div>

                {/* Status Footer */}
                <div 
                  className="flex justify-between items-center pt-2 border-t text-[10px] font-mono"
                  style={{ borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }}
                >
                  <span>
                    VEL: {metrics.speed.toFixed(2)}
                  </span>
                  <span>
                    EXPR: {Math.round(metrics.expressiveness * 100)}%
                  </span>
                  <span>
                    {simulationMode ? '🎮 SIM' : '📷 CAM'}
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Floating decorative elements */}
      <FloatingDecorations accentColor={accentColor} isPresent={metrics.isPresent} />
    </motion.div>
  );
};

// Finger Arc Indicators
const FingerArcs: React.FC<{ metrics: ContinuousHandMetrics; accentColor: string }> = ({ 
  metrics, 
  accentColor 
}) => {
  const fingers = [
    { label: 'P', value: 1 - metrics.thumbCurl, color: '#ff6b6b' },
    { label: 'I', value: 1 - metrics.indexCurl, color: '#ffd93d' },
    { label: 'M', value: 1 - metrics.middleCurl, color: '#6bcb77' },
    { label: 'A', value: 1 - metrics.ringCurl, color: '#4d96ff' },
    { label: 'Mn', value: 1 - metrics.pinkyCurl, color: '#9b59b6' },
  ];

  return (
    <div className="flex justify-center gap-1">
      {fingers.map((finger, i) => (
        <div key={i} className="flex flex-col items-center">
          <svg width="28" height="28" className="transform -rotate-90">
            <circle
              cx="14"
              cy="14"
              r="10"
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="3"
            />
            <motion.circle
              cx="14"
              cy="14"
              r="10"
              fill="none"
              stroke={finger.color}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={62.8}
              initial={{ strokeDashoffset: 62.8 }}
              animate={{ strokeDashoffset: 62.8 * (1 - finger.value) }}
              transition={{ duration: 0.15 }}
              style={{
                filter: finger.value > 0.5 ? `drop-shadow(0 0 3px ${finger.color})` : 'none',
              }}
            />
          </svg>
          <span 
            className="text-[8px] font-mono mt-0.5"
            style={{ color: finger.value > 0.5 ? finger.color : 'rgba(255,255,255,0.4)' }}
          >
            {finger.label}
          </span>
        </div>
      ))}
    </div>
  );
};

// Individual Metric Bar
const MetricBar: React.FC<{
  label: string;
  value: number;
  color: string;
  icon: string;
}> = ({ label, value, color, icon }) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between">
      <span className="text-[9px] text-white/50 flex items-center gap-1">
        <span className="text-xs">{icon}</span>
        {label}
      </span>
      <span 
        className="text-[9px] font-mono"
        style={{ color: value > 0.5 ? color : 'rgba(255,255,255,0.4)' }}
      >
        {Math.round(value * 100)}%
      </span>
    </div>
    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
      <motion.div
        className="h-full rounded-full"
        style={{
          background: `linear-gradient(90deg, ${color}80, ${color})`,
          boxShadow: value > 0.3 ? `0 0 8px ${color}` : 'none',
        }}
        initial={{ width: 0 }}
        animate={{ width: `${value * 100}%` }}
        transition={{ duration: 0.15 }}
      />
    </div>
  </div>
);

// Floating Decorative Elements
const FloatingDecorations: React.FC<{ accentColor: string; isPresent: boolean }> = ({ 
  accentColor, 
  isPresent 
}) => (
  <>
    {/* Corner bracket - top left */}
    <motion.svg
      className="absolute -top-2 -left-2 w-6 h-6"
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: isPresent ? 0.6 : 0.3, scale: 1 }}
      transition={{ delay: 0.5 }}
    >
      <path
        d="M 2 12 L 2 2 L 12 2"
        fill="none"
        stroke={accentColor}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </motion.svg>

    {/* Corner bracket - bottom right */}
    <motion.svg
      className="absolute -bottom-2 -right-2 w-6 h-6"
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: isPresent ? 0.6 : 0.3, scale: 1 }}
      transition={{ delay: 0.6 }}
    >
      <path
        d="M 22 12 L 22 22 L 12 22"
        fill="none"
        stroke={accentColor}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </motion.svg>

    {/* Floating data lines */}
    {isPresent && (
      <motion.div
        className="absolute -right-8 top-1/2 -translate-y-1/2 flex flex-col gap-1"
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.7 }}
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="h-[2px] rounded-full"
            style={{ background: accentColor, width: 10 + i * 8 }}
            animate={{ opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 1.5, delay: i * 0.2, repeat: Infinity }}
          />
        ))}
      </motion.div>
    )}
  </>
);

export default HolographicHUD;
