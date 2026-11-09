"use strict";

// Learning guide: start with the button handlers, then startCamera -> detectLoop -> beginRecording -> exportData.
// This legacy file handles capture. FaceMesh is pretrained; custom word classification and speech synthesis are not included here.
// A function declaration defines behavior; its body runs only when a button or another function calls it.
// const prevents reassignment; let permits it. A const array can still accept new elements.

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
const sessionId = crypto.randomUUID();
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
  $("start").disabled = starting || running;
  $("stop").disabled = !starting && !running;
  $("record").disabled = !running || !freshFace || !!operation;
  $("label").disabled = !!operation;
  $("cancel").hidden = !operation;
  $("export").disabled = !samples.length || !!operation;
  $("undo").disabled = !samples.length || !!operation;
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
        const time = capturedAt - operation.started;
        if (time >= 0 && time <= DURATION) {
          operation.attempts++;
// Save relative time and landmark x/y/z arrays; toFixed(3) retains three decimal places.
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
function beginRecording() {
  if (!running || operation || !latestFace || performance.now() - latestTime > 700) return;
  const item = { label: $("label").value, phase: "countdown", deadline: performance.now() + 3000, frames: [], attempts: 0 };
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
        $("cue").textContent = item.label === "No speech" ? "Go - relax naturally" : `Go - ${item.label}`;
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
  const times = [0, ...frames.map(frame => frame.timeMs), DURATION];
  const maxGap = Math.max(...times.slice(1).map((time, i) => time - times[i]));
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
  } else {
    samples.push({ id: crypto.randomUUID(), label: item.label, sessionId,
      recordedAt: new Date().toISOString(), durationMs: DURATION,
      videoSize: { width: canvas.width, height: canvas.height }, quality, frames: item.frames });
    unsaved = true;
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
  const data = { schemaVersion: 1, task: "silent-word-landmarks", exportedAt: new Date().toISOString(),
    detector: { library: "ml5", version: "1.2.1", model: "FaceMesh", runtime: "mediapipe",
      solutionVersion: "0.4.1633559619", input: "unmirrored-canvas", refineLandmarks: false },
    coordinates: { order: ["x", "y", "z"], xyUnits: "video pixels", zUnits: "model relative depth, not metric",
      mirrored: false, normalized: false, timeUnit: "milliseconds since recording start" },
    labels: LABELS, sessionId, samples };
  const url = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url; link.download = `lip-samples-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  unsaved = false;
  renderSamples();
  $("total").textContent = `${samples.length} samples · Download started; confirm the file was saved`;
}

// Connect buttons: addEventListener routes clicks to functions, such as startCamera.
$("start").addEventListener("click", startCamera);
$("stop").addEventListener("click", stopCamera);
$("record").addEventListener("click", beginRecording);
$("cancel").addEventListener("click", () => cancelRecording());
$("export").addEventListener("click", exportData);
$("undo").addEventListener("click", () => { if (operation) return; samples.pop(); unsaved = true; renderSamples(); });
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
window.addEventListener("beforeunload", event => {
  if (unsaved && samples.length) { event.preventDefault(); event.returnValue = ""; }
});
window.addEventListener("pagehide", stopCamera);
renderSamples();
