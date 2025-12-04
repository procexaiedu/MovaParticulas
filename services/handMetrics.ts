/**
 * Continuous Hand Metrics System
 * 
 * Instead of discrete gestures, we extract continuous metrics from the hand
 * that provide nuanced, expressive control over the particle system.
 * 
 * This is like playing a musical instrument - every finger position matters!
 */

import { HandLandmark, Vector3 } from '../types';

interface Landmark {
  x: number;
  y: number;
  z: number;
}

// Exponential Moving Average for smooth metrics
class MetricSmoother {
  private values: Map<string, number> = new Map();
  private vectors: Map<string, Vector3> = new Map();
  
  constructor(private alpha: number = 0.3) {}

  smoothValue(key: string, newValue: number): number {
    const old = this.values.get(key) ?? newValue;
    const smoothed = this.alpha * newValue + (1 - this.alpha) * old;
    this.values.set(key, smoothed);
    return smoothed;
  }

  smoothVector(key: string, newVec: Vector3): Vector3 {
    const old = this.vectors.get(key) ?? newVec;
    const smoothed = {
      x: this.alpha * newVec.x + (1 - this.alpha) * old.x,
      y: this.alpha * newVec.y + (1 - this.alpha) * old.y,
      z: this.alpha * newVec.z + (1 - this.alpha) * old.z,
    };
    this.vectors.set(key, smoothed);
    return smoothed;
  }

  reset() {
    this.values.clear();
    this.vectors.clear();
  }
}

/**
 * Continuous metrics extracted from hand landmarks
 * All values are normalized 0-1 for easy mapping to effects
 */
export interface ContinuousHandMetrics {
  // === PRESENCE ===
  isPresent: boolean;
  confidence: number;        // Overall tracking confidence
  
  // === POSITION & MOTION ===
  position: Vector3;         // Normalized -1 to 1
  velocity: Vector3;         // Movement speed
  speed: number;             // Magnitude of velocity (0-1 normalized)
  
  // === HAND OPENNESS (Most Important!) ===
  openness: number;          // 0 = tight fist, 1 = fully open palm
  
  // === PINCH CONTROL ===
  pinchStrength: number;     // 0 = open, 1 = thumb touching index
  pinchPosition: Vector3;    // Where the pinch point is
  
  // === FINGER SPREAD ===
  fingerSpread: number;      // 0 = fingers together, 1 = spread apart
  
  // === PALM ORIENTATION ===
  palmNormal: Vector3;       // Direction palm is facing
  palmFacingCamera: number;  // 1 = facing camera, -1 = facing away
  palmTilt: number;          // -1 = tilted left, 1 = tilted right
  
  // === INDIVIDUAL FINGER CURLS (0 = straight, 1 = curled) ===
  thumbCurl: number;
  indexCurl: number;
  middleCurl: number;
  ringCurl: number;
  pinkyCurl: number;
  
  // === POINTING ===
  pointDirection: Vector3;   // Where index finger points
  pointStrength: number;     // How "pointy" the hand is (index extended, others curled)
  
  // === GRIP / GRAB ===
  gripStrength: number;      // How much hand is in "grabbing" position
  
  // === DERIVED METRICS ===
  energy: number;            // Accumulated from movement (0-1)
  tension: number;           // Overall "tension" in hand pose
  expressiveness: number;    // How much the hand is "doing something"
  
  // === DEPTH ESTIMATION ===
  depth: number;             // Estimated distance from camera (0 = reference, -1 = close, 1 = far)
  handSize: number;          // Raw hand size for debugging

  // === RAW DATA ===
  landmarks: Vector3[];      // All 21 landmarks for custom use
}

export class HandMetricsExtractor {
  private smoother = new MetricSmoother(0.35);
  private fastSmoother = new MetricSmoother(0.6); // For responsive metrics
  private slowSmoother = new MetricSmoother(0.15); // For stable metrics
  
  private lastPosition: Vector3 = { x: 0, y: 0, z: 0 };
  private lastTime: number = 0;
  private energy: number = 0;
  
  private readonly ENERGY_DECAY = 0.97;
  private readonly ENERGY_GAIN = 0.2;

  // Calibration for depth estimation
  private readonly REF_HAND_SIZE = 0.25; // Reference size at neutral distance
  private readonly DEPTH_SCALE = 3.0;    // Sensitivity of depth scaling

  /**
   * Extract continuous metrics from raw MediaPipe landmarks
   */
  extract(rawLandmarks: Landmark[] | null, deltaTime: number = 0.016): ContinuousHandMetrics {
    const now = performance.now();
    const dt = this.lastTime > 0 ? (now - this.lastTime) / 1000 : deltaTime;
    this.lastTime = now;

    // Decay energy
    this.energy *= this.ENERGY_DECAY;

    // No hand detected
    if (!rawLandmarks || rawLandmarks.length < 21) {
      return this.getEmptyMetrics();
    }

    const lm = rawLandmarks;

    // === DEPTH ESTIMATION (New!) ===
    // MediaPipe Z is relative to wrist, not absolute depth.
    // We use apparent hand size as a proxy for distance.
    const wrist = lm[HandLandmark.WRIST];
    const middleMcp = lm[HandLandmark.MIDDLE_FINGER_MCP];
    const rawHandSize = this.distance3D(wrist, middleMcp);
    const handSize = this.slowSmoother.smoothValue('handSize', rawHandSize);
    
    // Calculate depth: larger hand = smaller depth (closer), smaller hand = larger depth (farther)
    // Normalized around 0 (reference distance)
    // Using 1/x relationship because size scales inversely with distance
    const rawDepth = (this.REF_HAND_SIZE / Math.max(0.05, handSize) - 1) * this.DEPTH_SCALE;
    const depth = this.smoother.smoothValue('depth', rawDepth);

    // === POSITION ===
    const position = this.smoother.smoothVector('pos', {
      x: (wrist.x - 0.5) * 2,
      y: -(wrist.y - 0.5) * 2,
      z: depth, // Use our estimated depth instead of wrist.z
    });

    // === VELOCITY ===
    const rawVelocity = {
      x: (position.x - this.lastPosition.x) / dt,
      y: (position.y - this.lastPosition.y) / dt,
      z: (position.z - this.lastPosition.z) / dt,
    };
    const velocity = this.smoother.smoothVector('vel', rawVelocity);
    const speed = Math.min(1, Math.sqrt(velocity.x ** 2 + velocity.y ** 2) / 10);
    this.lastPosition = { ...position };

    // Accumulate energy
    this.energy = Math.min(1, this.energy + speed * this.ENERGY_GAIN);

    // === FINGER CURLS ===
    const thumbCurl = this.calculateFingerCurl(lm, 'thumb');
    const indexCurl = this.calculateFingerCurl(lm, 'index');
    const middleCurl = this.calculateFingerCurl(lm, 'middle');
    const ringCurl = this.calculateFingerCurl(lm, 'ring');
    const pinkyCurl = this.calculateFingerCurl(lm, 'pinky');

    // Smooth finger curls
    const smoothThumb = this.smoother.smoothValue('thumbCurl', thumbCurl);
    const smoothIndex = this.smoother.smoothValue('indexCurl', indexCurl);
    const smoothMiddle = this.smoother.smoothValue('middleCurl', middleCurl);
    const smoothRing = this.smoother.smoothValue('ringCurl', ringCurl);
    const smoothPinky = this.smoother.smoothValue('pinkyCurl', pinkyCurl);

    // === OPENNESS (key metric!) ===
    // Average of all finger extensions (inverse of curls)
    const rawOpenness = 1 - (smoothIndex + smoothMiddle + smoothRing + smoothPinky) / 4;
    const openness = this.slowSmoother.smoothValue('openness', rawOpenness);

    // === PINCH ===
    const thumbTip = lm[HandLandmark.THUMB_TIP];
    const indexTip = lm[HandLandmark.INDEX_FINGER_TIP];
    const pinchDist = this.distance3D(thumbTip, indexTip);
    const rawPinchStrength = 1 - Math.min(1, Math.max(0, (pinchDist - 0.02) / 0.12));
    const pinchStrength = this.fastSmoother.smoothValue('pinch', rawPinchStrength);
    
    const pinchPosition = this.smoother.smoothVector('pinchPos', {
      x: ((thumbTip.x + indexTip.x) / 2 - 0.5) * 2,
      y: -((thumbTip.y + indexTip.y) / 2 - 0.5) * 2,
      z: (thumbTip.z + indexTip.z) / 2 * 2,
    });

    // === FINGER SPREAD ===
    const fingerSpread = this.calculateFingerSpread(lm);
    const smoothSpread = this.smoother.smoothValue('spread', fingerSpread);

    // === PALM ORIENTATION ===
    const palmNormal = this.calculatePalmNormal(lm);
    const smoothPalmNormal = this.smoother.smoothVector('palmNormal', palmNormal);
    const palmFacingCamera = this.slowSmoother.smoothValue('palmFacing', palmNormal.z > 0 ? 1 : -1);
    const palmTilt = this.smoother.smoothValue('palmTilt', palmNormal.x);

    // === POINTING ===
    const indexMcp = lm[HandLandmark.INDEX_FINGER_MCP];
    const pointDir = this.normalize({
      x: indexTip.x - indexMcp.x,
      y: -(indexTip.y - indexMcp.y),
      z: indexTip.z - indexMcp.z,
    });
    const pointDirection = this.smoother.smoothVector('pointDir', pointDir);
    
    // Point strength: index extended, others curled
    const pointStrength = (1 - smoothIndex) * (smoothMiddle + smoothRing + smoothPinky) / 3;
    const smoothPointStrength = this.smoother.smoothValue('pointStr', pointStrength);

    // === GRIP ===
    // Grip = all fingers curled but not fully closed
    const avgCurl = (smoothIndex + smoothMiddle + smoothRing + smoothPinky) / 4;
    const gripStrength = avgCurl * (1 - rawPinchStrength * 0.5);
    const smoothGrip = this.smoother.smoothValue('grip', gripStrength);

    // === DERIVED METRICS ===
    // Tension: how much "effort" in the pose
    const tension = Math.max(
      pinchStrength,
      gripStrength,
      Math.abs(openness - 0.5) * 2 // Extreme open or closed = tension
    );
    const smoothTension = this.slowSmoother.smoothValue('tension', tension);

    // Expressiveness: how much the hand is "doing" (not neutral)
    const neutralOpenness = 0.6; // Relaxed hand is slightly open
    const expressiveness = Math.abs(openness - neutralOpenness) + 
                          pinchStrength * 0.3 + 
                          smoothPointStrength * 0.3 +
                          speed * 0.4;
    const smoothExpressiveness = this.smoother.smoothValue('expr', Math.min(1, expressiveness));

    // Store landmarks
    const landmarks: Vector3[] = lm.map(l => ({
      x: (l.x - 0.5) * 2,
      y: -(l.y - 0.5) * 2,
      z: l.z * 2,
    }));

    return {
      isPresent: true,
      confidence: 0.9, // Could be derived from MediaPipe confidence

      position,
      velocity,
      speed: this.smoother.smoothValue('speed', speed),

      openness,
      pinchStrength,
      pinchPosition,
      fingerSpread: smoothSpread,

      palmNormal: smoothPalmNormal,
      palmFacingCamera,
      palmTilt,

      thumbCurl: smoothThumb,
      indexCurl: smoothIndex,
      middleCurl: smoothMiddle,
      ringCurl: smoothRing,
      pinkyCurl: smoothPinky,

      pointDirection,
      pointStrength: smoothPointStrength,

      gripStrength: smoothGrip,

      energy: this.energy,
      tension: smoothTension,
      expressiveness: smoothExpressiveness,

      depth,
      handSize,

      landmarks,
    };
  }

  private calculateFingerCurl(lm: Landmark[], finger: string): number {
    let mcp: number, pip: number, dip: number, tip: number;
    
    switch (finger) {
      case 'thumb':
        // Thumb curl is special - based on distance from index MCP
        const thumbTip = lm[HandLandmark.THUMB_TIP];
        const indexMcp = lm[HandLandmark.INDEX_FINGER_MCP];
        const dist = this.distance3D(thumbTip, indexMcp);
        return 1 - Math.min(1, dist / 0.15);
        
      case 'index':
        mcp = HandLandmark.INDEX_FINGER_MCP;
        pip = HandLandmark.INDEX_FINGER_PIP;
        dip = HandLandmark.INDEX_FINGER_DIP;
        tip = HandLandmark.INDEX_FINGER_TIP;
        break;
      case 'middle':
        mcp = HandLandmark.MIDDLE_FINGER_MCP;
        pip = HandLandmark.MIDDLE_FINGER_PIP;
        dip = HandLandmark.MIDDLE_FINGER_DIP;
        tip = HandLandmark.MIDDLE_FINGER_TIP;
        break;
      case 'ring':
        mcp = HandLandmark.RING_FINGER_MCP;
        pip = HandLandmark.RING_FINGER_PIP;
        dip = HandLandmark.RING_FINGER_DIP;
        tip = HandLandmark.RING_FINGER_TIP;
        break;
      case 'pinky':
        mcp = HandLandmark.PINKY_MCP;
        pip = HandLandmark.PINKY_PIP;
        dip = HandLandmark.PINKY_DIP;
        tip = HandLandmark.PINKY_TIP;
        break;
      default:
        return 0;
    }

    const wrist = lm[HandLandmark.WRIST];
    
    // Measure curl by comparing tip-to-wrist distance vs mcp-to-wrist distance
    const mcpToWrist = this.distance3D(lm[mcp], wrist);
    const tipToWrist = this.distance3D(lm[tip], wrist);
    const pipToWrist = this.distance3D(lm[pip], wrist);
    
    // If tip is closer to wrist than pip, finger is curled
    const curl = 1 - Math.min(1, tipToWrist / (mcpToWrist * 1.3));
    
    // Also check Y position (tip should be below pip if curled)
    const yFactor = lm[tip].y > lm[pip].y ? 0.3 : 0;
    
    return Math.min(1, Math.max(0, curl + yFactor));
  }

  private calculateFingerSpread(lm: Landmark[]): number {
    // Measure angles between adjacent fingers
    const indexTip = lm[HandLandmark.INDEX_FINGER_TIP];
    const middleTip = lm[HandLandmark.MIDDLE_FINGER_TIP];
    const ringTip = lm[HandLandmark.RING_FINGER_TIP];
    const pinkyTip = lm[HandLandmark.PINKY_TIP];
    
    const d1 = this.distance3D(indexTip, middleTip);
    const d2 = this.distance3D(middleTip, ringTip);
    const d3 = this.distance3D(ringTip, pinkyTip);
    
    const avgDist = (d1 + d2 + d3) / 3;
    
    // Normalize: ~0.02 = together, ~0.1 = spread
    return Math.min(1, Math.max(0, (avgDist - 0.02) / 0.08));
  }

  private calculatePalmNormal(lm: Landmark[]): Vector3 {
    const wrist = lm[HandLandmark.WRIST];
    const indexMcp = lm[HandLandmark.INDEX_FINGER_MCP];
    const pinkyMcp = lm[HandLandmark.PINKY_MCP];
    const middleMcp = lm[HandLandmark.MIDDLE_FINGER_MCP];

    // Two vectors on the palm plane
    const v1 = {
      x: indexMcp.x - pinkyMcp.x,
      y: indexMcp.y - pinkyMcp.y,
      z: indexMcp.z - pinkyMcp.z,
    };
    const v2 = {
      x: middleMcp.x - wrist.x,
      y: middleMcp.y - wrist.y,
      z: middleMcp.z - wrist.z,
    };

    // Cross product = normal
    const normal = {
      x: v1.y * v2.z - v1.z * v2.y,
      y: v1.z * v2.x - v1.x * v2.z,
      z: v1.x * v2.y - v1.y * v2.x,
    };

    return this.normalize(normal);
  }

  private distance3D(a: Landmark, b: Landmark): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  private normalize(v: Vector3): Vector3 {
    const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    if (len === 0) return { x: 0, y: 0, z: 1 };
    return { x: v.x / len, y: v.y / len, z: v.z / len };
  }

  private getEmptyMetrics(): ContinuousHandMetrics {
    return {
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
      energy: this.energy,
      tension: 0,
      expressiveness: 0,
      depth: 0,
      handSize: 0,
      landmarks: [],
    };
  }

  reset() {
    this.smoother.reset();
    this.fastSmoother.reset();
    this.slowSmoother.reset();
    this.energy = 0;
  }
}

