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

// 从一帧里读取一个点。原始格式是 [x, y, z]，这个实验只使用 x、y。
function readFeaturePoint(keypoints, index) {
  const point = keypoints?.[index];
  if (!Array.isArray(point) || !Number.isFinite(point[0]) || !Number.isFinite(point[1])) {
    throw new Error(`关键点 ${index} 缺失或坐标无效，请重新采集这个样本。`);
  }
  return point;
}

// 校正单帧坐标：以两眼外角中点为原点，眼角距离为单位，眼角连线为横轴。
// 这样可以减少头部平移、远近和画面内歪头的影响；不能完全校正侧脸或透视变化。
// 不用嘴巴宽度做尺度，以免把真实的嘴型宽度变化消掉。
function normalizeLipFrame(frame) {
  const a = readFeaturePoint(frame.keypoints, FEATURE_CONFIG.eyeIndices[0]);
  const b = readFeaturePoint(frame.keypoints, FEATURE_CONFIG.eyeIndices[1]);
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const distance = Math.hypot(dx, dy);
  if (distance < 1) throw new Error("眼角距离过小，无法校正坐标，请重新采集。");
  const centerX = (a[0] + b[0]) / 2;
  const centerY = (a[1] + b[1]) / 2;
  const cos = dx / distance;
  const sin = dy / distance;
  const features = [];
  for (const index of FEATURE_CONFIG.lipIndices) {
    const point = readFeaturePoint(frame.keypoints, index);
    const x = point[0] - centerX;
    const y = point[1] - centerY;
    // 先旋转到眼角连线水平，再除以眼角距离。每个点输出两个数字。
    features.push((x * cos + y * sin) / distance);
    features.push((-x * sin + y * cos) / distance);
  }
  return features;
}

// 主要入口：传入一次完整录制，返回恰好 800 个数字。
// 训练和之后的预测必须共同调用此函数，不能各用不同处理方法。
function prepareSample(sample) {
  if (!sample || sample.durationMs !== FEATURE_CONFIG.durationMs) {
    throw new Error("此版本只处理 2000 毫秒的完整录制。");
  }
  if (!Array.isArray(sample.frames) || sample.frames.length < 12) {
    throw new Error("样本至少需要 12 个有效帧。");
  }

  const frames = sample.frames;
  let previousTime = -1;
  for (const frame of frames) {
    const time = frame?.timeMs;
    if (!Number.isFinite(time) || time < 0 || time > sample.durationMs || time <= previousTime) {
      throw new Error("帧时间必须在录制范围内，并且严格递增。");
    }
    if (previousTime >= 0 && time - previousTime > FEATURE_CONFIG.maxGapMs) {
      throw new Error("样本中途缺帧过多，不适合插值，请重新采集。");
    }
    previousTime = time;
  }
  if (frames[0].timeMs > FEATURE_CONFIG.maxGapMs ||
      sample.durationMs - frames[frames.length - 1].timeMs > FEATURE_CONFIG.maxGapMs) {
    throw new Error("样本开头或结尾缺失过多，请重新采集。");
  }

  // 每个原始帧先得到 40 个数：20 个嘴唇点 × 2 个坐标。
  const normalized = frames.map(normalizeLipFrame);
  const result = [];
  let left = 0;
  for (let i = 0; i < FEATURE_CONFIG.frameCount; i++) {
    // 时间均匀分布于 0～2000 毫秒，使用时间戳而不是简单每隔几帧取一帧。
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
    // 线性插值：目标时间位于两帧之间时，按距离混合坐标。
    // 例如 ratio=0.25，就取左帧的 75% 加右帧的 25%。
    for (let j = 0; j < normalized[left].length; j++) {
      result.push(normalized[left][j] * (1 - ratio) + normalized[right][j] * ratio);
    }
  }
  // 首尾没有覆盖到的短区间沿用最近帧；过长缺失已在上面拒绝。
  if (result.length !== FEATURE_SIZE || !result.every(Number.isFinite)) {
    throw new Error("动作特征生成失败。");
  }
  return result;
}

