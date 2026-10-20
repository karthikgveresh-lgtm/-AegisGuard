/**
 * Client-Side Silent Telemetry Collector
 * Captures hardware fingerprints, behavioral dynamics, keystroke cadence,
 * clipboard activity, and mouse movement entropy.
 */

// Simple deterministic string hasher (DJB2 / Murmur hybrid)
export function hashString(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
}

/**
 * 1. Canvas Fingerprinting
 * Renders distinct shapes, text with font kerning, and gradients to capture GPU rasterization variance.
 */
export function getCanvasFingerprint() {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 240;
    canvas.height = 60;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'canvas_unsupported';

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, '#38bdf8');
    grad.addColorStop(1, '#a855f7');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Text with complex kerning and emoji
    ctx.textBaseline = 'top';
    ctx.font = '16px "Arial", sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.fillText('AegisGuard FP 🛡️ ~!@#$', 10, 8);

    ctx.font = '14px "Times New Roman"';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Device-Entropy-9481', 15, 32);

    // Diagonal bezier curve
    ctx.strokeStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(5, 50);
    ctx.bezierCurveTo(40, 10, 180, 50, 230, 20);
    ctx.stroke();

    const dataUrl = canvas.toDataURL();
    return hashString(dataUrl);
  } catch (e) {
    return 'canvas_error';
  }
}

/**
 * 2. WebGL Renderer & Vendor Fingerprinting
 */
export function getWebGLFingerprint() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return 'webgl_unsupported';

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) {
      return hashString(gl.getParameter(gl.RENDERER) || 'webgl_generic');
    }

    const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || '';
    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '';
    return hashString(`${vendor}:::${renderer}`);
  } catch (e) {
    return 'webgl_error';
  }
}

/**
 * Combined stable Device ID hash
 */
export function generateDeviceFingerprint() {
  const canvasHash = getCanvasFingerprint();
  const webglHash = getWebGLFingerprint();
  const screen = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
  const tz = new Date().getTimezoneOffset();
  const lang = navigator.language || 'en';

  const combinedString = `${canvasHash}__${webglHash}__${screen}__${tz}__${lang}`;
  return {
    deviceId: `dev_${hashString(combinedString)}`,
    canvasHash,
    webglHash,
    userAgent: navigator.userAgent,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    colorDepth: window.screen.colorDepth,
    timezoneOffset: tz,
    language: lang
  };
}

/**
 * 3. Behavioral Telemetry Tracker Class
 */
export class TelemetryTracker {
  constructor() {
    this.startTime = performance.now();
    this.keystrokes = []; // Inter-key intervals in ms
    this.lastKeyTime = null;
    this.pasteDetected = false;
    this.mousePositions = [];
    this.isListening = false;
    this.mouseEntropy = 0.65; // Default realistic fallback
  }

  start() {
    this.startTime = performance.now();
    this.keystrokes = [];
    this.lastKeyTime = null;
    this.pasteDetected = false;
    this.mousePositions = [];
    this.isListening = true;

    this._onMouseMove = (e) => {
      if (!this.isListening) return;
      const now = performance.now();
      // Sample mouse events (max 50 points to prevent memory bloat)
      if (this.mousePositions.length === 0 || now - this.mousePositions[this.mousePositions.length - 1].t > 40) {
        this.mousePositions.push({ x: e.clientX, y: e.clientY, t: now });
        if (this.mousePositions.length > 50) {
          this.mousePositions.shift();
        }
      }
    };

    window.addEventListener('mousemove', this._onMouseMove, { passive: true });
  }

  stop() {
    this.isListening = false;
    if (this._onMouseMove) {
      window.removeEventListener('mousemove', this._onMouseMove);
    }
  }

  recordKeydown() {
    const now = performance.now();
    if (this.lastKeyTime !== null) {
      const interval = Math.round(now - this.lastKeyTime);
      if (interval > 10 && interval < 3000) {
        this.keystrokes.push(interval);
      }
    }
    this.lastKeyTime = now;
  }

  recordPaste() {
    this.pasteDetected = true;
  }

  calculateMouseEntropy() {
    if (this.mousePositions.length < 5) {
      return 0.0; // Bot or no mouse moved
    }

    // Measure direction changes and curvature
    let angleChanges = 0;
    let totalDistance = 0;

    for (let i = 2; i < this.mousePositions.length; i++) {
      const p0 = this.mousePositions[i - 2];
      const p1 = this.mousePositions[i - 1];
      const p2 = this.mousePositions[i];

      const angle1 = Math.atan2(p1.y - p0.y, p1.x - p0.x);
      const angle2 = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      const diff = Math.abs(angle2 - angle1);

      if (diff > 0.05 && diff < Math.PI * 1.8) {
        angleChanges++;
      }

      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      totalDistance += dist;
    }

    if (totalDistance < 30) return 0.02; // Practically stationary

    // Higher ratio of angle variations indicates natural hand micro-tremor
    const varianceRatio = angleChanges / (this.mousePositions.length - 2);
    // Normalize into 0.0 - 0.95 range
    return Number(Math.min(0.95, Math.max(0.02, varianceRatio * 1.4)).toFixed(2));
  }

  getSnapshot(presetOverride = null) {
    if (presetOverride) {
      return presetOverride;
    }

    const dwellMs = Math.round(performance.now() - this.startTime);
    const calculatedJitter = this.calculateMouseEntropy();

    // Keystroke statistics
    let meanMs = 150;
    let stdDevMs = 38;

    if (this.keystrokes.length >= 2) {
      const sum = this.keystrokes.reduce((a, b) => a + b, 0);
      meanMs = Math.round(sum / this.keystrokes.length);
      const variance = this.keystrokes.reduce((acc, val) => acc + Math.pow(val - meanMs, 2), 0) / (this.keystrokes.length - 1);
      stdDevMs = Math.round(Math.sqrt(variance));
    }

    return {
      paste_detected: this.pasteDetected,
      form_dwell_ms: dwellMs,
      mouse_jitter: calculatedJitter,
      keystroke_cadence: {
        mean_ms: meanMs,
        std_dev_ms: stdDevMs
      }
    };
  }
}
