/**
 * gestureTracker.js
 * MediaPipe Hands gesture tracker
 * Sensitive gesture model: grab, stretch, steering, twist
 */

class GestureTracker {
  constructor(videoElement, skeletonCanvas, onGestureCallback) {
    this.video = videoElement;
    this.canvas = skeletonCanvas;
    this.ctx = skeletonCanvas.getContext('2d');
    this.onGesture = onGestureCallback;
    this.showSkeleton = false;

    this.currentData = {
      leftHand: { detected: false, x: 0.5, y: 0.5, pinchDist: 1, isPinching: false, isGrabbing: false, openFactor: 0.5, roll: 0, rollDelta: 0, upAngle: 0 },
      rightHand: { detected: false, x: 0.5, y: 0.5, pinchDist: 1, isPinching: false, isGrabbing: false, openFactor: 0.5, roll: 0, rollDelta: 0, upAngle: 0 },
      handsDistance: null,
      twoHandsPinching: false,
      anyGrabbing: false,
      twoHandsGrabbing: false,
      handsAngle: 0,
      angleDelta: 0,   // steering angular velocity (rad/frame) for continuous rotation
      twist: 0,        // two-hand relative twist -1..1
      motion: 0,       // hand motion intensity 0..1
      flowX: 0,        // dominant motion direction X
      flowY: 0         // dominant motion direction Y
    };

    // Track matching: indices are identities A/B to keep velocity/twist continuous through crossings; left/right assigned by x
    this.tracks = [
      { x: 0.25, y: 0.5, roll: 0, present: false, isPinching: false, lastSeen: 0 },
      { x: 0.75, y: 0.5, roll: 0, present: false, isPinching: false, lastSeen: 0 }
    ];
    this.prevHandsAngle = null;
    this.smoothedTwist = 0;
    this.lastFrameTime = performance.now();

    window.currentGestureData = this.currentData;
    this.initMediaPipe();
  }

  static wrapAngle(a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  }

  async initMediaPipe() {
    this.hands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });

    this.hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 0,
      minDetectionConfidence: 0.4,
      minTrackingConfidence: 0.4
    });

    this.hands.onResults((results) => this.onResults(results));

    this.camera = new Camera(this.video, {
      onFrame: async () => { await this.hands.send({ image: this.video }); },
      width: 640,
      height: 480
    });

    await this.camera.start();
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  buildHandInfo(landmarks) {
    const l = landmarks;
    const px = (l[4].x + l[8].x) * 0.5;
    const py = (l[4].y + l[8].y) * 0.5;
    const dx = l[4].x - l[8].x;
    const dy = l[4].y - l[8].y;
    const dz = (l[4].z || 0) - (l[8].z || 0);
    // Down-weight z-axis noise for stable, sensitive pinch detection
    const pinchDist = Math.sqrt(dx * dx + dy * dy + 0.25 * dz * dz);

    const wrist = l[0];
    let totalDist = 0;
    for (const tipIdx of [4, 8, 12, 16, 20]) {
      totalDist += Math.hypot(l[tipIdx].x - wrist.x, l[tipIdx].y - wrist.y);
    }
    const avgDist = totalDist / 5;
    const palmLen = Math.max(Math.hypot(wrist.x - l[9].x, wrist.y - l[9].y), 0.025);
    const openFactor = Math.min(Math.max((avgDist / palmLen - 1.05) / 0.8, 0), 1);

    // Palm roll angle: index MCP[5] -> pinky MCP[17]
    const roll = Math.atan2(l[17].y - l[5].y, l[17].x - l[5].x);
    // Palm facing: wrist[0] -> middle MCP[9]
    const upAngle = Math.atan2(l[9].y - l[0].y, l[9].x - l[0].x);

    return { px, py, pinchDist, openFactor, roll, upAngle, landmarks: l };
  }

  onResults(results) {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const now = performance.now();
    const dt = Math.min(Math.max((now - this.lastFrameTime) / 1000, 1 / 240), 0.1);
    this.lastFrameTime = now;

    const dets = [];
    if (results.multiHandLandmarks) {
      for (const lm of results.multiHandLandmarks) {
        dets.push(this.buildHandInfo(lm));
      }
    }

    // Nearest-neighbor matching: detected hands -> existing tracks, identity continuous (allows crossing)
    const assigned = new Array(this.tracks.length).fill(null);
    const usedDet = new Array(dets.length).fill(false);
    for (let ti = 0; ti < this.tracks.length; ti++) {
      let best = -1, bestD = Infinity;
      for (let di = 0; di < dets.length; di++) {
        if (usedDet[di]) continue;
        const dist = Math.hypot(dets[di].px - this.tracks[ti].x, dets[di].py - this.tracks[ti].y);
        if (dist < bestD && dist < 0.35) { bestD = dist; best = di; }
      }
      if (best >= 0) { assigned[ti] = dets[best]; usedDet[best] = true; }
    }
    // Assign remaining detections to free tracks (new hands)
    for (let di = 0; di < dets.length; di++) {
      if (usedDet[di]) continue;
      for (let ti = 0; ti < this.tracks.length; ti++) {
        if (!assigned[ti]) { assigned[ti] = dets[di]; usedDet[di] = true; break; }
      }
    }

    // Build handInfo with velocity/twist and update the track
    const infos = [];
    for (let ti = 0; ti < this.tracks.length; ti++) {
      const t = this.tracks[ti];
      const d = assigned[ti];
      // Graceful hold: MediaPipe briefly drops a hand (a few frames) during fast
      // motion or partial occlusion, which makes the app flicker between one and
      // two hands. Keep the last known hand alive for a short window so the cloud
      // and music don't snap back every time a detection hiccups.
      if (!d) {
        if (t.present && (now - t.lastSeen) < 200) {
          const info = {
            detected: true, x: t.x, y: t.y, vx: 0, vy: 0, speed: 0,
            pinchDist: 1, isPinching: t.isPinching, openFactor: 0.5,
            roll: t.roll, rollDelta: 0, upAngle: 0, landmarks: null
          };
          infos.push(info);
        } else {
          t.present = false;
          t.isPinching = false;
        }
        continue;
      }

      const matched = t.present;
      const held = matched && t.isPinching && Math.hypot(d.px - t.x, d.py - t.y) < 0.22;
      const palmLen = Math.max(Math.hypot(d.landmarks[0].x - d.landmarks[9].x, d.landmarks[0].y - d.landmarks[9].y), 0.025);
      const isPinching = d.pinchDist / palmLen < (held ? 0.66 : 0.46);
      const rollDelta = matched ? GestureTracker.wrapAngle(d.roll - t.roll) : 0;

      const vx = matched ? Math.max(-2, Math.min(2, (d.px - t.x) / dt)) : 0;
      const vy = matched ? Math.max(-2, Math.min(2, (d.py - t.y) / dt)) : 0;
      const info = {
        detected: true,
        x: d.px, y: d.py,
        vx: vx,
        vy: vy,
        speed: Math.hypot(vx, vy),
        pinchDist: d.pinchDist,
        isPinching: isPinching,
        openFactor: d.openFactor,
        roll: d.roll,
        rollDelta: rollDelta,
        upAngle: d.upAngle,
        landmarks: d.landmarks
      };

      t.x = d.px; t.y = d.py; t.roll = d.roll; t.present = true; t.isPinching = isPinching; t.lastSeen = now;
      infos.push(info);

      if (this.showSkeleton) this.drawHandSkeleton(d.landmarks);
    }

    // Split left/right by x (identity continuity guaranteed by tracks)
    infos.sort((a, b) => a.x - b.x);
    let left = null, right = null;
    if (infos.length === 2) { left = infos[0]; right = infos[1]; }
    else if (infos.length === 1) { if (infos[0].x < 0.5) left = infos[0]; else right = infos[0]; }

    this.currentData.updatedAt = now;
    this.currentData.leftHand = left || { detected: false, x: 0.5, y: 0.5, pinchDist: 1, isPinching: false, openFactor: 0.5, roll: 0, rollDelta: 0, upAngle: 0 };
    this.currentData.rightHand = right || { detected: false, x: 0.5, y: 0.5, pinchDist: 1, isPinching: false, openFactor: 0.5, roll: 0, rollDelta: 0, upAngle: 0 };

    // Two-hand correlation features
    if (left && right) {
      const dx = right.x - left.x, dy = right.y - left.y;
      this.currentData.handsDistance = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);
      this.currentData.handsAngle = angle;

      if (this.prevHandsAngle === null) {
        this.prevHandsAngle = angle;
        this.currentData.angleDelta = 0;
      } else {
        this.currentData.angleDelta = GestureTracker.wrapAngle(angle - this.prevHandsAngle);
        this.prevHandsAngle = angle;
      }

      const relRoll = GestureTracker.wrapAngle(right.roll - left.roll);
      const twistTarget = Math.max(-1, Math.min(1, Math.sin(relRoll)));
      this.smoothedTwist += (twistTarget - this.smoothedTwist) * 0.35;
      this.currentData.twist = this.smoothedTwist;

      this.currentData.twoHandsPinching = left.isPinching && right.isPinching;
    } else {
      this.currentData.handsDistance = null;
      this.currentData.handsAngle = 0;
      this.currentData.angleDelta = 0;
      this.currentData.twist = 0;
      this.currentData.twoHandsPinching = false;
      this.prevHandsAngle = null;
      this.smoothedTwist = 0;
    }

    this.currentData.anyGrabbing = (left && left.isPinching) || (right && right.isPinching);
    this.currentData.twoHandsGrabbing = this.currentData.twoHandsPinching;

    // Hand motion: velocity intensity and dominant direction (drive cloud flow and music)
    if (infos.length) {
      const fastest = infos.reduce((a, b) => (a.speed >= b.speed ? a : b));
      const speedNorm = Math.min(1, fastest.speed / 1.5);
      this.currentData.motion += (speedNorm - this.currentData.motion) * 0.3;
      this.currentData.flowX += (fastest.vx - this.currentData.flowX) * 0.35;
      this.currentData.flowY += (fastest.vy - this.currentData.flowY) * 0.35;
    } else {
      this.currentData.motion += (0 - this.currentData.motion) * 0.15;
      this.currentData.flowX += (0 - this.currentData.flowX) * 0.15;
      this.currentData.flowY += (0 - this.currentData.flowY) * 0.15;
    }

    window.currentGestureData = this.currentData;
    if (this.onGesture) this.onGesture(this.currentData);
  }

  drawHandSkeleton(landmarks) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4],
      [0, 5], [5, 6], [6, 7], [7, 8],
      [0, 9], [9, 10], [10, 11], [11, 12],
      [0, 13], [13, 14], [14, 15], [15, 16],
      [0, 17], [17, 18], [18, 19], [19, 20],
      [5, 9], [9, 13], [13, 17]
    ];

    ctx.save();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(14, 165, 233, 0.4)';
    for (const [s, e] of connections) {
      ctx.beginPath();
      ctx.moveTo(landmarks[s].x * w, landmarks[s].y * h);
      ctx.lineTo(landmarks[e].x * w, landmarks[e].y * h);
      ctx.stroke();
    }
    ctx.restore();
  }

  toggleSkeleton() {
    this.showSkeleton = !this.showSkeleton;
    if (!this.showSkeleton) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    return this.showSkeleton;
  }
}

window.GestureTracker = GestureTracker;
