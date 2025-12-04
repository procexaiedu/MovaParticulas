import React, { useEffect, useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ParticleShape } from '../types';
import { ContinuousHandMetrics } from '../services/handMetrics';
import { generateGeometry } from '../services/geometryService';

interface ParticleSystemProps {
  shape: ParticleShape;
  color: string;
  metrics: ContinuousHandMetrics;
  onShapeTransition?: (progress: number) => void;
}

const COUNT = 15000;
const TRANSITION_DURATION = 1.5; // seconds

/**
 * Continuous Control Particle System with Cinematic Transitions
 * 
 * Enhanced with:
 * - Dramatic shape transitions with dissolve effect
 * - Particle ejection during transitions
 * - Dynamic flash effects
 * - Smooth interpolation with easing
 */
export const ParticleSystem: React.FC<ParticleSystemProps> = ({ 
  shape, 
  color, 
  metrics,
  onShapeTransition 
}) => {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  
  // Transition state
  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitionRef = useRef({
    progress: 0,
    startTime: 0,
    previousTargets: null as Float32Array | null,
    flashIntensity: 0,
  });
  const prevShapeRef = useRef(shape);
  
  // Buffers
  const currentPositions = useMemo(() => new Float32Array(COUNT * 3), []);
  const targetPositions = useMemo(() => generateGeometry(shape), [shape]);
  const velocities = useMemo(() => new Float32Array(COUNT * 3), []);
  const ejectionForces = useMemo(() => new Float32Array(COUNT * 3), []);
  
  // Per-particle properties
  const particlePhases = useMemo(() => {
    const arr = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) arr[i] = Math.random() * Math.PI * 2;
    return arr;
  }, []);
  
  const particleSeeds = useMemo(() => {
    const arr = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT * 3; i++) arr[i] = (Math.random() - 0.5) * 2;
    return arr;
  }, []);

  // Particle colors for transition effect
  const particleColors = useMemo(() => {
    const colors = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      colors[i * 3] = 1;
      colors[i * 3 + 1] = 1;
      colors[i * 3 + 2] = 1;
    }
    return colors;
  }, []);

  // Initialize positions
  useEffect(() => {
    for (let i = 0; i < COUNT * 3; i++) {
      currentPositions[i] = (Math.random() - 0.5) * 50;
    }
  }, [currentPositions]);

  // Handle shape change with cinematic transition
  useEffect(() => {
    if (shape !== prevShapeRef.current) {
      // Store previous targets for smooth interpolation
      transitionRef.current.previousTargets = new Float32Array(targetPositions);
      transitionRef.current.progress = 0;
      transitionRef.current.startTime = performance.now() / 1000;
      transitionRef.current.flashIntensity = 1;
      
      // Generate ejection forces for dramatic effect
      for (let i = 0; i < COUNT; i++) {
        const i3 = i * 3;
        const angle = Math.random() * Math.PI * 2;
        const strength = 0.5 + Math.random() * 1.5;
        ejectionForces[i3] = Math.cos(angle) * strength;
        ejectionForces[i3 + 1] = (Math.random() - 0.3) * strength;
        ejectionForces[i3 + 2] = Math.sin(angle) * strength;
      }
      
      setIsTransitioning(true);
      
      // Update targets
      const newTargets = generateGeometry(shape);
      targetPositions.set(newTargets);
      
      prevShapeRef.current = shape;
    }
  }, [shape, targetPositions, ejectionForces]);

  // Dynamic color based on metrics
  useEffect(() => {
    if (!materialRef.current) return;
    
    const baseColor = new THREE.Color(color);
    
    if (metrics.isPresent) {
      const hsl = { h: 0, s: 0, l: 0 };
      baseColor.getHSL(hsl);
      hsl.s = Math.min(1, hsl.s + metrics.energy * 0.3);
      hsl.h = (hsl.h + metrics.pinchStrength * 0.1 - metrics.openness * 0.05 + 1) % 1;
      baseColor.setHSL(hsl.h, hsl.s, hsl.l);
    }
    
    materialRef.current.color = baseColor;
  }, [color, metrics.energy, metrics.pinchStrength, metrics.openness, metrics.isPresent]);

  // Particle texture with enhanced glow
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, 'rgba(255,255,255,1)');
      gradient.addColorStop(0.1, 'rgba(255,255,255,0.9)');
      gradient.addColorStop(0.25, 'rgba(255,255,255,0.6)');
      gradient.addColorStop(0.5, 'rgba(255,255,255,0.2)');
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 64, 64);
    }
    return new THREE.CanvasTexture(canvas);
  }, []);

  // Easing function for smooth transitions
  const easeOutExpo = (t: number): number => {
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
  };

  const easeInOutQuart = (t: number): number => {
    return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
  };

  useFrame((state) => {
    if (!pointsRef.current) return;

    const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;
    const time = state.clock.getElapsedTime();
    const m = metrics;
    const transition = transitionRef.current;

    // === TRANSITION ANIMATION ===
    let transitionFactor = 0;
    let ejectionFactor = 0;
    
    if (isTransitioning) {
      const elapsed = time - transition.startTime;
      transition.progress = Math.min(1, elapsed / TRANSITION_DURATION);
      transitionFactor = easeInOutQuart(transition.progress);
      
      // Ejection is strongest at the beginning
      ejectionFactor = Math.max(0, 1 - elapsed / 0.5) * easeOutExpo(elapsed * 3);
      
      // Flash effect
      transition.flashIntensity = Math.max(0, 1 - elapsed / 0.3);
      
      // Notify parent of transition progress
      onShapeTransition?.(transition.progress);
      
      if (transition.progress >= 1) {
        setIsTransitioning(false);
        transition.previousTargets = null;
      }
    }

    // === PHYSICS PARAMETERS ===
    const baseLerp = m.isPresent ? 0.06 : 0.03;
    const transitionLerp = isTransitioning ? 0.08 + transitionFactor * 0.04 : baseLerp;
    const baseDamping = 0.9 + m.openness * 0.05 - m.gripStrength * 0.08;
    
    const handX = m.position.x * 5;
    const handY = m.position.y * 5;
    const handZ = m.position.z * 3;
    
    const pinchX = m.pinchPosition.x * 5;
    const pinchY = m.pinchPosition.y * 5;
    const pinchZ = m.pinchPosition.z * 3;

    const expansionFactor = 0.3 + m.openness * 1.2;
    const turbulence = m.fingerSpread * 0.5 + m.energy * 0.3;
    const vortexStrength = m.gripStrength * 2;
    const driftX = m.palmTilt * m.expressiveness * 0.5;
    const driftY = m.palmNormal.y * m.expressiveness * 0.3;

    for (let i = 0; i < COUNT; i++) {
      const i3 = i * 3;
      const phase = particlePhases[i];
      const seed = {
        x: particleSeeds[i3],
        y: particleSeeds[i3 + 1],
        z: particleSeeds[i3 + 2],
      };

      const px = positions[i3];
      const py = positions[i3 + 1];
      const pz = positions[i3 + 2];

      // === INTERPOLATE TARGETS DURING TRANSITION ===
      let tx = targetPositions[i3];
      let ty = targetPositions[i3 + 1];
      let tz = targetPositions[i3 + 2];

      if (isTransitioning && transition.previousTargets) {
        const prevTx = transition.previousTargets[i3];
        const prevTy = transition.previousTargets[i3 + 1];
        const prevTz = transition.previousTargets[i3 + 2];
        
        // Smooth interpolation between shapes
        tx = prevTx + (tx - prevTx) * transitionFactor;
        ty = prevTy + (ty - prevTy) * transitionFactor;
        tz = prevTz + (tz - prevTz) * transitionFactor;
        
        // Add ejection force during transition
        if (ejectionFactor > 0) {
          tx += ejectionForces[i3] * ejectionFactor * 3;
          ty += ejectionForces[i3 + 1] * ejectionFactor * 3;
          tz += ejectionForces[i3 + 2] * ejectionFactor * 3;
        }
        
        // Add swirl effect during transition
        const swirlPhase = phase + time * 3;
        const swirlRadius = (1 - transitionFactor) * 2;
        tx += Math.cos(swirlPhase) * swirlRadius * seed.x;
        tz += Math.sin(swirlPhase) * swirlRadius * seed.z;
      }

      // Distance from hand
      const dxHand = px - handX;
      const dyHand = py - handY;
      const dzHand = pz - handZ;
      const distToHand = Math.sqrt(dxHand * dxHand + dyHand * dyHand + dzHand * dzHand);

      // === BREATHING ANIMATION ===
      const breath = Math.sin(time * 0.6 + phase) * 0.08 * (1 - m.tension);
      tx += seed.x * breath;
      ty += seed.y * breath;
      tz += seed.z * breath;

      if (m.isPresent) {
        // === 1. EXPANSION/CONTRACTION ===
        const targetDist = Math.sqrt(tx * tx + ty * ty + tz * tz);
        if (targetDist > 0.1) {
          const scaledDist = targetDist * expansionFactor;
          const scale = scaledDist / targetDist;
          tx *= scale;
          ty *= scale;
          tz *= scale;
        }

        // === 2. PINCH ATTRACTION ===
        if (m.pinchStrength > 0.2) {
          const dxPinch = px - pinchX;
          const dyPinch = py - pinchY;
          const dzPinch = pz - pinchZ;
          const distToPinch = Math.sqrt(dxPinch * dxPinch + dyPinch * dyPinch + dzPinch * dzPinch);
          
          const attractionForce = m.pinchStrength * 3 / Math.max(0.5, distToPinch);
          const attractMix = Math.min(1, attractionForce * 0.3);
          
          tx = tx * (1 - attractMix) + pinchX * attractMix;
          ty = ty * (1 - attractMix) + pinchY * attractMix;
          tz = tz * (1 - attractMix) + pinchZ * attractMix;
          
          if (distToPinch < 2 && m.pinchStrength > 0.5) {
            const spiralAngle = time * 4 + phase;
            const spiralRadius = distToPinch * 0.3;
            tx += Math.cos(spiralAngle) * spiralRadius * m.pinchStrength;
            tz += Math.sin(spiralAngle) * spiralRadius * m.pinchStrength;
          }
        }

        // === 3. VORTEX/ROTATION (GRIP) ===
        if (m.gripStrength > 0.1 && distToHand < 8) {
          const proximity = 1 - distToHand / 8;
          const angle = time * vortexStrength * proximity;
          const cosA = Math.cos(angle * 0.1);
          const sinA = Math.sin(angle * 0.1);
          
          const relX = tx - handX;
          const relZ = tz - handZ;
          tx = handX + relX * cosA - relZ * sinA;
          tz = handZ + relX * sinA + relZ * cosA;
          ty += Math.sin(angle + phase) * proximity * m.gripStrength * 0.5;
        }

        // === 4. TURBULENCE (FINGER SPREAD) ===
        if (turbulence > 0.1) {
          const turbFreq = 3 + m.energy * 5;
          tx += Math.sin(time * turbFreq + phase * 5) * turbulence * seed.x;
          ty += Math.cos(time * turbFreq * 1.1 + phase * 5) * turbulence * seed.y;
          tz += Math.sin(time * turbFreq * 0.9 + phase * 5) * turbulence * seed.z;
        }

        // === 5. DIRECTIONAL FLOW ===
        tx += driftX;
        ty += driftY;

        // === 6. POINTING BEAM ===
        if (m.pointStrength > 0.3) {
          const beamProximity = Math.max(0, 1 - distToHand / 3);
          if (beamProximity > 0) {
            const beamLength = 8 * m.pointStrength;
            const beamProgress = (i % 100) / 100;
            
            const beamX = handX + m.pointDirection.x * beamLength * beamProgress;
            const beamY = handY + m.pointDirection.y * beamLength * beamProgress;
            const beamZ = handZ + m.pointDirection.z * beamLength * beamProgress;
            
            const beamMix = beamProximity * m.pointStrength * 0.5;
            tx = tx * (1 - beamMix) + beamX * beamMix;
            ty = ty * (1 - beamMix) + beamY * beamMix;
            tz = tz * (1 - beamMix) + beamZ * beamMix;
            
            tx += seed.x * beamProgress * 0.3;
            ty += seed.y * beamProgress * 0.3;
          }
        }

        // === 7. INDIVIDUAL FINGER EFFECTS ===
        const fingerWave = (
          m.indexCurl * Math.sin(time * 2 + phase) +
          m.middleCurl * Math.sin(time * 2.5 + phase * 1.2) +
          m.ringCurl * Math.sin(time * 3 + phase * 1.4) +
          m.pinkyCurl * Math.sin(time * 3.5 + phase * 1.6)
        ) * 0.1;
        ty += fingerWave * (1 - m.openness);

        // === 8. VELOCITY-BASED TRAILS ===
        if (m.speed > 0.1 && distToHand < 5) {
          const trailStrength = m.speed * (1 - distToHand / 5) * 0.3;
          tx += m.velocity.x * trailStrength;
          ty += m.velocity.y * trailStrength;
        }

        // === 9. TENSION JITTER ===
        if (m.tension > 0.5) {
          const jitter = (m.tension - 0.5) * 2 * m.energy;
          tx += (Math.random() - 0.5) * jitter * 0.3;
          ty += (Math.random() - 0.5) * jitter * 0.3;
          tz += (Math.random() - 0.5) * jitter * 0.3;
        }
      }

      // === PHYSICS UPDATE ===
      const lerpFactor = transitionLerp + m.expressiveness * 0.03;
      
      velocities[i3]     += (tx - px) * lerpFactor;
      velocities[i3 + 1] += (ty - py) * lerpFactor;
      velocities[i3 + 2] += (tz - pz) * lerpFactor;

      const damping = baseDamping - m.energy * 0.05;
      velocities[i3]     *= damping;
      velocities[i3 + 1] *= damping;
      velocities[i3 + 2] *= damping;

      positions[i3]     += velocities[i3];
      positions[i3 + 1] += velocities[i3 + 1];
      positions[i3 + 2] += velocities[i3 + 2];
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true;

    // === SYSTEM ROTATION ===
    const baseRotation = time * 0.03;
    const gripRotation = m.gripStrength * time * 0.2;
    const transitionRotation = isTransitioning ? Math.sin(time * 2) * 0.1 * (1 - transitionFactor) : 0;
    pointsRef.current.rotation.y = baseRotation + gripRotation + transitionRotation;
    pointsRef.current.rotation.z = time * 0.01 + m.palmTilt * 0.3;

    // === DYNAMIC PARTICLE SIZE ===
    if (materialRef.current) {
      const baseSize = 0.1;
      const energyBoost = m.energy * 0.08;
      const opennessEffect = (1 - m.openness) * 0.03;
      const transitionBoost = isTransitioning ? (1 - transitionFactor) * 0.05 : 0;
      materialRef.current.size = baseSize + energyBoost + opennessEffect + transitionBoost;
      
      // Flash effect during transition
      if (isTransitioning && transition.flashIntensity > 0) {
        materialRef.current.opacity = 0.8 + transition.flashIntensity * 0.2;
      } else {
        materialRef.current.opacity = 0.9;
      }
    }

    // === TRANSITION LIGHT FLASH ===
    if (lightRef.current) {
      lightRef.current.intensity = transition.flashIntensity * 5;
    }
  });

  return (
    <group>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={COUNT}
            array={currentPositions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          ref={materialRef}
          size={0.12}
          color={color}
          map={texture}
          transparent
          opacity={0.9}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation={true}
        />
      </points>
      
      {/* Transition flash light */}
      <pointLight
        ref={lightRef}
        color={color}
        intensity={0}
        distance={20}
        decay={2}
      />
    </group>
  );
};

export default ParticleSystem;
