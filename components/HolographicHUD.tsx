import React, { useRef, useEffect } from 'react';
import { ContinuousHandMetrics } from '../services/handMetrics';

interface HolographicHUDProps {
  metrics: ContinuousHandMetrics;
  videoElement: HTMLVideoElement | null;
  simulationMode?: boolean;
}

// Draw meter helper function
const drawMeter = (
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  value: number, color: string, label?: string
) => {
  ctx.fillStyle = '#222222';
  ctx.fillRect(x, y, w, h);
  
  // Use solid color for the fill
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.9;
  ctx.fillRect(x, y, w * Math.min(1, value), h);
  ctx.globalAlpha = 1;
  
  if (label) {
    ctx.font = '8px "Courier New"';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(label, x + w + 5, y + h - 1);
  }
};

export const HolographicHUD: React.FC<HolographicHUDProps> = ({ 
  metrics, 
  videoElement, 
  simulationMode 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  const trailRef = useRef<Array<{ x: number; y: number; time: number }>>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      timeRef.current += 0.016;
      const time = timeRef.current;
      const m = metrics;

      canvas.width = 320;
      canvas.height = 240;

      // Clear
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Background
      ctx.fillStyle = 'rgba(0, 15, 30, 0.4)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Scanlines
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.02)';
      for (let y = 0; y < canvas.height; y += 2) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Dynamic glow color based on metrics
      const hue = m.isPresent 
        ? 180 + m.pinchStrength * 60 - m.openness * 30 
        : 180;
      const glowColor = `hsl(${hue}, 100%, 60%)`;

      // Border
      ctx.shadowBlur = 15;
      ctx.shadowColor = glowColor;
      ctx.strokeStyle = glowColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      const pulse = Math.sin(time * 2) * 2;
      ctx.roundRect(2 + pulse, 2, canvas.width - 4 - pulse * 2, canvas.height - 4, 8);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // === SECTION 1: VIDEO/HAND VISUALIZATION (Right side) ===
      const vizX = 170;
      const vizY = 20;
      const vizW = 140;
      const vizH = 105;

      // Video or simulation background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(vizX, vizY, vizW, vizH);

      if (!simulationMode && videoElement && videoElement.readyState >= 2) {
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.translate(vizX + vizW, vizY);
        ctx.scale(-1, 1);
        ctx.filter = 'hue-rotate(180deg) saturate(0.4)';
        ctx.drawImage(videoElement, 0, 0, vizW, vizH);
        ctx.filter = 'none';
        ctx.restore();
      }

      // Draw hand visualization if present
      if (m.isPresent && m.landmarks.length > 0) {
        // Update trail
        const trailX = vizX + vizW / 2 + m.position.x * vizW / 2 * 0.8;
        const trailY = vizY + vizH / 2 - m.position.y * vizH / 2 * 0.8;
        trailRef.current.push({ x: trailX, y: trailY, time });
        trailRef.current = trailRef.current.filter(p => time - p.time < 0.4);

        // Draw trail
        if (trailRef.current.length > 1) {
          for (let i = 1; i < trailRef.current.length; i++) {
            const alpha = i / trailRef.current.length * 0.6;
            ctx.strokeStyle = glowColor;
            ctx.globalAlpha = alpha;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(trailRef.current[i - 1].x, trailRef.current[i - 1].y);
            ctx.lineTo(trailRef.current[i].x, trailRef.current[i].y);
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
        }

        // Draw hand skeleton from landmarks
        const scaleX = vizW * 0.8;
        const scaleY = vizH * 0.8;
        const offsetX = vizX + vizW * 0.1;
        const offsetY = vizY + vizH * 0.1;

        // Connections
        const connections = [
          [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
          [0, 5], [5, 6], [6, 7], [7, 8], // Index
          [0, 9], [9, 10], [10, 11], [11, 12], // Middle
          [0, 13], [13, 14], [14, 15], [15, 16], // Ring
          [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
          [5, 9], [9, 13], [13, 17], // Palm
        ];

        ctx.strokeStyle = glowColor;
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 4;
        ctx.shadowColor = glowColor;

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
          
          ctx.fillStyle = isTip ? '#ffffff' : glowColor;
          ctx.beginPath();
          ctx.arc(x, y, isTip ? 3 : 2, 0, Math.PI * 2);
          ctx.fill();
        });

        ctx.shadowBlur = 0;
      } else if (simulationMode && m.isPresent) {
        // Simulation mode - show cursor
        const posX = vizX + vizW / 2 + m.position.x * vizW / 2 * 0.8;
        const posY = vizY + vizH / 2 - m.position.y * vizH / 2 * 0.8;
        
        ctx.fillStyle = glowColor;
        ctx.shadowBlur = 15;
        ctx.shadowColor = glowColor;
        ctx.beginPath();
        ctx.arc(posX, posY, 8 + Math.sin(time * 4) * 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Simulation indicator
      if (simulationMode) {
        ctx.font = '10px "Courier New"';
        ctx.fillStyle = '#aa00ff';
        ctx.fillText('SIMULAÇÃO', vizX + 40, vizY + vizH - 5);
      }

      // === SECTION 2: METRICS PANEL (Left side) ===
      const panelX = 10;
      const panelY = 20;

      // Status
      ctx.font = 'bold 10px "Courier New"';
      ctx.fillStyle = m.isPresent ? '#00ff88' : '#ff4444';
      ctx.fillText(m.isPresent ? '● ONLINE' : '○ OFFLINE', panelX, panelY - 5);

      // Main control labels
      ctx.font = '9px "Courier New"';
      ctx.fillStyle = '#888888';

      // === OPENNESS BAR (Primary!) ===
      const barY = panelY + 10;
      ctx.fillText('ABERTURA', panelX, barY);
      drawMeter(ctx, panelX, barY + 3, 100, 12, m.openness, glowColor, 
        m.openness < 0.3 ? 'FECHADO' : m.openness > 0.7 ? 'ABERTO' : 'NEUTRO');

      // === PINCH BAR ===
      const pinchY = barY + 28;
      ctx.fillStyle = '#888888';
      ctx.fillText('PINÇA', panelX, pinchY);
      drawMeter(ctx, panelX, pinchY + 3, 100, 10, m.pinchStrength, '#ff00ff');

      // === GRIP BAR ===
      const gripY = pinchY + 22;
      ctx.fillStyle = '#888888';
      ctx.fillText('GARRA', panelX, gripY);
      drawMeter(ctx, panelX, gripY + 3, 100, 10, m.gripStrength, '#ffaa00');

      // === SPREAD BAR ===
      const spreadY = gripY + 22;
      ctx.fillStyle = '#888888';
      ctx.fillText('DISPERSÃO', panelX, spreadY);
      drawMeter(ctx, panelX, spreadY + 3, 100, 10, m.fingerSpread, '#00ffaa');

      // === ENERGY BAR ===
      const energyY = spreadY + 22;
      ctx.fillStyle = '#888888';
      ctx.fillText('ENERGIA', panelX, energyY);
      drawMeter(ctx, panelX, energyY + 3, 100, 10, m.energy, '#ffff00', 
        `${Math.round(m.energy * 100)}%`);

      // === FINGER CURLS (Mini bars) ===
      const fingerY = energyY + 28;
      ctx.fillStyle = '#666666';
      ctx.font = '8px "Courier New"';
      ctx.fillText('DEDOS', panelX, fingerY);
      
      const fingerLabels = ['P', 'I', 'M', 'A', 'Mn'];
      const fingerCurls = [m.thumbCurl, m.indexCurl, m.middleCurl, m.ringCurl, m.pinkyCurl];
      
      fingerCurls.forEach((curl, i) => {
        const fx = panelX + i * 20;
        const fy = fingerY + 4;
        
        // Background
        ctx.fillStyle = '#222222';
        ctx.fillRect(fx, fy, 16, 25);
        
        // Fill based on curl (inverted - shows extension)
        const extension = 1 - curl;
        ctx.fillStyle = glowColor;
        ctx.globalAlpha = 0.3 + extension * 0.7;
        ctx.fillRect(fx, fy + 25 * (1 - extension), 16, 25 * extension);
        ctx.globalAlpha = 1;
        
        // Label
        ctx.fillStyle = extension > 0.5 ? '#ffffff' : '#666666';
        ctx.font = '7px "Courier New"';
        ctx.fillText(fingerLabels[i], fx + 4, fy + 33);
      });

      // === POSITION / VELOCITY (Bottom) ===
      ctx.font = '8px "Courier New"';
      ctx.fillStyle = '#555555';
      ctx.fillText(
        `POS: ${m.position.x.toFixed(2)}, ${m.position.y.toFixed(2)}  VEL: ${m.speed.toFixed(2)}`,
        panelX, canvas.height - 25
      );
      ctx.fillText(
        `TENSÃO: ${(m.tension * 100).toFixed(0)}%  EXPR: ${(m.expressiveness * 100).toFixed(0)}%`,
        panelX, canvas.height - 12
      );

      // === PALM ORIENTATION INDICATOR ===
      const compassX = vizX + vizW / 2;
      const compassY = vizY + vizH + 25;
      const compassR = 15;

      ctx.strokeStyle = '#333333';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(compassX, compassY, compassR, 0, Math.PI * 2);
      ctx.stroke();

      if (m.isPresent) {
        // Draw palm direction indicator
        ctx.fillStyle = glowColor;
        ctx.beginPath();
        ctx.arc(
          compassX + m.palmNormal.x * compassR * 0.7,
          compassY - m.palmNormal.y * compassR * 0.7,
          4, 0, Math.PI * 2
        );
        ctx.fill();

        ctx.font = '7px "Courier New"';
        ctx.fillStyle = '#666666';
        ctx.fillText('PALMA', compassX - 12, compassY + compassR + 10);
      }

      // === POINTING INDICATOR ===
      if (m.pointStrength > 0.3) {
        ctx.fillStyle = '#ff4444';
        ctx.font = '8px "Courier New"';
        ctx.fillText('→ APONTANDO', vizX + 30, vizY + vizH + 45);
      }

      // Corner decorations
      ctx.strokeStyle = `${glowColor}66`;
      ctx.lineWidth = 1;
      [[5, 5], [canvas.width - 5, 5], [5, canvas.height - 5], [canvas.width - 5, canvas.height - 5]].forEach(([cx, cy], i) => {
        ctx.beginPath();
        const dx = i % 2 === 0 ? 15 : -15;
        const dy = i < 2 ? 15 : -15;
        ctx.moveTo(cx, cy + dy);
        ctx.lineTo(cx, cy);
        ctx.lineTo(cx + dx, cy);
        ctx.stroke();
      });

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [metrics, videoElement, simulationMode]);

  return (
    <div className="absolute bottom-6 left-6 z-20">
      <canvas
        ref={canvasRef}
        className="rounded-xl shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, rgba(0,10,20,0.85) 0%, rgba(0,30,60,0.7) 100%)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(0,255,255,0.2)',
        }}
      />
    </div>
  );
};
