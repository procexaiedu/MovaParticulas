import React, { useEffect, useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ParticleShape } from '../types';
import { ContinuousHandMetrics } from '../services/handMetrics';
import { generateGeometry } from '../services/geometryService';

interface ParticleSystemProps {
  shape: ParticleShape;
  color: string;
  metrics: ContinuousHandMetrics;
}

const COUNT = 15000;

/**
 * Continuous Control Particle System
 * 
 * Instead of discrete gesture states, this system responds to continuous
 * hand metrics for expressive, instrument-like control:
 * 
 * - OPENNESS: Controls expansion/contraction of particles
 * - PINCH: Creates attraction point with adjustable strength
 * - FINGER SPREAD: Controls particle dispersion/chaos
 * - GRIP: Controls rotation speed and vortex effect
 * - PALM TILT: Controls directional flow
 * - ENERGY: Controls particle size and brightness
 * - POINT: Creates directional beam
 */
export const ParticleSystem: React.FC<ParticleSystemProps> = ({ shape, color, metrics }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);
  
  // Buffers
  const currentPositions = useMemo(() => new Float32Array(COUNT * 3), []);
  const targetPositions = useMemo(() => generateGeometry(shape), [shape]);
  const velocities = useMemo(() => new Float32Array(COUNT * 3), []);
  
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

  // Initialize positions
  useEffect(() => {
    for (let i = 0; i < COUNT * 3; i++) {
      currentPositions[i] = (Math.random() - 0.5) * 50;
    }
  }, [currentPositions]);

  // Update targets when shape changes
  useEffect(() => {
    const newTargets = generateGeometry(shape);
    targetPositions.set(newTargets);
  }, [shape, targetPositions]);

  // Dynamic color based on metrics
  useEffect(() => {
    if (!materialRef.current) return;
    
    const baseColor = new THREE.Color(color);
    
    if (metrics.isPresent) {
      // Shift hue based on openness and energy
      const hsl = { h: 0, s: 0, l: 0 };
      baseColor.getHSL(hsl);
      
      // Energy adds saturation and shifts toward warmer colors
      hsl.s = Math.min(1, hsl.s + metrics.energy * 0.3);
      hsl.h = (hsl.h + metrics.pinchStrength * 0.1 - metrics.openness * 0.05 + 1) % 1;
      
      baseColor.setHSL(hsl.h, hsl.s, hsl.l);
    }
    
    materialRef.current.color = baseColor;
  }, [color, metrics.energy, metrics.pinchStrength, metrics.openness, metrics.isPresent]);

  // Particle texture
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, 'rgba(255,255,255,1)');
      gradient.addColorStop(0.15, 'rgba(255,255,255,0.8)');
      gradient.addColorStop(0.4, 'rgba(255,255,255,0.3)');
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 64, 64);
    }
    return new THREE.CanvasTexture(canvas);
  }, []);

  useFrame((state) => {
    if (!pointsRef.current) return;

    const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;
    const time = state.clock.getElapsedTime();
    const m = metrics; // shorthand

    // === PHYSICS PARAMETERS DERIVED FROM METRICS ===
    
    // Base lerp factor - faster when hand is present
    const baseLerp = m.isPresent ? 0.06 : 0.03;
    
    // Damping - less damping = more momentum
    // High grip = more momentum, high openness = more damping
    const baseDamping = 0.9 + m.openness * 0.05 - m.gripStrength * 0.08;
    
    // Hand position in 3D space (scaled)
    const handX = m.position.x * 5;
    const handY = m.position.y * 5;
    // Use explicit depth metric for Z, scaled for scene depth
    // m.position.z already contains depth, but we scale it specifically here
    const handZ = m.depth * 4;
    
    // Pinch position
    const pinchX = m.pinchPosition.x * 5;
    const pinchY = m.pinchPosition.y * 5;
    // Pinch Z should follow hand depth + relative finger offset
    const pinchZ = handZ + m.pinchPosition.z * 3;

    // === EXPANSION FACTOR ===
    // Openness directly controls how far particles spread from targets
    // 0 = contracted to point, 1 = full shape, >1 = expanded
    const expansionFactor = 0.3 + m.openness * 1.2;

    // === CHAOS/TURBULENCE ===
    // Finger spread and energy add turbulence
    const turbulence = m.fingerSpread * 0.5 + m.energy * 0.3;

    // === VORTEX STRENGTH ===
    // Grip creates rotation/vortex
    const vortexStrength = m.gripStrength * 2;

    // === DIRECTIONAL FLOW ===
    // Palm tilt creates sideways drift
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

      // Current position
      const px = positions[i3];
      const py = positions[i3 + 1];
      const pz = positions[i3 + 2];

      // Base target from shape
      let tx = targetPositions[i3];
      let ty = targetPositions[i3 + 1];
      let tz = targetPositions[i3 + 2];

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
        // Scale target distance from origin based on openness
        const targetDist = Math.sqrt(tx * tx + ty * ty + tz * tz);
        if (targetDist > 0.1) {
          const scaledDist = targetDist * expansionFactor;
          const scale = scaledDist / targetDist;
          tx *= scale;
          ty *= scale;
          tz *= scale;
        }

        // === 2. PINCH ATTRACTION ===
        // Strong pinch creates gravitational attraction to pinch point
        if (m.pinchStrength > 0.2) {
          const dxPinch = px - pinchX;
          const dyPinch = py - pinchY;
          const dzPinch = pz - pinchZ;
          const distToPinch = Math.sqrt(dxPinch * dxPinch + dyPinch * dyPinch + dzPinch * dzPinch);
          
          // Inverse square attraction
          const attractionForce = m.pinchStrength * 3 / Math.max(0.5, distToPinch);
          const attractMix = Math.min(1, attractionForce * 0.3);
          
          tx = tx * (1 - attractMix) + pinchX * attractMix;
          ty = ty * (1 - attractMix) + pinchY * attractMix;
          tz = tz * (1 - attractMix) + pinchZ * attractMix;
          
          // Add spiral when very close
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
          
          // Rotate around hand position
          const relX = tx - handX;
          const relZ = tz - handZ;
          tx = handX + relX * cosA - relZ * sinA;
          tz = handZ + relX * sinA + relZ * cosA;
          
          // Add vertical oscillation
          ty += Math.sin(angle + phase) * proximity * m.gripStrength * 0.5;
        }

        // === 4. TURBULENCE (FINGER SPREAD) ===
        if (turbulence > 0.1) {
          const turbFreq = 3 + m.energy * 5;
          tx += Math.sin(time * turbFreq + phase * 5) * turbulence * seed.x;
          ty += Math.cos(time * turbFreq * 1.1 + phase * 5) * turbulence * seed.y;
          tz += Math.sin(time * turbFreq * 0.9 + phase * 5) * turbulence * seed.z;
        }

        // === 5. DIRECTIONAL FLOW (PALM TILT) ===
        tx += driftX;
        ty += driftY;

        // === 6. POINTING BEAM ===
        if (m.pointStrength > 0.3) {
          const beamProximity = Math.max(0, 1 - distToHand / 3);
          if (beamProximity > 0) {
            const beamLength = 8 * m.pointStrength;
            const beamProgress = (i % 100) / 100;
            
            // Project along pointing direction
            const beamX = handX + m.pointDirection.x * beamLength * beamProgress;
            const beamY = handY + m.pointDirection.y * beamLength * beamProgress;
            const beamZ = handZ + m.pointDirection.z * beamLength * beamProgress;
            
            const beamMix = beamProximity * m.pointStrength * 0.5;
            tx = tx * (1 - beamMix) + beamX * beamMix;
            ty = ty * (1 - beamMix) + beamY * beamMix;
            tz = tz * (1 - beamMix) + beamZ * beamMix;
            
            // Add spread along beam
            tx += seed.x * beamProgress * 0.3;
            ty += seed.y * beamProgress * 0.3;
          }
        }

        // === 7. INDIVIDUAL FINGER EFFECTS ===
        // Each curled finger adds a subtle wave
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
      const lerpFactor = baseLerp + m.expressiveness * 0.03;
      
      velocities[i3]     += (tx - px) * lerpFactor;
      velocities[i3 + 1] += (ty - py) * lerpFactor;
      velocities[i3 + 2] += (tz - pz) * lerpFactor;

      // Variable damping
      const damping = baseDamping - m.energy * 0.05;
      velocities[i3]     *= damping;
      velocities[i3 + 1] *= damping;
      velocities[i3 + 2] *= damping;

      // Update positions
      positions[i3]     += velocities[i3];
      positions[i3 + 1] += velocities[i3 + 1];
      positions[i3 + 2] += velocities[i3 + 2];
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true;

    // === SYSTEM ROTATION ===
    const baseRotation = time * 0.03;
    const gripRotation = m.gripStrength * time * 0.2;
    pointsRef.current.rotation.y = baseRotation + gripRotation;
    pointsRef.current.rotation.z = time * 0.01 + m.palmTilt * 0.3;

    // === DYNAMIC PARTICLE SIZE ===
    if (materialRef.current) {
      // Size based on energy and openness
      const baseSize = 0.1;
      const energyBoost = m.energy * 0.08;
      const opennessEffect = (1 - m.openness) * 0.03; // Smaller when closed
      materialRef.current.size = baseSize + energyBoost + opennessEffect;
    }
  });

  return (
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
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation={true}
      />
    </points>
  );
};
