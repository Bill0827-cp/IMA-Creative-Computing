// Upload the three model files into the same directory as sketch.js.
// Load lip-features.js first; it uses exactly the same preprocessing as the training page.
let camera, detector, classifier, startButton, recordButton, message;
let running = false, loading = false, face = null, faceTime = 0;
let recording = null, predicting = false;
let detectionTimer = null, detectionGeneration = 0, previousVideoTime = -1;
let label = "Waiting for recognition", confidence = 0;
const DURATION = 2000;
const MEDIAPIPE_PATH = "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619";
const frameCanvas = document.createElement("canvas");
const frameContext = frameCanvas.getContext("2d");

function setup() {
  createCanvas(640, 480);
  pixelDensity(1);
  textFont("sans-serif");
  startButton = createButton("Load model and start camera");
  startButton.mousePressed(start);
  recordButton = createButton("Record and predict");
  recordButton.attribute("disabled", "");
  recordButton.mousePressed(beginRecording);
  message = createP("Load the model and allow camera access first.");
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && recording) {
      recording = null;
      message.elt.textContent = "Recording canceled. Keep this page in the foreground.";
    }
  });
  window.addEventListener("pagehide", stop);
}

async function start() {
  if (loading || running) return;
  loading = true;
  startButton.attribute("disabled", "");
  message.elt.textContent = "Loading the word model and FaceMesh. The first load may take a while...";
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
    // Keep source video unmirrored; mirror only the preview in draw.
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
      message.elt.textContent = "Camera disconnected. Please restart it.";
    });
    running = true;
    message.elt.textContent = "Face the camera and click Record when green lip dots appear.";
    previousVideoTime = -1;
    detectLoop(++detectionGeneration);
  } catch (error) {
    stop();
    classifier?.dispose();
    classifier = null;
    detector = null;
    message.elt.textContent = `Loading failed: ${error.message}. Check all three model files and your connection, then retry.`;
  } finally {
    loading = false;
    if (!running) startButton.removeAttribute("disabled");
  }
}

function stop() {
  detectionGeneration++;
  clearTimeout(detectionTimer);
  running = false;
  recording = null;
  face = null;
  camera?.srcObject?.getTracks().forEach(track => track.stop());
  startButton?.removeAttribute("disabled");
}

// Detect one frame at a time and schedule the next afterward to avoid the p5 editor's infinite-loop guard.
async function detectLoop(token) {
  if (!running || token !== detectionGeneration) return;
  try {
      if (camera.readyState < 2 || camera.currentTime === previousVideoTime) {
        return;
      }
      previousVideoTime = camera.currentTime;
      const capturedAt = performance.now();
      const activeRecording = recording;
      frameCanvas.width = camera.videoWidth;
      frameCanvas.height = camera.videoHeight;
      frameContext.drawImage(camera, 0, 0);
      const faces = await detector.detect(frameCanvas);
      if (!running || token !== detectionGeneration) return;
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
  } catch (error) {
    if (token !== detectionGeneration) return;
    stop();
    message.elt.textContent = `Detection interrupted: ${error.message}. Please restart the camera.`;
  } finally {
    if (running && token === detectionGeneration) {
      detectionTimer = setTimeout(() => detectLoop(token), 25);
    }
  }
}

function beginRecording() {
  if (!running || recording || predicting || !face || performance.now() - faceTime > 700) return;
  recording = { started: performance.now() + 3000, frames: [], attempts: 0 };
  label = "Waiting for this result";
  confidence = 0;
  message.elt.textContent = "After the countdown, say one word silently within two seconds.";
}

async function predictAction(item) {
  predicting = true;
  message.elt.textContent = "Predicting...";
  try {
    if (item.frames.length / Math.max(1, item.attempts) < 0.8) {
      throw new Error("Fewer than 80% of frames contain a valid face. Face the camera and record again");
    }
    // Match training: validate frame counts and gaps, normalize coordinates, and resample to 20 frames.
    const features = prepareSample({ durationMs: DURATION, frames: item.frames });
    const results = await classifier.classify(features);
    if (!Array.isArray(results) || !results.length || results.some(
      result => typeof result.label !== "string" || !Number.isFinite(result.confidence)
    )) throw new Error("The model returned invalid results");
    results.sort((a, b) => b.confidence - a.confidence);
    label = results[0].label;
    confidence = results[0].confidence;
    message.elt.textContent = results.map(r => `${r.label}: ${(r.confidence * 100).toFixed(1)}%`).join(" / ") +
      ". Scores are not measured accuracy. You can record again.";
  } catch (error) {
    message.elt.textContent = `Prediction failed: ${error.message}`;
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

  // Use recognition results here to control your p5 artwork.
  const colors = { Hello: "#62db97", "Thank U": "#66b9ff", Omg: "#ffb45c", "No speech": "#cccccc" };
  noStroke();
  fill(0, 190);
  rect(0, height - 85, width, 85);
  fill(colors[label] || "white");
  textSize(26);
  text(`${label} ${confidence ? (confidence * 100).toFixed(1) + "%" : ""}`, 20, height - 48);
  fill(255);
  textSize(18);
  let cue = running ? (face ? "Click Record to capture one complete action" : "No face detected") : "Waiting for camera";
  if (recording) {
    const elapsed = performance.now() - recording.started;
    cue = elapsed < 0 ? `Get ready: ${Math.ceil(-elapsed / 1000)}` : `Say the word: ${Math.max(0, (DURATION - elapsed) / 1000).toFixed(1)} s`;
  }
  if (predicting) cue = "Predicting...";
  text(cue, 20, height - 18);
}
