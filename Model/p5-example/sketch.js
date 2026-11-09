// 上传模型的三个文件到与 sketch.js 相同的目录。
// lip-features.js 必须先加载：它与训练页面使用完全相同的预处理。
let camera, detector, classifier, startButton, recordButton, message;
let running = false, loading = false, face = null, faceTime = 0;
let recording = null, predicting = false;
let label = "等待识别", confidence = 0;
const DURATION = 2000;
const MEDIAPIPE_PATH = "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619";
const frameCanvas = document.createElement("canvas");
const frameContext = frameCanvas.getContext("2d");

function setup() {
  createCanvas(640, 480);
  pixelDensity(1);
  textFont("sans-serif");
  startButton = createButton("加载模型并开启摄像头");
  startButton.mousePressed(start);
  recordButton = createButton("录制新动作并预测");
  recordButton.attribute("disabled", "");
  recordButton.mousePressed(beginRecording);
  message = createP("先加载模型，并允许摄像头权限。");
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && recording) {
      recording = null;
      message.elt.textContent = "录制已取消：请保持页面在前台。";
    }
  });
  window.addEventListener("pagehide", stop);
}

async function start() {
  if (loading || running) return;
  loading = true;
  startButton.attribute("disabled", "");
  message.elt.textContent = "正在加载词语模型和 FaceMesh，首次加载可能较慢……";
  try {
    await ml5.tf.setBackend("webgl");
    await ml5.tf.ready();
    if (!classifier) {
      classifier = ml5.neuralNetwork({
        inputs: FEATURE_SIZE, outputs: ["label"], task: "classification"
      });
      await classifier.ready;
      await classifier.load({
        model: "model.json",
        metadata: "model_meta.json",
        weights: "model.weights.bin"
      });
    }
    if (!detector) {
      detector = ml5.faceMesh({
        runtime: "mediapipe", solutionPath: MEDIAPIPE_PATH,
        maxFaces: 1, refineLandmarks: false, flipHorizontal: false
      });
      await detector.ready;
    }
    // 原始视频不镜像；只有 draw 中的预览镜像。
    camera = document.createElement("video");
    camera.muted = true;
    camera.playsInline = true;
    camera.srcObject = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 640 }, height: { ideal: 480 } }, audio: false
    });
    await camera.play();
    camera.width = camera.videoWidth;
    camera.height = camera.videoHeight;
    camera.srcObject.getVideoTracks()[0].addEventListener("ended", () => {
      stop();
      message.elt.textContent = "摄像头已断开，请重新开启。";
    });
    running = true;
    message.elt.textContent = "请正对镜头，看到绿色嘴唇点后点击录制。";
    detectLoop();
  } catch (error) {
    stop();
    classifier?.dispose();
    classifier = null;
    detector = null;
    message.elt.textContent = `加载失败：${error.message}。检查模型三个文件及网络，然后重试。`;
  } finally {
    loading = false;
    if (!running) startButton.removeAttribute("disabled");
  }
}

function stop() {
  running = false;
  recording = null;
  face = null;
  camera?.srcObject?.getTracks().forEach(track => track.stop());
  startButton?.removeAttribute("disabled");
}

async function detectLoop() {
  let previousVideoTime = -1;
  try {
    while (running) {
      if (camera.readyState < 2 || camera.currentTime === previousVideoTime) {
        await new Promise(resolve => setTimeout(resolve, 20));
        continue;
      }
      previousVideoTime = camera.currentTime;
      const capturedAt = performance.now();
      const activeRecording = recording;
      frameCanvas.width = camera.videoWidth;
      frameCanvas.height = camera.videoHeight;
      frameContext.drawImage(camera, 0, 0);
      const faces = await detector.detect(frameCanvas);
      if (!running) return;
      const candidate = faces[0];
      const valid = candidate?.keypoints?.length >= 468 && candidate.keypoints.every(
        p => Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z)
      );
      face = valid ? candidate : null;
      faceTime = capturedAt;
      if (activeRecording && recording === activeRecording) {
        const timeMs = Math.round(capturedAt - activeRecording.started);
        if (timeMs >= 0 && timeMs <= DURATION) {
          activeRecording.attempts++;
          if (valid) activeRecording.frames.push({
            timeMs,
            keypoints: face.keypoints.map(p => [p.x, p.y, p.z].map(v => Number(v.toFixed(3))))
          });
        }
        if (performance.now() >= activeRecording.started + DURATION) {
          recording = null;
          await predictAction(activeRecording);
        }
      }
      await new Promise(resolve => setTimeout(resolve, 25));
    }
  } catch (error) {
    stop();
    message.elt.textContent = `检测中断：${error.message}。请重新开启。`;
  }
}

function beginRecording() {
  if (!running || recording || predicting || !face || performance.now() - faceTime > 700) return;
  recording = { started: performance.now() + 3000, frames: [], attempts: 0 };
  label = "等待本次结果";
  confidence = 0;
  message.elt.textContent = "倒计时结束后，在两秒内无声说一次词语。";
}

async function predictAction(item) {
  predicting = true;
  message.elt.textContent = "正在预测……";
  try {
    if (item.frames.length / Math.max(1, item.attempts) < 0.8) {
      throw new Error("人脸有效帧不足 80%，请保持正对镜头后重录");
    }
    // 同训练页面：检查帧数和缺口，空间校正，重采样到 20 帧。
    const features = prepareSample({ durationMs: DURATION, frames: item.frames });
    const results = await classifier.classify(features);
    if (!Array.isArray(results) || !results.length || results.some(
      result => typeof result.label !== "string" || !Number.isFinite(result.confidence)
    )) throw new Error("模型返回的结果无效");
    results.sort((a, b) => b.confidence - a.confidence);
    label = results[0].label;
    confidence = results[0].confidence;
    message.elt.textContent = results.map(r => `${r.label}: ${(r.confidence * 100).toFixed(1)}%`).join(" / ") +
      "。分数不是实际正确率。可以再次录制。";
  } catch (error) {
    message.elt.textContent = `预测失败：${error.message}`;
  } finally {
    predicting = false;
  }
}

function draw() {
  background(25);
  if (running && camera?.readyState >= 2) {
    push();
    translate(width, 0);
    scale(-1, 1);
    drawingContext.drawImage(camera, 0, 0, width, height);
    if (face) {
      noStroke();
      fill(100, 255, 150);
      for (const index of FEATURE_CONFIG.lipIndices) {
        const p = face.keypoints[index];
        circle(p.x * width / camera.videoWidth, p.y * height / camera.videoHeight, 5);
      }
    }
    pop();
  }
  const canRecord = running && face && performance.now() - faceTime < 700 && !recording && !predicting;
  if (canRecord) recordButton.removeAttribute("disabled");
  else recordButton.attribute("disabled", "");

  // 在这里使用识别结果控制你的 p5 作品。
  const colors = { Hello: "#62db97", "Thank U": "#66b9ff", Omg: "#ffb45c", "No speech": "#cccccc" };
  noStroke();
  fill(0, 190);
  rect(0, height - 85, width, 85);
  fill(colors[label] || "white");
  textSize(26);
  text(`${label} ${confidence ? (confidence * 100).toFixed(1) + "%" : ""}`, 20, height - 48);
  fill(255);
  textSize(18);
  let cue = running ? (face ? "点击按钮录制一个完整动作" : "未检测到人脸") : "等待开启摄像头";
  if (recording) {
    const elapsed = performance.now() - recording.started;
    cue = elapsed < 0 ? `准备：${Math.ceil(-elapsed / 1000)}` : `开始说词语：${Math.max(0, (DURATION - elapsed) / 1000).toFixed(1)} 秒`;
  }
  if (predicting) cue = "正在预测……";
  text(cue, 20, height - 18);
}
