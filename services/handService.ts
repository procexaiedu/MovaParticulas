import { HandMetricsExtractor, ContinuousHandMetrics } from './handMetrics';

export class HandService {
  private hands: any;
  private camera: any;
  private videoElement: HTMLVideoElement | null = null;
  private onResultsCallback: (metrics: ContinuousHandMetrics) => void;
  private metricsExtractor = new HandMetricsExtractor();
  private lastTime: number = 0;

  constructor(onResults: (metrics: ContinuousHandMetrics) => void) {
    this.onResultsCallback = onResults;
  }

  public async initialize() {
    const checkLib = () => (window as any).Hands && (window as any).Camera;
    
    if (!checkLib()) {
      console.warn("MediaPipe libraries not loaded yet. Retrying...");
      for (let i = 0; i < 10; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));
        if (checkLib()) break;
      }
      if (!checkLib()) {
        console.error("MediaPipe libraries failed to load");
        return;
      }
    }

    const { Hands, Camera } = window as any;

    this.hands = new Hands({
      locateFile: (file: string) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      },
    });

    this.hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,        // Full model for accuracy
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.6,
    });

    this.hands.onResults(this.processResults);

    this.videoElement = document.createElement('video');
    this.videoElement.style.display = 'none';
    this.videoElement.id = 'hand-tracking-video';
    document.body.appendChild(this.videoElement);

    this.camera = new Camera(this.videoElement, {
      onFrame: async () => {
        if (this.videoElement && this.hands) {
          await this.hands.send({ image: this.videoElement });
        }
      },
      width: 640,
      height: 480,
    });

    this.camera.start();
  }

  private processResults = (results: any) => {
    const now = performance.now();
    const deltaTime = this.lastTime > 0 ? (now - this.lastTime) / 1000 : 0.016;
    this.lastTime = now;

    const landmarks = results.multiHandLandmarks?.[0] ?? null;
    const metrics = this.metricsExtractor.extract(landmarks, deltaTime);
    
    this.onResultsCallback(metrics);
  };

  public getVideoElement(): HTMLVideoElement | null {
    return this.videoElement;
  }

  public stop() {
    if (this.camera) this.camera.stop();
    if (this.videoElement) this.videoElement.remove();
    this.metricsExtractor.reset();
  }
}

// Re-export for convenience
export type { ContinuousHandMetrics } from './handMetrics';
