import { GestureType, HandLandmark, Vector3 } from '../types';

interface Landmark {
  x: number;
  y: number;
  z: number;
}

export class GestureDetector {
  // Check if a finger is extended by comparing tip position to MCP joint
  private static isFingerExtended(
    landmarks: Landmark[],
    tipIndex: number,
    pipIndex: number,
    mcpIndex: number,
    isThumb: boolean = false
  ): boolean {
    const tip = landmarks[tipIndex];
    const pip = landmarks[pipIndex];
    const mcp = landmarks[mcpIndex];
    const wrist = landmarks[HandLandmark.WRIST];

    if (isThumb) {
      // For thumb, check if it's away from palm
      const thumbTip = landmarks[HandLandmark.THUMB_TIP];
      const indexMcp = landmarks[HandLandmark.INDEX_FINGER_MCP];
      const dx = thumbTip.x - indexMcp.x;
      const dy = thumbTip.y - indexMcp.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance > 0.1;
    }

    // For other fingers: tip should be further from wrist than PIP
    // Also check Y position (tip above PIP in screen coords = finger extended)
    const tipToWrist = Math.sqrt(
      Math.pow(tip.x - wrist.x, 2) + 
      Math.pow(tip.y - wrist.y, 2)
    );
    const pipToWrist = Math.sqrt(
      Math.pow(pip.x - wrist.x, 2) + 
      Math.pow(pip.y - wrist.y, 2)
    );

    // Finger is extended if tip is further from wrist than pip
    // and tip is above pip (in screen Y coordinates, lower Y = higher position)
    const isExtendedByDistance = tipToWrist > pipToWrist * 0.9;
    const isExtendedByAngle = tip.y < pip.y + 0.05; // Some tolerance

    return isExtendedByDistance && isExtendedByAngle;
  }

  // Get finger states [thumb, index, middle, ring, pinky]
  public static getFingerStates(landmarks: Landmark[]): boolean[] {
    return [
      this.isFingerExtended(landmarks, HandLandmark.THUMB_TIP, HandLandmark.THUMB_IP, HandLandmark.THUMB_MCP, true),
      this.isFingerExtended(landmarks, HandLandmark.INDEX_FINGER_TIP, HandLandmark.INDEX_FINGER_PIP, HandLandmark.INDEX_FINGER_MCP),
      this.isFingerExtended(landmarks, HandLandmark.MIDDLE_FINGER_TIP, HandLandmark.MIDDLE_FINGER_PIP, HandLandmark.MIDDLE_FINGER_MCP),
      this.isFingerExtended(landmarks, HandLandmark.RING_FINGER_TIP, HandLandmark.RING_FINGER_PIP, HandLandmark.RING_FINGER_MCP),
      this.isFingerExtended(landmarks, HandLandmark.PINKY_TIP, HandLandmark.PINKY_PIP, HandLandmark.PINKY_MCP),
    ];
  }

  // Check if thumb and index are pinching
  public static isPinching(landmarks: Landmark[]): boolean {
    const thumbTip = landmarks[HandLandmark.THUMB_TIP];
    const indexTip = landmarks[HandLandmark.INDEX_FINGER_TIP];
    
    const dx = thumbTip.x - indexTip.x;
    const dy = thumbTip.y - indexTip.y;
    const dz = thumbTip.z - indexTip.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    
    return distance < 0.06;
  }

  // Calculate pinch distance for tension
  public static getPinchDistance(landmarks: Landmark[]): number {
    const thumbTip = landmarks[HandLandmark.THUMB_TIP];
    const indexTip = landmarks[HandLandmark.INDEX_FINGER_TIP];
    
    const dx = thumbTip.x - indexTip.x;
    const dy = thumbTip.y - indexTip.y;
    const dz = thumbTip.z - indexTip.z;
    
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  // Get palm rotation (1 = facing camera, -1 = facing away)
  public static getPalmRotation(landmarks: Landmark[]): number {
    const wrist = landmarks[HandLandmark.WRIST];
    const middleMcp = landmarks[HandLandmark.MIDDLE_FINGER_MCP];
    const indexMcp = landmarks[HandLandmark.INDEX_FINGER_MCP];
    const pinkyMcp = landmarks[HandLandmark.PINKY_MCP];

    // Calculate normal vector of palm plane
    // Using cross product of two vectors on the palm
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

    // Cross product gives normal
    const normal = {
      x: v1.y * v2.z - v1.z * v2.y,
      y: v1.z * v2.x - v1.x * v2.z,
      z: v1.x * v2.y - v1.y * v2.x,
    };

    // Z component indicates facing direction
    return normal.z > 0 ? 1 : -1;
  }

  // Get the direction the index finger is pointing
  public static getPointDirection(landmarks: Landmark[]): Vector3 {
    const indexTip = landmarks[HandLandmark.INDEX_FINGER_TIP];
    const indexMcp = landmarks[HandLandmark.INDEX_FINGER_MCP];

    const dx = indexTip.x - indexMcp.x;
    const dy = indexTip.y - indexMcp.y;
    const dz = indexTip.z - indexMcp.z;
    
    const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
    
    return {
      x: dx / length,
      y: -dy / length, // Invert Y for screen coordinates
      z: dz / length,
    };
  }

  // Main gesture detection
  public static detectGesture(landmarks: Landmark[]): { gesture: GestureType; confidence: number } {
    const fingers = this.getFingerStates(landmarks);
    const [thumb, index, middle, ring, pinky] = fingers;
    const isPinch = this.isPinching(landmarks);

    // Count extended fingers
    const extendedCount = fingers.filter(f => f).length;

    // Pinch detection (highest priority when thumb and index are close)
    if (isPinch && !middle && !ring && !pinky) {
      return { gesture: GestureType.PINCH, confidence: 0.95 };
    }

    // Fist: No fingers extended (or just thumb slightly out)
    if (extendedCount === 0 || (extendedCount === 1 && thumb && !index && !middle && !ring && !pinky)) {
      return { gesture: GestureType.FIST, confidence: 0.9 };
    }

    // Open Palm: All 5 fingers extended
    if (thumb && index && middle && ring && pinky) {
      return { gesture: GestureType.OPEN_PALM, confidence: 0.95 };
    }

    // Point: Only index extended
    if (index && !middle && !ring && !pinky) {
      return { gesture: GestureType.POINT, confidence: 0.9 };
    }

    // Peace: Index and middle extended
    if (index && middle && !ring && !pinky) {
      return { gesture: GestureType.PEACE, confidence: 0.9 };
    }

    // Rock (horns): Index and pinky extended
    if (index && !middle && !ring && pinky) {
      return { gesture: GestureType.ROCK, confidence: 0.9 };
    }

    // Thumbs up: Only thumb extended, palm rotation indicates direction
    if (thumb && !index && !middle && !ring && !pinky) {
      return { gesture: GestureType.THUMBS_UP, confidence: 0.85 };
    }

    // Spiderman: Thumb, index, and pinky extended
    if (thumb && index && !middle && !ring && pinky) {
      return { gesture: GestureType.SPIDERMAN, confidence: 0.9 };
    }

    // Default to none with low confidence
    return { gesture: GestureType.NONE, confidence: 0.3 };
  }
}

