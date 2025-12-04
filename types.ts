export enum ParticleShape {
  SPHERE = 'Sphere',
  HEART = 'Heart',
  GALAXY = 'Galaxy',
  FLOWER = 'Flower',
  ENTITY = 'Entity'
}

// Gesture Types - Each gesture triggers unique particle effects
export enum GestureType {
  NONE = 'none',
  OPEN_PALM = 'open_palm',      // All fingers extended - Explosion/Expansion
  FIST = 'fist',                // All fingers closed - Implosion/Singularity
  PINCH = 'pinch',              // Thumb + Index touching - Precision control
  PEACE = 'peace',              // Index + Middle extended - Double vortex
  POINT = 'point',              // Only index extended - Particle beam
  ROCK = 'rock',                // Index + Pinky extended - Electric chaos
  THUMBS_UP = 'thumbs_up',      // Only thumb up - Particles float upward
  SPIDERMAN = 'spiderman',      // Thumb + Pinky + Index - Web effect
}

// All 21 MediaPipe hand landmarks
export enum HandLandmark {
  WRIST = 0,
  THUMB_CMC = 1,
  THUMB_MCP = 2,
  THUMB_IP = 3,
  THUMB_TIP = 4,
  INDEX_FINGER_MCP = 5,
  INDEX_FINGER_PIP = 6,
  INDEX_FINGER_DIP = 7,
  INDEX_FINGER_TIP = 8,
  MIDDLE_FINGER_MCP = 9,
  MIDDLE_FINGER_PIP = 10,
  MIDDLE_FINGER_DIP = 11,
  MIDDLE_FINGER_TIP = 12,
  RING_FINGER_MCP = 13,
  RING_FINGER_PIP = 14,
  RING_FINGER_DIP = 15,
  RING_FINGER_TIP = 16,
  PINKY_MCP = 17,
  PINKY_PIP = 18,
  PINKY_DIP = 19,
  PINKY_TIP = 20,
}

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface HandData {
  tension: number;           // 0 (closed) to 1 (open)
  isPresent: boolean;
  x: number;                 // normalized screen x (-1 to 1)
  y: number;                 // normalized screen y (-1 to 1)
  gesture: GestureType;      // Current detected gesture
  gestureConfidence: number; // 0 to 1
  velocity: Vector3;         // Hand movement speed
  energy: number;            // Accumulated energy from movement (0-1)
  landmarks: Vector3[];      // All 21 landmarks for advanced effects
  fingerStates: boolean[];   // Which fingers are extended [thumb, index, middle, ring, pinky]
  palmRotation: number;      // Palm facing up (1) or down (-1)
  pointDirection: Vector3;   // Direction the index finger is pointing
}

// MediaPipe Types (Simplified for global usage)
export interface Window {
  Hands: any;
  Camera: any;
}

export type Vector3Tuple = [number, number, number];

// Effect configuration for each gesture
export interface GestureEffect {
  name: string;
  icon: string;
  color: string;
  description: string;
}

export const GESTURE_EFFECTS: Record<GestureType, GestureEffect> = {
  [GestureType.NONE]: {
    name: 'Aguardando',
    icon: '👋',
    color: '#666666',
    description: 'Mostre sua mão'
  },
  [GestureType.OPEN_PALM]: {
    name: 'Supernova',
    icon: '✋',
    color: '#FFD700',
    description: 'Explosão de energia'
  },
  [GestureType.FIST]: {
    name: 'Singularidade',
    icon: '✊',
    color: '#8B00FF',
    description: 'Colapso gravitacional'
  },
  [GestureType.PINCH]: {
    name: 'Controle',
    icon: '🤏',
    color: '#00FFFF',
    description: 'Manipulação precisa'
  },
  [GestureType.PEACE]: {
    name: 'Harmonia',
    icon: '✌️',
    color: '#00FF88',
    description: 'Vórtice duplo'
  },
  [GestureType.POINT]: {
    name: 'Raio',
    icon: '👆',
    color: '#FF4444',
    description: 'Feixe direcionado'
  },
  [GestureType.ROCK]: {
    name: 'Caos',
    icon: '🤘',
    color: '#FF00FF',
    description: 'Energia elétrica'
  },
  [GestureType.THUMBS_UP]: {
    name: 'Ascensão',
    icon: '👍',
    color: '#88FF00',
    description: 'Flutuação celestial'
  },
  [GestureType.SPIDERMAN]: {
    name: 'Teia',
    icon: '🕷️',
    color: '#FF0066',
    description: 'Conexões magnéticas'
  },
};
