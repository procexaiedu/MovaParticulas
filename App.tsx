import React, { useState, useEffect, useRef, Suspense, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { ParticleSystem } from './components/ParticleSystem';
import { Controls } from './components/Controls';
import { HolographicHUD } from './components/HolographicHUD';
import { ParticleShape } from './types';
import { HandService, ContinuousHandMetrics } from './services/handService';
import { HandMetricsExtractor } from './services/handMetrics';

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
  depth: 0,
  handSize: 0,
  landmarks: [],
});

const App: React.FC = () => {
  const [shape, setShape] = useState<ParticleShape>(ParticleShape.GALAXY);
  const [color, setColor] = useState<string>('#4fc3f7');
  const [simulationMode, setSimulationMode] = useState(false);
  const [showGuide, setShowGuide] = useState(true);
  
  const [metrics, setMetrics] = useState<ContinuousHandMetrics>(createEmptyMetrics());
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  
  const handServiceRef = useRef<HandService | null>(null);
  const simulationMetricsRef = useRef(new HandMetricsExtractor());
  
  // Mouse tracking for simulation
  const mousePos = useRef({ x: 0, y: 0 });
  const lastMousePos = useRef({ x: 0, y: 0 });
  const mouseButtons = useRef({ left: false, right: false });

  // Handle mouse for simulation
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (simulationMode) {
      mousePos.current = {
        x: (e.clientX / window.innerWidth - 0.5) * 2,
        y: -(e.clientY / window.innerHeight - 0.5) * 2,
      };
    }
  }, [simulationMode]);

  const handleMouseDown = useCallback((e: MouseEvent) => {
    if (simulationMode) {
      if (e.button === 0) mouseButtons.current.left = true;
      if (e.button === 2) mouseButtons.current.right = true;
    }
  }, [simulationMode]);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (e.button === 0) mouseButtons.current.left = false;
    if (e.button === 2) mouseButtons.current.right = false;
  }, []);

  const handleContextMenu = useCallback((e: MouseEvent) => {
    if (simulationMode) e.preventDefault();
  }, [simulationMode]);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('contextmenu', handleContextMenu);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [handleMouseMove, handleMouseDown, handleMouseUp, handleContextMenu]);

  // Simulation mode update
  useEffect(() => {
    if (!simulationMode) return;

    let energy = 0;
    let smoothOpenness = 0.6;
    let smoothPinch = 0;
    let smoothGrip = 0;
    
    const updateSimulation = () => {
      const dx = mousePos.current.x - lastMousePos.current.x;
      const dy = mousePos.current.y - lastMousePos.current.y;
      const speed = Math.sqrt(dx * dx + dy * dy) * 30;
      
      energy = Math.min(1, energy * 0.97 + speed * 0.5);
      lastMousePos.current = { ...mousePos.current };

      // Mouse controls:
      // - Position = mouse position
      // - Left click = pinch (close fingers)
      // - Right click = grip (curl fingers)
      // - Wheel could control spread (todo)
      
      const targetOpenness = mouseButtons.current.left ? 0.1 : 
                            mouseButtons.current.right ? 0.3 : 0.8;
      const targetPinch = mouseButtons.current.left ? 1 : 0;
      const targetGrip = mouseButtons.current.right ? 0.9 : 0;
      
      smoothOpenness += (targetOpenness - smoothOpenness) * 0.15;
      smoothPinch += (targetPinch - smoothPinch) * 0.2;
      smoothGrip += (targetGrip - smoothGrip) * 0.15;

      setMetrics({
        isPresent: true,
        confidence: 0.95,
        position: { x: mousePos.current.x, y: mousePos.current.y, z: 0 },
        velocity: { x: dx * 60, y: dy * 60, z: 0 },
        speed: Math.min(1, speed / 5),
        openness: smoothOpenness,
        pinchStrength: smoothPinch,
        pinchPosition: { x: mousePos.current.x, y: mousePos.current.y, z: 0 },
        fingerSpread: smoothOpenness * 0.5,
        palmNormal: { x: 0, y: 0, z: 1 },
        palmFacingCamera: 1,
        palmTilt: mousePos.current.x * 0.3,
        thumbCurl: smoothPinch * 0.5,
        indexCurl: 1 - smoothOpenness,
        middleCurl: 1 - smoothOpenness + smoothGrip * 0.3,
        ringCurl: 1 - smoothOpenness + smoothGrip * 0.4,
        pinkyCurl: 1 - smoothOpenness + smoothGrip * 0.5,
        pointDirection: { x: mousePos.current.x, y: mousePos.current.y, z: -1 },
        pointStrength: smoothOpenness > 0.5 && !mouseButtons.current.left ? 0.5 : 0,
        gripStrength: smoothGrip,
        energy,
        tension: smoothPinch * 0.5 + smoothGrip * 0.5,
        expressiveness: Math.abs(smoothOpenness - 0.6) + smoothPinch * 0.3 + speed * 0.2,
        depth: 0, // Simulation stays at reference depth
        handSize: 0.15,
        landmarks: [], // Empty for simulation
      });
    };

    const interval = setInterval(updateSimulation, 16);
    return () => clearInterval(interval);
  }, [simulationMode]);

  // Real hand tracking
  useEffect(() => {
    if (simulationMode) return;

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
  }, [simulationMode]);

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden">
      {/* Controls Panel */}
      <Controls 
        currentShape={shape} 
        setShape={setShape} 
        color={color} 
        setColor={setColor}
        metrics={metrics}
        simulationMode={simulationMode}
        setSimulationMode={setSimulationMode}
      />
      
      {/* Holographic HUD */}
      <HolographicHUD 
        metrics={metrics}
        videoElement={videoElement}
        simulationMode={simulationMode}
      />
      
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
        isVisible={showGuide && !metrics.isPresent && !simulationMode} 
        onDismiss={() => setShowGuide(false)}
        onEnableSimulation={() => {
          setSimulationMode(true);
          setShowGuide(false);
        }}
      />
      
      {/* Simulation Mode Banner */}
      {simulationMode && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-30 pointer-events-none">
          <div className="bg-purple-500/20 border border-purple-400/50 px-4 py-2 rounded-full backdrop-blur-sm">
            <span className="text-purple-300 text-sm font-mono">
              🎮 SIMULAÇÃO • Clique esquerdo = Pinça • Direito = Garra
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

// Guide Component
const GuideOverlay: React.FC<{ 
  isVisible: boolean; 
  onDismiss: () => void;
  onEnableSimulation: () => void;
}> = ({ isVisible, onDismiss, onEnableSimulation }) => {
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
        <h2 className="text-2xl font-light text-white/80 tracking-widest mb-2">
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
                       border border-white/10 backdrop-blur-sm"
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
            className="px-4 py-2 bg-purple-500/20 border border-purple-400/50 rounded-lg
                       text-purple-300 text-sm hover:bg-purple-500/30 transition-all"
          >
            🎮 Simular com Mouse
          </button>
          <button
            onClick={onDismiss}
            className="px-4 py-2 bg-white/5 border border-white/20 rounded-lg
                       text-white/60 text-sm hover:bg-white/10 transition-all"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;
