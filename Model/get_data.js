"use strict";

// Learning guide: start with the button handlers, then startCamera -> detectLoop -> beginRecording -> exportData.
// This file handles capture, preprocessing, word classifier training, and prediction. FaceMesh is pretrained; speech synthesis is not included.
// A function declaration defines behavior; its body runs only when a button or another function calls it.
// const prevents reassignment; let permits it. A const array can still accept new elements.

// First collect raw landmarks, then apply spatial normalization and time resampling before training.
// Setup and state: $ finds an element by ID; for example, $("camera") selects the video.
const $ = id => document.getElementById(id);
const video = $("camera");
const canvas = $("overlay");
const ctx = canvas.getContext("2d");
// LABELS defines the target classes. DURATION is in milliseconds: 2000 ms equals 2 seconds.
const LABELS = ["Hello", "Thank U", "Omg", "No speech"];
const DURATION = 2000;
const ML5_URL = "https://cdn.jsdelivr.net/npm/ml5@1.2.1/dist/ml5.min.js";
const MEDIAPIPE_PATH = "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619";
// Keep model input separate from the visible overlay so layout dimensions do not affect image pixels.
const inputCanvas = document.createElement("canvas");
const inputContext = inputCanvas.getContext("2d");
// sessionId identifies this capture session; samples holds completed recordings in memory until export.
// Samples from the same page session share sessionId; reloading generates a new ID.
// This identifies capture sessions, not people, and can be used to split training and test data.
const sessionId = crypto.randomUUID();
// Data hierarchy: samples -> one sample -> frames -> keypoints -> [x, y, z].
// All classes share this array and are distinguished by label, rather than separate files.
// Data stays in browser memory; it is not automatically saved to disk, localStorage, or a database. Reloading loses it.
const samples = [];
// stream is the camera stream; model is the detector; null means no object has been assigned yet.
let stream = null, model = null, modelPromise = null;
// running tracks detection, starting tracks initialization, and generation invalidates canceled tasks.
let running = false, starting = false, generation = 0;
// latestFace holds the latest face, operation holds the active recording, and unsaved tracks unexported changes.
let latestFace = null, latestTime = 0, operation = null, unsaved = false;
let lastVideoTime = -1;

// Update messages with textContent; classList toggles error styling.
function status(text, error = false) {
  delete $("status").dataset.trackingCategory;
  $("status").textContent = text;
  $("status").classList.toggle("error", error);
}

// Enable controls based on state; recording requires a detected face.
// freshFace checks result freshness; disabled=true prevents clicks.
function controls() {
  const freshFace = latestFace && performance.now() - latestTime < 700;
  $("start").disabled = starting || running || wordModel.busy;
  $("stop").disabled = !starting && !running;
  $("record").disabled = !running || !freshFace || !!operation || wordModel.busy;
  $("label").disabled = !!operation;
  $("cancel").hidden = !operation;
  $("export").disabled = !samples.length || !!operation;
  $("undo").disabled = !samples.length || !!operation || wordModel.busy;
  $("label").disabled = !!operation || wordModel.busy;
  $("train").disabled = !samples.length || !!operation || wordModel.busy;
  $("export-model").disabled = !wordModel.ready || wordModel.busy || !!operation || wordModel.trainedRevision !== wordModel.revision;
  $("import").disabled = !!operation || wordModel.busy;
  $("predict").disabled = !running || !freshFace || !!operation || wordModel.busy || !wordModel.ready;
}

// Limit asynchronous waits so model loading cannot run indefinitely. Beginners can skip this helper.
// Promise.race uses the first settled result; finally clears the timer on success or failure.
function timeout(promise, ms, message) {
  let timer;
  return Promise.race([promise, new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  })]).finally(() => clearTimeout(timer));
}

// Load ml5. A Promise represents pending work: resolve succeeds, reject fails.
function loadLibrary() {
  if (window.ml5) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = ML5_URL;
    script.onload = resolve;
    script.onerror = () => { script.remove(); reject(new Error("Failed to load ml5. Check your connection and try again.")); };
    document.head.append(script);
  });
}

// Load the pretrained FaceMesh detector; this does not train our word classifier.
// MediaPipe is the detection runtime; pinned URLs avoid mixing library versions.
// Reuse modelPromise to avoid duplicate downloads when the user clicks repeatedly.
function loadModel() {
  if (!modelPromise) {
    modelPromise = (async () => {
      await loadLibrary();
      // Use pinned MediaPipe resources instead of the previous default TFJS runtime.
      if (!window.FaceMesh) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = `${MEDIAPIPE_PATH}/face_mesh.js`;
          script.onload = resolve;
          script.onerror = () => { script.remove(); reject(new Error("Failed to load MediaPipe resources. Check your connection and try again.")); };
          document.head.append(script);
        });
      }
      const detector = ml5.faceMesh({ runtime: "mediapipe", solutionPath: MEDIAPIPE_PATH,
        maxFaces: 1, refineLandmarks: false, flipHorizontal: false });
      await detector.ready;
      return detector;
    })().catch(error => { modelPromise = null; throw error; });
  }
  return timeout(modelPromise, 90000, "Model loading exceeded 90 seconds. Check your connection, then restart the camera.");
}

// Core 1: request camera access, then wait for the video and model to be ready.
// async allows asynchronous work; await waits for results while the browser can handle other events.
// audio:false avoids requesting microphone access. token detects canceled startup attempts.
async function startCamera() {
  if (starting || running) return;
  const token = ++generation;
  starting = true;
  controls();
  try {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      throw new Error("Open this page over HTTPS or a local http://localhost server.");
    }
    status("Please allow camera access. This page does not request microphone access.");
    const acquired = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" }, audio: false
    });
    if (token !== generation) { acquired.getTracks().forEach(track => track.stop()); return; }
    stream = acquired;
    video.srcObject = stream;
    await video.play();
    if (token !== generation) return;
    // Match HTML dimensions to actual video dimensions; CSS controls the displayed size.
    video.width = video.videoWidth;
    video.height = video.videoHeight;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    document.querySelector(".stage").style.aspectRatio = `${canvas.width}/${canvas.height}`;
    $("placeholder").hidden = true;
    status("Camera started. Loading FaceMesh with MediaPipe; the first load may take a minute.");
    model = await loadModel();
    if (token !== generation) return;
    starting = false;
    running = true;
    lastVideoTime = -1;
    stream.getVideoTracks()[0].addEventListener("ended", () => {
      if (token === generation) { stopCamera(); status("Camera disconnected. Please restart it.", true); }
    }, { once: true });
    status("Model ready. Face the camera and start recording when green dots appear on your lips.");
    controls();
    detectLoop(token);
  } catch (error) {
    if (token !== generation) return;
    stopCamera();
    const messages = {
      NotAllowedError: "Camera access denied. Allow access in the browser address bar and try again.",
      NotFoundError: "No camera found. Check your device connection.",
      NotReadableError: "Camera unavailable. Another application may be using it."
    };
    status(messages[error.name] || error.message, true);
  }
}

// Stop all camera tracks and cancel unfinished recording; completed samples remain available.
function stopCamera() {
  generation++;
  running = false;
  starting = false;
  cancelRecording();
  stream?.getTracks().forEach(track => track.stop());
  stream = null;
  video.srcObject = null;
  latestFace = null;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  $("placeholder").hidden = false;
  $("tracking").textContent = "Not started";
  status("Camera stopped. You can still export samples from this page.");
  controls();
}

// Report missing faces, incomplete landmarks, invalid coordinates, and successful detection separately.
// Number.isFinite validates numbers; this step does not recognize words such as Hello.
function inspectFaceResult(faces, elapsedMs) {
  const face = Array.isArray(faces) ? faces[0] : null;
  if (!face) return { face: null, valid: false, title: "No face detected",
    message: `MediaPipe processed ${inputCanvas.width} x ${inputCanvas.height} input but found no face (${elapsedMs} ms/frame). Keep your whole face in about one third of the image and improve front lighting.` };
  const points = face.keypoints;
  if (!Array.isArray(points) || points.length < 468) return { face, valid: false,
    title: "Face found - incomplete landmarks",
    message: `Face found with only ${points?.length || 0} landmarks; at least 468 are required. Stop and restart the camera.` };
  const badXY = points.filter(p => !p || !Number.isFinite(p.x) || !Number.isFinite(p.y)).length;
  const badZ = points.filter(p => !p || !Number.isFinite(p.z)).length;
  if (badXY || badZ) return { face, valid: false, title: "Face found - invalid coordinates",
    message: `The model returned ${points.length} points, but ${badXY} XY coordinates and ${badZ} depth values are invalid. A face was detected; share this diagnostic message when reporting the issue.` };
  return { face, valid: true, title: "● Tracking lips",
    message: `MediaPipe · ${points.length} landmarks · ${elapsedMs} ms/frame. ` +
      (elapsedMs >= 450 ? "Detection is slow and may fail recording quality checks. Close other camera apps and busy tabs." : "Tracking is ready. You can record samples.") };
}

// Copy the current camera frame to inputCanvas at its actual pixel dimensions.
// This is separate from the green-dot overlay, so the model never sees the dots.
function captureInputFrame() {
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (video.readyState < 2 || width < 1 || height < 1) return false;
  if (inputCanvas.width !== width || inputCanvas.height !== height) {
    inputCanvas.width = width;
    inputCanvas.height = height;
    canvas.width = width;
    canvas.height = height;
    document.querySelector(".stage").style.aspectRatio = `${width}/${height}`;
  }
  inputContext.drawImage(video, 0, 0, width, height);
  return true;
}

// Core 2: capture a frame -> detect a face -> draw lip points -> save the frame if recording.
// while repeats while the camera runs; await prevents overlapping detection calls.
// Save all face landmarks per frame; select and normalize lip points before training.
async function detectLoop(token) {
  try {
    while (running && token === generation) {
      // Process only new video frames to avoid saving duplicate images.
      if (video.currentTime === lastVideoTime || video.readyState < 2) {
        await new Promise(resolve => setTimeout(resolve, 20));
        continue;
      }
      lastVideoTime = video.currentTime;
      // A monotonic timestamp before detection records application capture time, not completion time or a hardware timestamp.
      const capturedAt = performance.now();
      if (!captureInputFrame()) continue;
// Model inference: pass an image to FaceMesh; an empty result array means no face was found.
      const faces = await model.detect(inputCanvas);
      if (token !== generation) return;
      const report = inspectFaceResult(faces, Math.round(performance.now() - capturedAt));
      const { face, valid } = report;
      latestFace = valid ? face : null;
      latestTime = capturedAt;
      $("tracking").textContent = report.title;
      // Diagnostics stay on this page; face coordinate logs are neither recorded nor uploaded.
      const category = report.title;
      if ($("status").dataset.trackingCategory !== category) {
        status(report.message, !valid);
        $("status").dataset.trackingCategory = category;
      }
      drawFace(latestFace);
// Collect data only while recording; ?. avoids accessing phase when operation does not exist.
      if (operation?.phase === "recording") {
        // Subtract recording start from capture time for relative timestamps; countdown frames are excluded.
        const time = capturedAt - operation.started;
        if (time >= 0 && time <= DURATION) {
          // attempts counts completed detection attempts within the recording window, including misses, not all camera frames.
          // Only valid frames enter frames; device speed affects how many frames fit into two seconds.
          operation.attempts++;
// Save relative time and landmark x/y/z arrays; toFixed(3) retains three decimal places.
          // push appends each captured frame object to the temporary operation.frames array.
          // timeMs is milliseconds since recording start. Keep landmarks in the model's fixed index order.
          // The outer map visits face landmarks; the inner map processes x, y, and z.
          // x/y are original image pixels; z is model-relative depth, not centimeters. Only the preview is mirrored.
          // toFixed(3) returns a string; Number converts it back. New arrays detach samples from future model results.
          if (valid) operation.frames.push({
            timeMs: Math.round(time),
            keypoints: face.keypoints.map(p => [p.x, p.y, p.z].map(v => Number(v.toFixed(3))))
          });
        }
      }
      controls();
      await new Promise(resolve => setTimeout(resolve, 25));
    }
  } catch (error) {
    if (token !== generation) return;
    stopCamera();
    status(`Lip tracking interrupted: ${error.message}. You can restart the camera.`, true);
  }
}

// Draw green lip dots on the overlay: clearRect clears, arc creates circles, and fill colors them.
// Dots are visual only; they neither train the model nor change saved data.
function drawFace(face) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!face) return;
  ctx.fillStyle = "#9df4b8";
  const lips = face.lips?.keypoints || face.keypoints.filter(point => point.name === "lips");
  for (const point of lips) {
    ctx.beginPath();
    ctx.arc(point.x, point.y, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Core 3: keep the selected label, count down for 3 seconds, then record for 2 seconds.
// item represents this recording; phase distinguishes countdown from recording.
// tick updates the countdown and progress; detectLoop saves coordinates after each detection.
function beginRecording(mode = "sample") {
  if (!running || operation || wordModel.busy || !latestFace || performance.now() - latestTime > 700) return;
  if (mode === "predict" && !wordModel.ready) return;
  // Each click creates a temporary sample: label is fixed at click time and frames starts empty.
  // phase, deadline, started, and timer control recording and are not copied wholesale into the final sample.
  // Only recordings accepted by finishRecording enter samples; canceled or invalid actions are discarded.
  const item = { mode, label: mode === "predict" ? null : $("label").value, phase: "countdown", deadline: performance.now() + 3000, frames: [], attempts: 0 };
  operation = item;
  $("record-status").classList.remove("error");
  $("record-status").textContent = "Get ready. Begin after the countdown.";
  $("cue").hidden = false;
  $("progress").value = 0;
  controls();
  const tick = () => {
    if (operation !== item) return;
    const now = performance.now();
    if (item.phase === "countdown") {
      if (now < item.deadline) {
        $("cue").textContent = Math.ceil((item.deadline - now) / 1000);
      } else {
        if (!latestFace || now - latestTime > 700) {
          cancelRecording("Face tracking is unstable. Adjust your position and record again.", true);
          return;
        }
        item.phase = "recording";
        item.started = now;
        $("cue").textContent = item.mode === "predict" ? "Go - say one word" : item.label === "No speech" ? "Go - relax naturally" : `Go - ${item.label}`;
        $("record-status").textContent = "Recording. Complete one action.";
      }
    } else {
      $("progress").value = Math.min(DURATION, now - item.started);
      if (now - item.started >= DURATION) { finishRecording(item); return; }
    }
    item.timer = setTimeout(tick, 50);
  };
  tick();
}

// Check coverage across the entire action, not just the total frame count.
// Quality rules: at least 12 valid frames, 80% valid attempts, and no gap exceeding 450 ms.
// These are capture quality rules, not learned neural network parameters.
function assessFrames(frames, attempts) {
  // Include 0 and DURATION to check gaps between frames and missing coverage at both ends.
  const times = [0, ...frames.map(frame => frame.timeMs), DURATION];
  const maxGap = Math.max(...times.slice(1).map((time, i) => time - times[i]));
  // Valid ratio = valid frames / detection attempts. Math.max(1, attempts) prevents division by zero.
  // This measures capture completeness, not word recognition accuracy.
  const validRatio = frames.length / Math.max(1, attempts);
  return { accepted: frames.length >= 12 && maxGap <= 450 && validRatio >= 0.8,
    validFrames: frames.length, attemptedFrames: attempts, maxGapMs: maxGap, validRatio };
}

// Finish recording: add the complete action to samples only after quality checks pass.
// A sample contains a label and a frame sequence; individual frames are not independent word samples.
// push appends an item; unsaved reminds the user to export.
function finishRecording(item) {
  if (operation !== item) return;
  const quality = assessFrames(item.frames, item.attempts);
  operation = null;
  $("cue").hidden = true;
  $("progress").value = DURATION;
  if (!quality.accepted) {
    $("record-status").textContent = `Not saved: ${quality.validFrames} valid frames, longest gap ${quality.maxGapMs} ms. Keep your face visible and record again once tracking is stable.`;
    $("record-status").classList.add("error");
  } else if (item.mode === "predict") {
    predictRecording(item);
  } else {
    // Store one object per complete silently spoken word, not one sample per frame.
    // id uniquely identifies the sample; label is the manually assigned word; sessionId identifies this capture session.
    // recordedAt is the UTC completion time; durationMs is the configured two-second recording window.
    // videoSize describes pixel dimensions; quality records valid frames, attempts, longest gap, and related metrics.
    // frames directly references item.frames; no more frames are appended after this recording ends.
    // Select lip points, normalize coordinates, and resample time later; the saved data remains raw.
    samples.push({ id: crypto.randomUUID(), label: item.label, sessionId,
      recordedAt: new Date().toISOString(), durationMs: DURATION,
      videoSize: { width: canvas.width, height: canvas.height }, quality, frames: item.frames });
    unsaved = true;
    dataChanged();
    $("record-status").textContent = `Added ${item.label} · ${quality.validFrames} frames. Remember to export your data.`;
    renderSamples();
  }
  controls();
}

// Cancel the active recording and clear its timer without deleting completed samples.
function cancelRecording(message = "Recording canceled.", error = false) {
  if (!operation) return;
  clearTimeout(operation.timer);
  operation = null;
  $("cue").hidden = true;
  $("progress").value = 0;
  $("record-status").textContent = message;
  $("record-status").classList.toggle("error", error);
  controls();
}

// Refresh class counts and the latest 12 samples; filter selects data and map creates elements.
// This updates the display only; it does not change or train the model.
function renderSamples() {
  $("counts").replaceChildren(...LABELS.map(label => {
    const row = document.createElement("div");
    row.className = "count" + (label === $("label").value ? " selected" : "");
    const text = document.createElement("span"); text.textContent = label;
    const count = document.createElement("strong"); count.textContent = `${samples.filter(sample => sample.label === label).length} samples`;
    row.append(text, count); return row;
  }));
  $("total").textContent = `${samples.length} samples · ${unsaved ? "Unexported changes" : "Export a backup after recording"}`;
  // slice(-12) limits display only; older samples remain stored and are included in export.
  const list = samples.slice(-12).reverse().map(sample => {
    const row = document.createElement("li");
    row.textContent = sample.label;
    const detail = document.createElement("span");
    detail.textContent = `${sample.frames.length} frames · ${new Date(sample.recordedAt).toLocaleTimeString("en-US")} · 2 seconds`;
    row.append(detail); return row;
  });
  if (!list.length) {
    const empty = document.createElement("li"); empty.className = "empty";
    empty.textContent = "No samples yet. Start the camera and record your first word."; list.push(empty);
  }
  $("samples").replaceChildren(...list);
  controls();
}

// Core 4: save samples and detector version information together as JSON.
// JSON.stringify converts objects to text; Blob packages that text as downloadable data.
// Confirm the downloaded file was saved. Reloading clears in-memory samples.
function exportData() {
  if (!samples.length) return;
  // The export is an object containing format information and the complete samples array.
  // schemaVersion describes file structure, not accuracy; detector records the model and version used for capture.
  // coordinates documents axis order, units, and preprocessing state for correct loading later.
  // labels lists available classes, not necessarily populated classes; exportedAt records export time.
  const data = { schemaVersion: 1, task: "silent-word-landmarks", exportedAt: new Date().toISOString(),
    detector: { library: "ml5", version: "1.2.1", model: "FaceMesh", runtime: "mediapipe",
      solutionVersion: "0.4.1633559619", input: "unmirrored-canvas", refineLandmarks: false },
    coordinates: { order: ["x", "y", "z"], xyUnits: "video pixels", zUnits: "model relative depth, not metric",
      mirrored: false, normalized: false, timeUnit: "milliseconds since recording start" },
    labels: LABELS, sessionId, samples };
  // Export pipeline: JSON.stringify serializes data -> Blob packages it -> create a temporary download URL.
  // No fetch or upload request occurs here; this export function does not send samples to a server.
  const url = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: "application/json" }));
  const link = document.createElement("a");
  // download suggests a filename. The browser chooses the destination, usually Downloads, not the Model folder.
  link.href = url; link.download = `lip-samples-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  document.body.append(link); link.click(); link.remove();
  // Release the temporary URL after 10 seconds; samples and downloaded files are not deleted.
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  // Starting a download does not prove it was saved; the browser may cancel it, so verify the file manually.
  // Export does not clear samples. Later exports include earlier samples; deduplicate by id when merging.
  unsaved = false;
  renderSamples();
  $("total").textContent = `${samples.length} samples · Download started; confirm the file was saved`;
}

// Connect buttons: addEventListener routes clicks to functions, such as startCamera.
$("start").addEventListener("click", startCamera);
$("stop").addEventListener("click", stopCamera);
$("record").addEventListener("click", () => beginRecording("sample"));
$("cancel").addEventListener("click", () => cancelRecording());
$("export").addEventListener("click", exportData);
// pop removes only the last complete in-memory sample; previously exported JSON is unchanged.
$("undo").addEventListener("click", () => { if (operation || wordModel.busy) return; samples.pop(); unsaved = true; dataChanged(); renderSamples(); });
$("label").addEventListener("change", () => {
  $("label-hint").textContent = $("label").value === "No speech"
    ? "Stay naturally relaxed without speaking for a No speech sample."
    : "Speak silently without exaggerating your lip movements. Say one complete word per recording.";
  renderSamples();
});
// Cancel recording when hidden to avoid incomplete actions caused by browser throttling.
document.addEventListener("visibilitychange", () => {
  if (document.hidden) cancelRecording("Recording canceled because the page was hidden. Return to this page and record again.");
});
// Ask the browser to warn before leaving or reloading when unexported samples exist.
// The leave warning is not a backup and is not guaranteed to appear. Export explicitly.
// Split training and held-out tests by complete samples or sessions, never by frames from one action.
window.addEventListener("beforeunload", event => {
  if (unsaved && samples.length) { event.preventDefault(); event.returnValue = ""; }
});
window.addEventListener("pagehide", stopCamera);
// Initialize at the end of the file, after preprocessing and training state are defined.


// ================= Step 2: convert raw actions into neural network input =================
// This section processes numbers only; it neither trains a model nor changes raw samples.
// Data flow: sample -> per-frame lip coordinates -> spatial normalization -> time interpolation -> 800 numbers.
// Indices follow the official MediaPipe lip connections in a fixed order around the outer lip.
// https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/python/solutions/face_mesh_connections.py
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

// Process explicitly selected samples; this function neither splits the data nor calls the neural network.
// Preserve id/sessionId for splitting by complete samples or sessions to prevent test leakage.
function prepareDataset(selectedSamples) {
  if (!Array.isArray(selectedSamples) || selectedSamples.length === 0) {
    throw new Error("Collect samples before preparing the data.");
  }
  return selectedSamples.map((sample, index) => {
    try {
      if (!LABELS.includes(sample?.label)) throw new Error("Sample label is not in the current class list.");
      return { id: sample.id, sessionId: sample.sessionId, label: sample.label,
        features: prepareSample(sample), featureVersion: FEATURE_CONFIG.version };
    } catch (error) {
      throw new Error(`Sample ${index + 1}: ${error.message}`);
    }
  });
}

// Usage examples after collecting samples; these lines do not execute automatically:
// const oneInput = prepareSample(samples[0]);
// console.log(oneInput.length); // 800
// const preparedData = prepareDataset(samples);
// preparedData[0]: { id, sessionId, label: "Hello", features: [800 numbers], featureVersion }
// Split data before training; preserve FEATURE_CONFIG alongside the saved model.


// ================= Step 3: prepare, split, train, and predict =================
// Initialize the page at the end so state exists before controls are updated.
const wordModel = { classifier: null, busy: false, ready: false, revision: 0, trainedRevision: -1 };
const TRAINING_EPOCHS = 50;

function trainingMessage(text, error = false) {
  $("training-status").textContent = text;
  $("training-status").classList.toggle("error", error);
}

// Invalidate the old model after data changes so it is not mistaken for a model trained on new samples.
function dataChanged() {
  wordModel.revision++;
  wordModel.ready = false;
  $("evaluation").textContent = "Samples changed. Please retrain the model.";
  $("prediction").textContent = "After training, record a new action to predict.";
  controls();
}

// Stable ordering by id keeps the held-out set consistent across training runs on the same data.
function sampleOrder(id) {
  let value = 2166136261;
  for (const char of id) value = Math.imul(value ^ char.charCodeAt(0), 16777619);
  return value >>> 0;
}

// Prefer holding out a full session; otherwise hold out about 20% of complete samples per class.
// Never split frames or select tests based on training results. Five samples per class is only a minimum, not an accuracy guarantee.
function splitWordData(data) {
  const groups = LABELS.map(label => data.filter(sample => sample.label === label));
  for (let i = 0; i < groups.length; i++) {
    if (groups[i].length < 5) throw new Error(`${LABELS[i]} needs at least 5 samples; currently ${groups[i].length}.`);
  }
  const sessions = [...new Set(data.map(sample => sample.sessionId))].filter(Boolean).sort();
  if (sessions.length > 1) {
    for (const session of sessions) {
      const test = data.filter(sample => sample.sessionId === session);
      const train = data.filter(sample => sample.sessionId !== session);
      if (LABELS.every(label => test.some(s => s.label === label) && train.filter(s => s.label === label).length >= 4)) {
        return { train, test, note: "Test set held out by complete capture session" };
      }
    }
  }
  const train = [], test = [];
  for (const group of groups) {
    const ordered = [...group].sort((a, b) => sampleOrder(a.id) - sampleOrder(b.id) || a.id.localeCompare(b.id));
    const count = Math.max(1, Math.floor(group.length * 0.2));
    test.push(...ordered.slice(0, count));
    train.push(...ordered.slice(count));
  }
  return { train, test, note: "About 20% of complete samples held out per class; same-session results may be optimistic, so record a separate test session" };
}

async function trainWords() {
  if (wordModel.busy || operation) return;
  wordModel.busy = true;
  wordModel.ready = false;
  $("evaluation").textContent = "Held-out evaluation has not finished yet.";
  $("prediction").textContent = "Waiting for training to finish.";
  $("training-progress").value = 0;
  stopCamera(); // Release the camera during training to reduce competition with face detection for computing resources.
  controls();
  let candidate = null;
  try {
    trainingMessage("Preparing samples and splitting the data...");
    // Validate all samples first; prepareSample learns no dataset statistics and does not change raw data.
    const prepared = prepareDataset(samples);
    const split = splitWordData(prepared);
    await timeout(loadLibrary(), 90000, "ml5 loading timed out. Check your connection and try again.");
    // Training from imported data cannot rely on the camera detector to initialize TFJS.
    // Use WebGL to avoid uninitialized default WebGPU backends on some devices.
    await ml5.tf.setBackend("webgl");
    await ml5.tf.ready();
    if (wordModel.classifier) { wordModel.classifier.dispose(); wordModel.classifier = null; }
    // 800 inputs -> 16 hidden ReLU units -> four Softmax classes. ml5 builds the default classification layers.
    candidate = ml5.neuralNetwork({ inputs: FEATURE_SIZE, outputs: ["label"],
      task: "classification", hiddenUnits: 16, learningRate: 0.01, debug: false });
    await candidate.ready;
    // Only add training samples; held-out samples do not affect weights or normalizeData.
    for (const sample of split.train) candidate.addData(sample.features, { label: sample.label });
    candidate.normalizeData();
    // Three arguments: training options, per-epoch callback, completion callback. Await the Promise to catch failures.
    // Use a fixed epoch count, not test-based tuning. validationSplit:0 avoids another implicit split of a small dataset.
    await candidate.train({ epochs: TRAINING_EPOCHS, batchSize: 8, shuffle: true, validationSplit: 0 },
      (epoch, logs) => {
        if (!Number.isFinite(logs.loss)) throw new Error("Invalid training loss. Check samples or reduce the learning rate.");
        $("training-progress").value = epoch + 1;
        trainingMessage(`Epoch ${epoch + 1}/${TRAINING_EPOCHS} · Loss ${logs.loss.toFixed(4)} · ${split.train.length} training, ${split.test.length} test samples`);
      }, () => {});
    trainingMessage("Training finished. Evaluating held-out samples...");
    const scores = LABELS.map(label => ({ label, correct: 0, total: 0 }));
    for (const sample of split.test) {
      const result = await classifyFeatures(candidate, sample.features);
      const score = scores.find(row => row.label === sample.label);
      score.total++;
      if (result[0].label === sample.label) score.correct++;
    }
    const correct = scores.reduce((sum, row) => sum + row.correct, 0);
    $("evaluation").textContent = `${split.note}. Correct: ${correct}/${split.test.length} (${(100 * correct / split.test.length).toFixed(1)}%). ` +
      scores.map(row => `${row.label}: ${row.correct}/${row.total}`).join("; ") + ". These scores describe only this held-out set; repeated tuning requires new independent test data.";
    wordModel.classifier = candidate;
    candidate = null;
    wordModel.ready = true;
    wordModel.trainedRevision = wordModel.revision;
    trainingMessage("Training complete. Click Export model for p5 to save it, or restart the camera and record a new action to predict.");
  } catch (error) {
    candidate?.dispose();
    trainingMessage(`Training failed: ${error.message}`, true);
  } finally {
    wordModel.busy = false;
    controls();
  }
}

// Save the trained model; this does not replace exporting raw sample JSON.
async function exportWordModel() {
  if (!wordModel.ready || wordModel.busy || operation ||
      wordModel.trainedRevision !== wordModel.revision) return;
  wordModel.busy = true;
  controls();
  const output = $("model-export-status");
  output.textContent = "Exporting model...";
  try {
    await wordModel.classifier.save("model");
    output.textContent = "Downloads started. Confirm that model.json, model_meta.json, and model.weights.bin were saved. If blocked, allow multiple downloads and try again. Upload all three to your p5 project alongside sketch.js.";
  } catch (error) {
    output.textContent = `Export failed: ${error.message}. You can try exporting again.`;
  } finally {
    wordModel.busy = false;
    controls();
  }
}

// ml5 1.2.1 classify returns a Promise, not the older error-first callback form.
async function classifyFeatures(classifier, features) {
  const results = await classifier.classify(features);
  if (!Array.isArray(results) || results.length !== LABELS.length ||
      new Set(results.map(row => row.label)).size !== LABELS.length ||
      results.some(row => !LABELS.includes(row.label) || !Number.isFinite(row.confidence))) {
    throw new Error("The model did not return valid predictions for all four classes.");
  }
  return [...results].sort((a, b) => b.confidence - a.confidence);
}

async function predictRecording(item) {
  if (!wordModel.ready || wordModel.busy) return;
  wordModel.busy = true;
  controls();
  try {
    // New actions have no supplied label, are not added to samples, and share training preprocessing.
    const features = prepareSample({ durationMs: DURATION, frames: item.frames });
    const results = await classifyFeatures(wordModel.classifier, features);
    $("prediction").textContent = `Prediction: ${results[0].label}. ` + results.map(row =>
      `${row.label} ${(row.confidence * 100).toFixed(1)}%`).join(" / ") + ". Model scores are not measured accuracy.";
    $("record-status").textContent = "Prediction complete. This action was not added to training samples.";
  } catch (error) {
    $("prediction").textContent = `Prediction failed: ${error.message}`;
  } finally {
    wordModel.busy = false;
    controls();
  }
}

// Reload raw JSON from this project: validate everything before adding; failure leaves existing samples unchanged.
async function importSamples(event) {
  if (wordModel.busy || operation) return;
  const file = event.target.files[0];
  if (!file) return;
  wordModel.busy = true;
  controls();
  try {
    if (file.size > 100 * 1024 * 1024) throw new Error("File exceeds 100 MB. Import smaller batches.");
    const data = JSON.parse(await file.text());
    if (data.schemaVersion !== 1 || data.task !== "silent-word-landmarks" ||
        data.detector?.model !== "FaceMesh" || data.detector.refineLandmarks !== false ||
        data.coordinates?.mirrored !== false || data.coordinates.normalized !== false ||
        data.coordinates.xyUnits !== "video pixels" || JSON.stringify(data.coordinates.order) !== '["x","y","z"]' ||
        !Array.isArray(data.samples) || !data.samples.length) throw new Error("This is not a compatible raw capture file.");
    const ids = new Set(samples.map(sample => sample.id));
    const additions = [];
    for (const sample of data.samples) {
      if (typeof sample.id !== "string" || !sample.id || typeof sample.sessionId !== "string" ||
          !sample.sessionId || !LABELS.includes(sample.label)) throw new Error("Invalid sample ID, session, or English label.");
      prepareSample(sample); // Validate timestamps and coordinates without replacing raw data with features.
      if (!ids.has(sample.id)) { ids.add(sample.id); additions.push(sample); }
    }
    if (additions.length) {
      samples.push(...additions);
      unsaved = true;
      dataChanged();
      renderSamples();
    }
    trainingMessage(`Imported ${additions.length} samples; skipped ${data.samples.length - additions.length} duplicate IDs.`);
  } catch (error) {
    trainingMessage(`Import failed: ${error.message}`, true);
  } finally {
    event.target.value = "";
    wordModel.busy = false;
    controls();
  }
}

$("train").addEventListener("click", trainWords);
$("export-model").addEventListener("click", exportWordModel);
$("predict").addEventListener("click", () => beginRecording("predict"));
$("import").addEventListener("change", importSamples);
renderSamples();
