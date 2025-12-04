import React, { useState, useEffect, useRef, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { ParticleSystem } from './components/ParticleSystem';
import { Controls } from './components/Controls';
import { HolographicHUD } from './components/HolographicHUD';
import { IntroSequence } from './components/IntroSequence';
import { GestureOverlay } from './components/GestureOverlay';
import { VisualFeedback } from './components/VisualFeedback';
import { ParticleShape } from './types';
import { HandService, ContinuousHandMetrics } from './services/handService';

// Default empty metrics
const createEmptyMetrics = (): ContinuousHandMetrics => ({
  isPresent: false,
  confidence: 0,
  position: { x: 0, y: 0, z: 0 },
  velocity: { x: 0, y: 0, z: 0 },
  speed: 0,
  openness: 0.6,
  pinchStrength: 0,
  pinchPosition: { x: 0, y: 0, z: 0 },
  fingerSpread: 0,
  palmNormal: { x: 0, y: 0, z: 1 },
  palmFacingCamera: 1,
  palmTilt: 0,
  thumbCurl: 0,
  indexCurl: 0,
  middleCurl: 0,
  ringCurl: 0,
  pinkyCurl: 0,
  pointDirection: { x: 0, y: -1, z: 0 },
  pointStrength: 0,
  gripStrength: 0,
  energy: 0,
  tension: 0,
  expressiveness: 0,
  landmarks: [],
});

const App: React.FC = () => {
  const [showIntro, setShowIntro] = useState(true);
  const [shape, setShape] = useState<ParticleShape>(ParticleShape.GALAXY);
  const [color, setColor] = useState<string>('#4fc3f7');
  const [showGuide, setShowGuide] = useState(true);
  
  const [metrics, setMetrics] = useState<ContinuousHandMetrics>(createEmptyMetrics());
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  
  const handServiceRef = useRef<HandService | null>(null);

  // Real hand tracking
  useEffect(() => {
    const handService = new HandService((data) => {
      setMetrics(data);
      if (data.isPresent) setShowGuide(false);
    });
    handServiceRef.current = handService;

    handService.initialize().then(() => {
      setVideoElement(handService.getVideoElement());
    });

    return () => {
      handService.stop();
    };
  }, []);

  // Get accent color based on metrics
  const getAccentColor = () => {
    if (!metrics.isPresent) return '#00ffff';
    if (metrics.pinchStrength > 0.5) return '#ff00ff';
    if (metrics.gripStrength > 0.5) return '#ffaa00';
    return '#00ffff';
  };

  const accentColor = getAccentColor();

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden">
      {/* Intro Sequence */}
      {showIntro && (
        <IntroSequence onComplete={() => setShowIntro(false)} />
      )}

      {/* Reactive Background */}
      <ReactiveBackground metrics={metrics} accentColor={accentColor} />

      {/* Controls Panel */}
      <Controls 
        currentShape={shape} 
        setShape={setShape} 
        color={color} 
        setColor={setColor}
        metrics={metrics}
      />
      
      {/* Holographic HUD */}
      <HolographicHUD 
        metrics={metrics}
        videoElement={videoElement}
      />
      
      {/* Visual Feedback System */}
      <VisualFeedback metrics={metrics} />
      
      {/* Gesture Recognition Overlay */}
      <GestureOverlay metrics={metrics} />
      
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 0, 12], fov: 60 }}
        dpr={[1, 2]}
        gl={{ antialias: false, alpha: false }}
      >
        <color attach="background" args={['#020205']} />
        
        <Suspense fallback={null}>
          <ParticleSystem shape={shape} color={color} metrics={metrics} />
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        </Suspense>

        <OrbitControls 
          enableZoom={true} 
          enablePan={false} 
          autoRotate={!metrics.isPresent} 
          autoRotateSpeed={0.5} 
          minDistance={5}
          maxDistance={20}
        />
        
        <ambientLight intensity={0.5} />
      </Canvas>

      {/* Guide Overlay */}
      <GuideOverlay 
        isVisible={showGuide && !metrics.isPresent && !showIntro} 
        onDismiss={() => setShowGuide(false)}
      />
    </div>
  );
};

// Reactive Background Component
const ReactiveBackground: React.FC<{
  metrics: ContinuousHandMetrics;
  accentColor: string;
}> = ({ metrics, accentColor }) => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Radial gradient that pulses with energy */}
      <div
        className="absolute inset-0 transition-opacity duration-500"
        style={{
          background: `radial-gradient(ellipse at ${50 + metrics.position.x * 20}% ${50 - metrics.position.y * 20}%, ${accentColor}08 0%, transparent 50%)`,
          opacity: metrics.isPresent ? 0.8 + metrics.energy * 0.2 : 0.3,
        }}
      />

      {/* Cyberpunk grid */}
      <div
        className="absolute inset-0 transition-opacity duration-700"
        style={{
          backgroundImage: `
            linear-gradient(${accentColor}08 1px, transparent 1px),
            linear-gradient(90deg, ${accentColor}08 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
          opacity: metrics.isPresent ? 0.3 + metrics.expressiveness * 0.3 : 0.15,
          transform: `perspective(500px) rotateX(60deg) translateY(-50%)`,
          transformOrigin: 'center bottom',
        }}
      />

      {/* Animated nebula effect */}
      <div
        className="absolute inset-0 transition-all duration-1000"
        style={{
          background: `
            radial-gradient(ellipse at 20% 30%, ${accentColor}10 0%, transparent 40%),
            radial-gradient(ellipse at 80% 70%, #ff00ff08 0%, transparent 40%)
          `,
          opacity: metrics.isPresent ? 0.5 : 0.2,
          filter: 'blur(40px)',
        }}
      />

      {/* Corner accent lines */}
      <svg className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <defs>
          <linearGradient id="cornerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={accentColor} stopOpacity="0.5" />
            <stop offset="100%" stopColor={accentColor} stopOpacity="0" />
          </linearGradient>
        </defs>
        
        {/* Top left corner */}
        <path
          d="M 0 100 L 0 0 L 100 0"
          fill="none"
          stroke="url(#cornerGrad)"
          strokeWidth="1"
          opacity={metrics.isPresent ? 0.8 : 0.3}
        />
        
        {/* Bottom right corner */}
        <path
          d="M 100% -100 L 100% 100% L -100 100%"
          fill="none"
          stroke="url(#cornerGrad)"
          strokeWidth="1"
          opacity={metrics.isPresent ? 0.8 : 0.3}
          transform="rotate(180)"
          style={{ transformOrigin: 'center' }}
        />
      </svg>
    </div>
  );
};

// Guide Component
const GuideOverlay: React.FC<{ 
  isVisible: boolean; 
  onDismiss: () => void;
}> = ({ isVisible, onDismiss }) => {
  const controls = [
    { icon: '✋', name: 'Abertura', desc: 'Abre/fecha partículas' },
    { icon: '🤏', name: 'Pinça', desc: 'Atrai para um ponto' },
    { icon: '✊', name: 'Garra', desc: 'Cria vórtice rotacional' },
    { icon: '🖐️', name: 'Dispersão', desc: 'Espalha partículas' },
    { icon: '👆', name: 'Apontar', desc: 'Cria feixe direcional' },
    { icon: '🏃', name: 'Velocidade', desc: 'Acumula energia' },
  ];

  return (
    <div 
      className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
                  transition-all duration-700 pointer-events-none
                  ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
      style={{ zIndex: isVisible ? 50 : -1 }}
    >
      <div className="text-center mb-6">
        <h2 
          className="text-2xl font-extralight text-white/80 tracking-[0.4em] mb-2"
          style={{ fontFamily: '"Orbitron", "Segoe UI", sans-serif' }}
        >
          CONTROLE CONTÍNUO
        </h2>
        <p className="text-sm text-cyan-300/60 max-w-md">
          Cada movimento da sua mão controla as partículas de forma fluida e expressiva
        </p>
      </div>
      
      <div className="grid grid-cols-3 gap-3 mb-6">
        {controls.map((c, i) => (
          <div 
            key={i}
            className="flex flex-col items-center p-3 rounded-xl bg-white/5 
                       border border-white/10 backdrop-blur-sm
                       hover:bg-white/10 hover:border-cyan-400/30 transition-all duration-300"
          >
            <span className="text-2xl mb-1">{c.icon}</span>
            <span className="text-xs text-white/70 font-medium">{c.name}</span>
            <span className="text-[9px] text-cyan-400/60 text-center">{c.desc}</span>
          </div>
        ))}
      </div>
      
      <div className="flex flex-col items-center space-y-3 pointer-events-auto">
        <div className="flex items-center space-x-2 text-xs text-white/40">
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span>Aguardando câmera...</span>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={onEnableSimulation}
            className="px-5 py-2.5 bg-purple-500/20 border border-purple-400/50 rounded-xl
                       text-purple-300 text-sm font-medium tracking-wider
                       hover:bg-purple-500/30 hover:border-purple-400 hover:scale-105
                       transition-all duration-300 backdrop-blur-sm"
          >
            🎮 Simular com Mouse
          </button>
          <button
            onClick={onDismiss}
            className="px-5 py-2.5 bg-white/5 border border-white/20 rounded-xl
                       text-white/60 text-sm font-medium tracking-wider
                       hover:bg-white/10 hover:border-white/40 hover:scale-105
                       transition-all duration-300 backdrop-blur-sm"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

// Simulation Mode Banner
const SimulationBanner: React.FC = () => (
  <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-30 pointer-events-none">
    <div 
      className="px-5 py-2.5 rounded-full backdrop-blur-xl animate-pulse"
      style={{
        background: 'linear-gradient(135deg, rgba(170, 0, 255, 0.2) 0%, rgba(100, 0, 200, 0.3) 100%)',
        border: '1px solid rgba(170, 0, 255, 0.5)',
        boxShadow: '0 0 30px rgba(170, 0, 255, 0.2)',
      }}
    >
      <span className="text-purple-300 text-sm font-mono tracking-wider">
        🎮 SIMULAÇÃO • <span className="text-purple-400">Esquerdo</span> = Pinça • <span className="text-orange-400">Direito</span> = Garra
      </span>
    </div>
  </div>
);

export default App;
