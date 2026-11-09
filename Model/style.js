"use strict";

// 学习：阅读地图：先看文件末尾的按钮事件，再看 startCamera → detectLoop → beginRecording → exportData。
// 学习：本文件负责数据采集。FaceMesh 是现成人脸模型，自己的词语分类网络和朗读尚未加入。
// 学习：函数声明只是定义功能，点击按钮或其他函数调用它时，函数体才会执行。
// 学习：const 表示变量不能重新赋值，let 表示可以重新赋值；const 数组依然可以添加元素。

// 学习：【一、设置与状态】$ 是按 id 查找页面元素的简写，例如 $("camera") 对应 HTML 中的视频。
const $ = id => document.getElementById(id);
const video = $("camera");
const canvas = $("overlay");
const ctx = canvas.getContext("2d");
// 学习：LABELS 是我们手动定义的答案类别；DURATION 的单位是毫秒，2000 毫秒等于 2 秒。
const LABELS = ["Hello", "Thank U", "Omg", "No speech"];
const DURATION = 2000;
const ML5_URL = "https://cdn.jsdelivr.net/npm/ml5@1.2.1/dist/ml5.min.js";
const MEDIAPIPE_PATH = "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619";
// 与可见覆盖层分开：模型读取的是真实像素，避免视频元素布局尺寸影响输入。
const inputCanvas = document.createElement("canvas");
const inputContext = inputCanvas.getContext("2d");
// 学习：sessionId 标记本轮采集；samples 存储全部已完成样本，导出前只存在内存里。
const sessionId = crypto.randomUUID();
const samples = [];
// 学习：stream 是摄像头视频流；model 是检测器；null 表示尚未赋予实际对象。
let stream = null, model = null, modelPromise = null;
// 学习：running 表示正在检测，starting 表示正在启动；generation 防止取消后的旧任务继续运行。
let running = false, starting = false, generation = 0;
// 学习：latestFace 保存最近人脸，operation 保存当前录制任务，unsaved 表示有未导出的修改。
let latestFace = null, latestTime = 0, operation = null, unsaved = false;
let lastVideoTime = -1;

// 学习：更新提示文字。textContent 修改页面上的文字，classList 切换错误提示的样式。
function status(text, error = false) {
  delete $("status").dataset.trackingCategory;
  $("status").textContent = text;
  $("status").classList.toggle("error", error);
}

// 学习：根据状态启用或禁用按钮，例如尚未检测到脸时不能录制。
// 学习：freshFace 检查检测结果是否足够新；disabled 为 true 表示按钮不能点击。
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

// 学习：给异步操作设置最长等待时间，防止模型一直加载。初学时可先跳过。
// 学习：Promise.race 取最先结束的结果；finally 无论成功失败都会清理计时器。
function timeout(promise, ms, message) {
  let timer;
  return Promise.race([promise, new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  })]).finally(() => clearTimeout(timer));
}

// 学习：下载 ml5 库。Promise 表示一件尚未完成的工作，resolve 表示成功，reject 表示失败。
function loadLibrary() {
  if (window.ml5) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = ML5_URL;
    script.onload = resolve;
    script.onerror = () => { script.remove(); reject(new Error("ml5 加载失败，请检查网络后重试。")); };
    document.head.append(script);
  });
}

// 学习：加载已经训练好的 FaceMesh 人脸模型，不是在训练我们自己的词语分类器。
// 学习：MediaPipe 是当前使用的检测运行方式；固定版本网址用于避免库版本混用。
// 学习：modelPromise 复用正在加载的模型，避免多次点击造成重复下载。
function loadModel() {
  if (!modelPromise) {
    modelPromise = (async () => {
      await loadLibrary();
      // MediaPipe 运行方式与之前默认的 TFJS 运行方式分开，使用固定版本资源。
      if (!window.FaceMesh) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = `${MEDIAPIPE_PATH}/face_mesh.js`;
          script.onload = resolve;
          script.onerror = () => { script.remove(); reject(new Error("MediaPipe 资源加载失败，请检查网络后重试。")); };
          document.head.append(script);
        });
      }
      const detector = ml5.faceMesh({ runtime: "mediapipe", solutionPath: MEDIAPIPE_PATH,
        maxFaces: 1, refineLandmarks: false, flipHorizontal: false });
      await detector.ready;
      return detector;
    })().catch(error => { modelPromise = null; throw error; });
  }
  return timeout(modelPromise, 90000, "模型加载超过 90 秒，请检查网络。稍后可再次开启摄像头。");
}

// 学习：【核心 1：打开摄像头】先申请视频权限，再等待视频和模型就绪。
// 学习：async 表示函数包含异步操作；await 表示等待结果，浏览器仍可响应其他事件。
// 学习：audio: false 表示不申请麦克风。token 用于判断这次启动是否已经被取消。
async function startCamera() {
  if (starting || running) return;
  const token = ++generation;
  starting = true;
  controls();
  try {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      throw new Error("请通过 http://localhost 本地服务或 HTTPS 打开页面。");
    }
    status("请允许摄像头访问；本页面不会请求麦克风。");
    const acquired = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" }, audio: false
    });
    if (token !== generation) { acquired.getTracks().forEach(track => track.stop()); return; }
    stream = acquired;
    video.srcObject = stream;
    await video.play();
    if (token !== generation) return;
    // HTML 属性尺寸也与实际视频一致，CSS 仍负责页面上的显示尺寸。
    video.width = video.videoWidth;
    video.height = video.videoHeight;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    document.querySelector(".stage").style.aspectRatio = `${canvas.width}/${canvas.height}`;
    $("placeholder").hidden = true;
    status("摄像头已开启，正在加载 FaceMesh / MediaPipe 兼容检测。首次加载可能需要一分钟。");
    model = await loadModel();
    if (token !== generation) return;
    starting = false;
    running = true;
    lastVideoTime = -1;
    stream.getVideoTracks()[0].addEventListener("ended", () => {
      if (token === generation) { stopCamera(); status("摄像头已断开，请重新开启。", true); }
    }, { once: true });
    status("模型已就绪。请正对镜头，看到嘴唇上的绿色点后开始录制。");
    controls();
    detectLoop(token);
  } catch (error) {
    if (token !== generation) return;
    stopCamera();
    const messages = {
      NotAllowedError: "摄像头权限被拒绝，请在浏览器地址栏允许摄像头访问后重试。",
      NotFoundError: "没有找到摄像头，请检查设备连接。",
      NotReadableError: "摄像头无法使用，可能正在被其他程序占用。"
    };
    status(messages[error.name] || error.message, true);
  }
}

// 学习：停止摄像头的所有轨道，同时取消尚未完成的录制。已完成的样本仍保留在 samples 中。
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
  $("tracking").textContent = "尚未开启";
  status("摄像头已关闭。当前页面中的样本仍可导出。");
  controls();
}

// 学习：检查模型结果：没有人脸、关键点不足、无效坐标、正常结果分别给出不同提示。
// 学习：Number.isFinite 检查数字是否有效；这一步不会识别 Hello 等词语。
function inspectFaceResult(faces, elapsedMs) {
  const face = Array.isArray(faces) ? faces[0] : null;
  if (!face) return { face: null, valid: false, title: "未检测到人脸",
    message: `MediaPipe 已运行，输入 ${inputCanvas.width} × ${inputCanvas.height}，但没有返回人脸（${elapsedMs} 毫秒/帧）。请让完整脸部占画面约三分之一，并增加正面光线。` };
  const points = face.keypoints;
  if (!Array.isArray(points) || points.length < 468) return { face, valid: false,
    title: "已找到人脸 · 关键点不完整",
    message: `已返回人脸，但只有 ${points?.length || 0} 个关键点，需要至少 468 个。请关闭摄像头后重新开启。` };
  const badXY = points.filter(p => !p || !Number.isFinite(p.x) || !Number.isFinite(p.y)).length;
  const badZ = points.filter(p => !p || !Number.isFinite(p.z)).length;
  if (badXY || badZ) return { face, valid: false, title: "已找到人脸 · 坐标异常",
    message: `模型返回 ${points.length} 个点，但有 ${badXY} 个平面坐标、${badZ} 个深度值无效。不是没有找到脸；请把这行提示发给我。` };
  return { face, valid: true, title: "● 嘴唇跟踪中",
    message: `MediaPipe · ${points.length} 个关键点 · ${elapsedMs} 毫秒/帧。` +
      (elapsedMs >= 450 ? "检测偏慢，可能无法通过录制质量检查。请关闭其他摄像头程序和繁忙页面。" : "跟踪正常，可以录制样本。") };
}

// 学习：把摄像头当前帧复制到 inputCanvas，按真实像素尺寸交给模型。
// 学习：它与画绿色点的 canvas 是两张不同的画布，模型不会读取绿色点。
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

// 学习：【核心 2：连续检测】取一帧画面 → 找脸 → 画嘴唇点 → 如果正在录制就保存这一帧。
// 学习：while 在摄像头运行期间重复执行；await 等当前检测结束，避免多次检测同时进行。
// 学习：每帧保存的是全部面部关键点。后续训练前才选取嘴唇点并做坐标校正。
async function detectLoop(token) {
  try {
    while (running && token === generation) {
      // 只处理新的视频帧，避免重复保存同一张画面。
      if (video.currentTime === lastVideoTime || video.readyState < 2) {
        await new Promise(resolve => setTimeout(resolve, 20));
        continue;
      }
      lastVideoTime = video.currentTime;
      const capturedAt = performance.now();
      if (!captureInputFrame()) continue;
// 学习：【模型真正工作的位置】把一帧图像送给 FaceMesh，返回检测到的人脸数组；空数组表示没有找到脸。
      const faces = await model.detect(inputCanvas);
      if (token !== generation) return;
      const report = inspectFaceResult(faces, Math.round(performance.now() - capturedAt));
      const { face, valid } = report;
      latestFace = valid ? face : null;
      latestTime = capturedAt;
      $("tracking").textContent = report.title;
      // 完整诊断只保留在本页；不记录或上传人脸坐标日志。
      const category = report.title;
      if ($("status").dataset.trackingCategory !== category) {
        status(report.message, !valid);
        $("status").dataset.trackingCategory = category;
      }
      drawFace(latestFace);
// 学习：只有录制阶段才收集数据；?. 表示 operation 不存在时不继续访问 phase，避免报错。
      if (operation?.phase === "recording") {
        const time = capturedAt - operation.started;
        if (time >= 0 && time <= DURATION) {
          operation.attempts++;
// 学习：保存相对录制开始的时间，以及关键点的 x/y/z 数组；toFixed(3) 保留三位小数。
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
    status(`嘴唇跟踪中断：${error.message}。可以重新开启摄像头。`, true);
  }
}

// 学习：在覆盖层画绿色嘴唇点。clearRect 清掉上一帧，arc 画圆，fill 填充颜色。
// 学习：画点只是展示，不会训练模型，也不会改变保存的数据。
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

// 学习：【核心 3：录一个样本】保存当前标签，先倒计时 3 秒，再录制 2 秒。
// 学习：item 是本次录制对象；phase 区分 countdown（准备）与 recording（录制）。
// 学习：tick 定时更新倒计时和进度；具体坐标由 detectLoop 在每次检测后保存。
function beginRecording() {
  if (!running || operation || !latestFace || performance.now() - latestTime > 700) return;
  const item = { label: $("label").value, phase: "countdown", deadline: performance.now() + 3000, frames: [], attempts: 0 };
  operation = item;
  $("record-status").classList.remove("error");
  $("record-status").textContent = "准备好，倒计时结束后开始。";
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
          cancelRecording("没有稳定检测到人脸，请调整位置后重录。", true);
          return;
        }
        item.phase = "recording";
        item.started = now;
        $("cue").textContent = item.label === "No speech" ? "开始 · 自然放松" : `开始 · ${item.label}`;
        $("record-status").textContent = "录制中，请完成一次动作。";
      }
    } else {
      $("progress").value = Math.min(DURATION, now - item.started);
      if (now - item.started >= DURATION) { finishRecording(item); return; }
    }
    item.timer = setTimeout(tick, 50);
  };
  tick();
}

// 判断整段动作是否有足够的时间覆盖，而不只是总帧数。
// 学习：检查样本质量：有效帧至少 12 个，有效率至少 80%，最大时间缺口不超过 450 毫秒。
// 学习：这些是采集质量规则，不是神经网络学出来的参数。
function assessFrames(frames, attempts) {
  const times = [0, ...frames.map(frame => frame.timeMs), DURATION];
  const maxGap = Math.max(...times.slice(1).map((time, i) => time - times[i]));
  const validRatio = frames.length / Math.max(1, attempts);
  return { accepted: frames.length >= 12 && maxGap <= 450 && validRatio >= 0.8,
    validFrames: frames.length, attemptedFrames: attempts, maxGapMs: maxGap, validRatio };
}

// 学习：录制结束：检查通过后，把一个完整动作放入 samples 数组。
// 学习：一个样本包含 label 标签和 frames 帧序列；不要把每帧当成独立的词语样本。
// 学习：push 往数组末尾添加元素；unsaved 提醒用户有尚未导出的数据。
function finishRecording(item) {
  if (operation !== item) return;
  const quality = assessFrames(item.frames, item.attempts);
  operation = null;
  $("cue").hidden = true;
  $("progress").value = DURATION;
  if (!quality.accepted) {
    $("record-status").textContent = `未保存：有效帧 ${quality.validFrames}，最长缺口 ${quality.maxGapMs} 毫秒。请保持脸部可见，等跟踪稳定后重录。`;
    $("record-status").classList.add("error");
  } else {
    samples.push({ id: crypto.randomUUID(), label: item.label, sessionId,
      recordedAt: new Date().toISOString(), durationMs: DURATION,
      videoSize: { width: canvas.width, height: canvas.height }, quality, frames: item.frames });
    unsaved = true;
    $("record-status").textContent = `已添加“${item.label}” · ${quality.validFrames} 帧。记得导出数据。`;
    renderSamples();
  }
  controls();
}

// 学习：取消当前录制并清理计时器，不删除已经完成的样本。
function cancelRecording(message = "本次录制已取消。", error = false) {
  if (!operation) return;
  clearTimeout(operation.timer);
  operation = null;
  $("cue").hidden = true;
  $("progress").value = 0;
  $("record-status").textContent = message;
  $("record-status").classList.toggle("error", error);
  controls();
}

// 学习：刷新每个类别的数量和最近 12 个样本。filter 筛选，map 把数据变成页面元素。
// 学习：这里仅更新显示，不会修改模型，也不是训练过程。
function renderSamples() {
  $("counts").replaceChildren(...LABELS.map(label => {
    const row = document.createElement("div");
    row.className = "count" + (label === $("label").value ? " selected" : "");
    const text = document.createElement("span"); text.textContent = label;
    const count = document.createElement("strong"); count.textContent = `${samples.filter(sample => sample.label === label).length} 次`;
    row.append(text, count); return row;
  }));
  $("total").textContent = `共 ${samples.length} 个样本 · ${unsaved ? "有未导出的数据" : "录制后请导出备份"}`;
  const list = samples.slice(-12).reverse().map(sample => {
    const row = document.createElement("li");
    row.textContent = sample.label;
    const detail = document.createElement("span");
    detail.textContent = `${sample.frames.length} 帧 · ${new Date(sample.recordedAt).toLocaleTimeString("zh-CN")} · 2 秒`;
    row.append(detail); return row;
  });
  if (!list.length) {
    const empty = document.createElement("li"); empty.className = "empty";
    empty.textContent = "还没有样本。开启摄像头后，录下第一个词语。"; list.push(empty);
  }
  $("samples").replaceChildren(...list);
  controls();
}

// 学习：【核心 4：导出数据】把 samples 和模型版本等说明一起存成 JSON 文件。
// 学习：JSON.stringify 把对象转换为文字；Blob 把这些文字包装为可下载的文件。
// 学习：下载后要确认文件保存成功。刷新页面会清空内存，当前版本没有导入功能。
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
  $("total").textContent = `共 ${samples.length} 个样本 · 已发起下载，请确认文件保存成功`;
}

// 学习：【最后：连接按钮】addEventListener 把页面点击交给对应函数，例如开启摄像头调用 startCamera。
$("start").addEventListener("click", startCamera);
$("stop").addEventListener("click", stopCamera);
$("record").addEventListener("click", beginRecording);
$("cancel").addEventListener("click", () => cancelRecording());
$("export").addEventListener("click", exportData);
$("undo").addEventListener("click", () => { if (operation) return; samples.pop(); unsaved = true; renderSamples(); });
$("label").addEventListener("change", () => {
  $("label-hint").textContent = $("label").value === "No speech"
    ? "这次不说词语，保持自然放松，作为No speech的样本。"
    : "不要发声，也不必夸张嘴型。每次只说一个完整词语。";
  renderSamples();
});
// 学习：切到后台时取消本次录制，避免浏览器暂停处理导致动作不完整。
document.addEventListener("visibilitychange", () => {
  if (document.hidden) cancelRecording("页面切到后台，本次录制已取消，请回到页面重录。");
});
// 学习：关闭或刷新前，如果有未导出数据，请求浏览器显示离开提醒。
window.addEventListener("beforeunload", event => {
  if (unsaved && samples.length) { event.preventDefault(); event.returnValue = ""; }
});
window.addEventListener("pagehide", stopCamera);
renderSamples();
