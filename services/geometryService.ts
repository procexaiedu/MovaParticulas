import * as THREE from 'three';
import { ParticleShape } from '../types';

// Lowered particle budget to improve FPS on modest GPUs
export const PARTICLE_COUNT = 8000;
const RADIUS = 3.6;

export const generateGeometry = (shape: ParticleShape, count: number = PARTICLE_COUNT): Float32Array => {
  const positions = new Float32Array(count * 3);
  const tempVec = new THREE.Vector3();

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    let x = 0, y = 0, z = 0;

    switch (shape) {
      case ParticleShape.SPHERE: {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = RADIUS * Math.cbrt(Math.random()); 
        x = r * Math.sin(phi) * Math.cos(theta);
        y = r * Math.sin(phi) * Math.sin(theta);
        z = r * Math.cos(phi);
        break;
      }

      case ParticleShape.HEART: {
        // Parametric Heart Equation
        const t = Math.random() * Math.PI * 2;
        const u = Math.random(); // volume filler
        // Base shape
        const hx = 16 * Math.pow(Math.sin(t), 3);
        const hy = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
        // Scale down
        const scale = 0.25 * Math.cbrt(u); // fill inside
        x = hx * scale;
        y = hy * scale;
        z = (Math.random() - 0.5) * 2 * scale * 5; // thickness
        break;
      }

      case ParticleShape.GALAXY: {
        const arms = 5;
        const spin = i / count * arms;
        const branchAngle = (i % arms) / arms * Math.PI * 2;
        const radius = Math.random() * RADIUS * 1.5;
        const randomX = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * 0.5;
        const randomY = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * 0.5;
        const randomZ = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * 0.5;

        x = Math.cos(branchAngle + spin * 3) * radius + randomX;
        y = randomY * 2; // flatten
        z = Math.sin(branchAngle + spin * 3) * radius + randomZ;
        break;
      }

      case ParticleShape.FLOWER: {
        // Fibonacci Spiral (Phyllotaxis)
        const phi = Math.PI * (3 - Math.sqrt(5)); // golden angle
        const yPos = 1 - (i / Math.max(1, count - 1)) * 2; // y goes from 1 to -1
        const radius = Math.sqrt(1 - yPos * yPos) * RADIUS;
        const theta = phi * i;

        x = Math.cos(theta) * radius;
        y = yPos * RADIUS;
        z = Math.sin(theta) * radius;
        
        // Add some petal-like warping
        const warp = Math.sin(theta * 5) * 0.5;
        x += x * warp * 0.2;
        z += z * warp * 0.2;
        break;
      }

      case ParticleShape.ENTITY: {
        // Abstract Meditator (approximated with primitives)
        const rnd = Math.random();
        
        if (rnd < 0.2) {
          // Head
          const r = 0.8;
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(2 * Math.random() - 1);
          x = r * Math.sin(phi) * Math.cos(theta);
          y = r * Math.sin(phi) * Math.sin(theta) + 2.5;
          z = r * Math.cos(phi);
        } else if (rnd < 0.6) {
          // Body (Cylinder-ish)
          const h = 2.5;
          const r = 1.2 * Math.sqrt(Math.random());
          const theta = Math.random() * Math.PI * 2;
          const yPos = (Math.random() - 0.5) * h + 1;
          x = r * Math.cos(theta);
          y = yPos;
          z = r * Math.sin(theta);
        } else {
          // Base/Legs (Flattened Sphere/Torus section)
          const r = 2.5 * Math.sqrt(Math.random());
          const theta = Math.random() * Math.PI * 2;
          x = r * Math.cos(theta);
          y = (Math.random() - 0.5) * 0.8 - 0.5;
          z = r * Math.sin(theta);
        }
        break;
      }
    }

    positions[i3] = x;
    positions[i3 + 1] = y;
    positions[i3 + 2] = z;
  }

  return positions;
};
