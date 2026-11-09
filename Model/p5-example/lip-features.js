const FEATURE_CONFIG = Object.freeze({
  version: "outer-lips-xy-eyes-20frames-v1",
  lipIndices: Object.freeze([61, 146, 91, 181, 84, 17, 314, 405, 321, 375,
    291, 409, 270, 269, 267, 0, 37, 39, 40, 185]),
  eyeIndices: Object.freeze([33, 263]),
  frameCount: 20,
  durationMs: 2000,
  maxGapMs: 450,
  normalization: "eye-midpoint-rotation-distance",
  interpolation: "linear-with-endpoint-hold",
  coordinateOrder: "frame-then-lip-index-then-x-y"
});
const FEATURE_SIZE = FEATURE_CONFIG.frameCount * FEATURE_CONFIG.lipIndices.length * 2;

// Read one landmark from a frame. Raw format is [x, y, z]; this experiment uses only x and y.
function readFeaturePoint(keypoints, index) {
  const point = keypoints?.[index];
  if (!Array.isArray(point) || !Number.isFinite(point[0]) || !Number.isFinite(point[1])) {
    throw new Error(`Landmark ${index} is missing or invalid. Please record this sample again.`);
  }
  return point;
}

// Normalize each frame using the outer-eye midpoint as origin, eye distance as scale, and eye line as horizontal axis.
// This reduces translation, distance, and in-plane head tilt effects; it cannot fully correct profiles or perspective.
// Do not scale by mouth width, which would remove real changes in lip width.
function normalizeLipFrame(frame) {
  const a = readFeaturePoint(frame.keypoints, FEATURE_CONFIG.eyeIndices[0]);
  const b = readFeaturePoint(frame.keypoints, FEATURE_CONFIG.eyeIndices[1]);
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const distance = Math.hypot(dx, dy);
  if (distance < 1) throw new Error("Eye distance is too small to normalize coordinates. Please record again.");
  const centerX = (a[0] + b[0]) / 2;
  const centerY = (a[1] + b[1]) / 2;
  const cos = dx / distance;
  const sin = dy / distance;
  const features = [];
  for (const index of FEATURE_CONFIG.lipIndices) {
    const point = readFeaturePoint(frame.keypoints, index);
    const x = point[0] - centerX;
    const y = point[1] - centerY;
    // Rotate the eye line to horizontal, then divide by eye distance. Each point yields two numbers.
    features.push((x * cos + y * sin) / distance);
    features.push((-x * sin + y * cos) / distance);
  }
  return features;
}

// Main entry point: one complete recording becomes exactly 800 numbers.
// Training and prediction must share this function and use identical preprocessing.
function prepareSample(sample) {
  if (!sample || sample.durationMs !== FEATURE_CONFIG.durationMs) {
    throw new Error("This version requires complete 2000 ms recordings.");
  }
  if (!Array.isArray(sample.frames) || sample.frames.length < 12) {
    throw new Error("A sample needs at least 12 valid frames.");
  }

  const frames = sample.frames;
  let previousTime = -1;
  for (const frame of frames) {
    const time = frame?.timeMs;
    if (!Number.isFinite(time) || time < 0 || time > sample.durationMs || time <= previousTime) {
      throw new Error("Frame timestamps must increase strictly within the recording window.");
    }
    if (previousTime >= 0 && time - previousTime > FEATURE_CONFIG.maxGapMs) {
      throw new Error("Too many missing frames for interpolation. Please record again.");
    }
    previousTime = time;
  }
  if (frames[0].timeMs > FEATURE_CONFIG.maxGapMs ||
      sample.durationMs - frames[frames.length - 1].timeMs > FEATURE_CONFIG.maxGapMs) {
    throw new Error("Too much data is missing at the start or end. Please record again.");
  }

  // Each raw frame yields 40 numbers: 20 lip points times 2 coordinates.
  const normalized = frames.map(normalizeLipFrame);
  const result = [];
  let left = 0;
  for (let i = 0; i < FEATURE_CONFIG.frameCount; i++) {
    // Sample uniformly across 0-2000 ms using timestamps, rather than selecting every nth frame.
    const targetTime = i * sample.durationMs / (FEATURE_CONFIG.frameCount - 1);
    if (targetTime <= frames[0].timeMs) {
      result.push(...normalized[0]);
      continue;
    }
    if (targetTime >= frames[frames.length - 1].timeMs) {
      result.push(...normalized[normalized.length - 1]);
      continue;
    }
    while (frames[left + 1].timeMs < targetTime) left++;
    const right = left + 1;
    const ratio = (targetTime - frames[left].timeMs) / (frames[right].timeMs - frames[left].timeMs);
    // Linear interpolation blends coordinates according to the target time between two frames.
    // For ratio=0.25, combine 75% of the left frame and 25% of the right frame.
    for (let j = 0; j < normalized[left].length; j++) {
      result.push(normalized[left][j] * (1 - ratio) + normalized[right][j] * ratio);
    }
  }
  // Hold the nearest frame for short uncovered endpoints; excessive gaps were rejected above.
  if (result.length !== FEATURE_SIZE || !result.every(Number.isFinite)) {
    throw new Error("Failed to generate action features.");
  }
  return result;
}

