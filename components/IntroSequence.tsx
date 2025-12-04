import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface IntroSequenceProps {
  onComplete: () => void;
}

export const IntroSequence: React.FC<IntroSequenceProps> = ({ onComplete }) => {
  const [phase, setPhase] = useState<'scanning' | 'logo' | 'particles' | 'complete'>('scanning');

  useEffect(() => {
    const timeline = [
      { phase: 'logo' as const, delay: 800 },
      { phase: 'particles' as const, delay: 2000 },
      { phase: 'complete' as const, delay: 3500 },
    ];

    const timeouts: NodeJS.Timeout[] = [];
    
    timeline.forEach(({ phase, delay }) => {
      timeouts.push(setTimeout(() => setPhase(phase), delay));
    });

    timeouts.push(setTimeout(onComplete, 4000));

    return () => timeouts.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {phase !== 'complete' && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
          style={{ background: '#020205' }}
        >
          {/* Scanning Lines */}
          <ScanLines active={phase === 'scanning' || phase === 'logo'} />
          
          {/* Grid Background */}
          <GridBackground phase={phase} />
          
          {/* Central Logo */}
          <LogoReveal phase={phase} />
          
          {/* Particle Burst */}
          <ParticleBurst active={phase === 'particles'} />
          
          {/* Corner Brackets */}
          <CornerBrackets phase={phase} />
          
          {/* Status Text */}
          <StatusText phase={phase} />
          
          {/* Progress Bar */}
          <ProgressBar phase={phase} />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Scanning Lines Effect
const ScanLines: React.FC<{ active: boolean }> = ({ active }) => (
  <>
    {/* Horizontal scan line */}
    <motion.div
      className="absolute left-0 right-0 h-[2px] pointer-events-none"
      style={{
        background: 'linear-gradient(90deg, transparent, #00ffff, transparent)',
        boxShadow: '0 0 20px #00ffff, 0 0 40px #00ffff',
      }}
      initial={{ top: '0%', opacity: 0 }}
      animate={active ? {
        top: ['0%', '100%', '0%'],
        opacity: [0, 1, 0],
      } : { opacity: 0 }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'linear',
      }}
    />
    
    {/* Vertical scan line */}
    <motion.div
      className="absolute top-0 bottom-0 w-[2px] pointer-events-none"
      style={{
        background: 'linear-gradient(180deg, transparent, #ff00ff, transparent)',
        boxShadow: '0 0 20px #ff00ff, 0 0 40px #ff00ff',
      }}
      initial={{ left: '0%', opacity: 0 }}
      animate={active ? {
        left: ['0%', '100%', '0%'],
        opacity: [0, 0.7, 0],
      } : { opacity: 0 }}
      transition={{
        duration: 2.5,
        repeat: Infinity,
        ease: 'linear',
        delay: 0.3,
      }}
    />
  </>
);

// Cyberpunk Grid Background
const GridBackground: React.FC<{ phase: string }> = ({ phase }) => (
  <motion.div
    className="absolute inset-0 pointer-events-none"
    initial={{ opacity: 0 }}
    animate={{ opacity: phase === 'scanning' ? 0 : 0.15 }}
    transition={{ duration: 1 }}
    style={{
      backgroundImage: `
        linear-gradient(rgba(0, 255, 255, 0.1) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0, 255, 255, 0.1) 1px, transparent 1px)
      `,
      backgroundSize: '50px 50px',
      maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 70%)',
    }}
  />
);

// Main Logo Reveal
const LogoReveal: React.FC<{ phase: string }> = ({ phase }) => {
  const letters = 'ETHERIAL'.split('');
  const showLogo = phase === 'logo' || phase === 'particles';

  return (
    <motion.div
      className="relative z-10 flex flex-col items-center"
      initial={{ scale: 0.8 }}
      animate={{ scale: showLogo ? 1 : 0.8 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Main Title */}
      <div className="flex overflow-hidden">
        {letters.map((letter, i) => (
          <motion.span
            key={i}
            className="text-6xl md:text-8xl font-extralight tracking-[0.3em] text-white"
            style={{
              textShadow: '0 0 30px rgba(0, 255, 255, 0.8), 0 0 60px rgba(0, 255, 255, 0.4)',
              fontFamily: '"Orbitron", "Segoe UI", sans-serif',
            }}
            initial={{ y: 100, opacity: 0, rotateX: -90 }}
            animate={showLogo ? {
              y: 0,
              opacity: 1,
              rotateX: 0,
            } : {}}
            transition={{
              duration: 0.6,
              delay: i * 0.08,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            {letter}
          </motion.span>
        ))}
      </div>

      {/* Subtitle */}
      <motion.p
        className="mt-4 text-sm md:text-base tracking-[0.5em] uppercase"
        style={{
          color: 'rgba(0, 255, 255, 0.6)',
          fontFamily: '"Courier New", monospace',
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={showLogo ? { opacity: 1, y: 0 } : {}}
        transition={{ delay: 0.8, duration: 0.5 }}
      >
        Controle Contínuo de Partículas
      </motion.p>

      {/* Decorative Lines */}
      <motion.div
        className="absolute -left-20 top-1/2 w-16 h-[1px]"
        style={{ background: 'linear-gradient(90deg, transparent, #00ffff)' }}
        initial={{ scaleX: 0, opacity: 0 }}
        animate={showLogo ? { scaleX: 1, opacity: 1 } : {}}
        transition={{ delay: 0.6, duration: 0.4 }}
      />
      <motion.div
        className="absolute -right-20 top-1/2 w-16 h-[1px]"
        style={{ background: 'linear-gradient(270deg, transparent, #00ffff)' }}
        initial={{ scaleX: 0, opacity: 0 }}
        animate={showLogo ? { scaleX: 1, opacity: 1 } : {}}
        transition={{ delay: 0.6, duration: 0.4 }}
      />
    </motion.div>
  );
};

// Particle Burst Effect
const ParticleBurst: React.FC<{ active: boolean }> = ({ active }) => {
  const particles = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    angle: (i / 40) * Math.PI * 2,
    distance: 100 + Math.random() * 200,
    size: 2 + Math.random() * 4,
    duration: 0.8 + Math.random() * 0.4,
  }));

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            background: p.id % 2 === 0 ? '#00ffff' : '#ff00ff',
            boxShadow: `0 0 10px ${p.id % 2 === 0 ? '#00ffff' : '#ff00ff'}`,
          }}
          initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
          animate={active ? {
            x: Math.cos(p.angle) * p.distance,
            y: Math.sin(p.angle) * p.distance,
            opacity: [0, 1, 0],
            scale: [0, 1, 0.5],
          } : {}}
          transition={{
            duration: p.duration,
            ease: 'easeOut',
          }}
        />
      ))}
      
      {/* Central burst ring */}
      <motion.div
        className="absolute rounded-full border-2"
        style={{ borderColor: '#00ffff' }}
        initial={{ width: 0, height: 0, opacity: 0 }}
        animate={active ? {
          width: [0, 300, 500],
          height: [0, 300, 500],
          opacity: [0, 0.8, 0],
        } : {}}
        transition={{ duration: 1, ease: 'easeOut' }}
      />
      <motion.div
        className="absolute rounded-full border"
        style={{ borderColor: '#ff00ff' }}
        initial={{ width: 0, height: 0, opacity: 0 }}
        animate={active ? {
          width: [0, 200, 400],
          height: [0, 200, 400],
          opacity: [0, 0.6, 0],
        } : {}}
        transition={{ duration: 1, ease: 'easeOut', delay: 0.1 }}
      />
    </div>
  );
};

// Corner Brackets
const CornerBrackets: React.FC<{ phase: string }> = ({ phase }) => {
  const show = phase !== 'scanning';
  const corners = [
    { pos: 'top-8 left-8', rotate: 0 },
    { pos: 'top-8 right-8', rotate: 90 },
    { pos: 'bottom-8 right-8', rotate: 180 },
    { pos: 'bottom-8 left-8', rotate: 270 },
  ];

  return (
    <>
      {corners.map((corner, i) => (
        <motion.div
          key={i}
          className={`absolute ${corner.pos} w-12 h-12`}
          initial={{ opacity: 0, scale: 0 }}
          animate={show ? { opacity: 1, scale: 1 } : {}}
          transition={{ delay: 0.8 + i * 0.1, duration: 0.3 }}
          style={{ transform: `rotate(${corner.rotate}deg)` }}
        >
          <svg viewBox="0 0 48 48" className="w-full h-full">
            <motion.path
              d="M 4 24 L 4 4 L 24 4"
              fill="none"
              stroke="#00ffff"
              strokeWidth="2"
              initial={{ pathLength: 0 }}
              animate={show ? { pathLength: 1 } : {}}
              transition={{ delay: 0.8 + i * 0.1, duration: 0.5 }}
            />
          </svg>
        </motion.div>
      ))}
    </>
  );
};

// Status Text
const StatusText: React.FC<{ phase: string }> = ({ phase }) => {
  const statusMap: Record<string, string> = {
    scanning: 'INICIALIZANDO SISTEMAS...',
    logo: 'CARREGANDO INTERFACE...',
    particles: 'SISTEMA PRONTO',
  };

  return (
    <motion.div
      className="absolute bottom-20 left-1/2 -translate-x-1/2 font-mono text-xs tracking-widest"
      style={{ color: 'rgba(0, 255, 255, 0.7)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5 }}
    >
      <motion.span
        key={phase}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
      >
        {statusMap[phase] || ''}
      </motion.span>
      <motion.span
        className="inline-block ml-1"
        animate={{ opacity: [1, 0] }}
        transition={{ duration: 0.5, repeat: Infinity }}
      >
        _
      </motion.span>
    </motion.div>
  );
};

// Progress Bar
const ProgressBar: React.FC<{ phase: string }> = ({ phase }) => {
  const progress = phase === 'scanning' ? 30 : phase === 'logo' ? 70 : 100;

  return (
    <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-48">
      <div className="h-[2px] bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{
            background: 'linear-gradient(90deg, #00ffff, #ff00ff)',
            boxShadow: '0 0 10px #00ffff',
          }}
          initial={{ width: '0%' }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
};

export default IntroSequence;


