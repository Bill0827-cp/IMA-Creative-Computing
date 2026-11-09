"use strict";

// 学习：阅读地图：先看文件末尾的按钮事件，再看 startCamera → detectLoop → beginRecording → exportData。
// 学习：本文件负责采集、预处理、词语分类训练和预测。FaceMesh 是现成人脸模型，朗读尚未加入。
// 学习：函数声明只是定义功能，点击按钮或其他函数调用它时，函数体才会执行。
// 学习：const 表示变量不能重新赋值，let 表示可以重新赋值；const 数组依然可以添加元素。

// 第一天只采集原始关键点。之后统一做空间校正、时间重采样，再训练分类器。
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
// 数据详解：同一次打开页面中的样本共享 sessionId；刷新页面会生成新的编号。
// 数据详解：它用于区分采集轮次，不是用户身份。以后可以按轮次划分训练集和测试集。
const sessionId = crypto.randomUUID();
// 数据详解：数据层级：samples（所有样本）→ 一个样本 → frames（各帧）→ keypoints（各点）→ [x, y, z]。
// 数据详解：Hello、Thank U 等类别共用这个数组，通过每个样本的 label 区分，不是每类一个文件。
// 数据详解：这里只在浏览器内存里存储，没有自动写入硬盘、localStorage 或数据库；刷新会丢失。
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
      // 数据详解：用单调计时器记录送入检测前的时刻，表示本帧的应用采集时间；不是检测完成时间，也不是摄像头硬件时间戳。
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
        // 数据详解：用帧采集时刻减去录制起点，得到相对时间。倒计时阶段的数据不作为录制样本。
        const time = capturedAt - operation.started;
        if (time >= 0 && time <= DURATION) {
          // 数据详解：attempts 包含录制时间内成功返回的检测尝试，即使没有脸也计数；不是摄像头的总帧数。
          // 数据详解：有效帧才进入 frames。不同设备检测速度不同，两秒的样本可能包含不同数量的帧。
          operation.attempts++;
// 学习：保存相对录制开始的时间，以及关键点的 x/y/z 数组；toFixed(3) 保留三位小数。
          // 数据详解：这是每帧真正进入临时存储的位置：push 把一个帧对象加到本次 operation.frames 末尾。
          // 数据详解：timeMs 是相对于录制开始的毫秒数。keypoints 按模型固定编号顺序保存，不能随意打乱。
          // 数据详解：外层 map 遍历全部面部关键点，内层 map 处理每个点的 x、y、z。
          // 数据详解：x/y 是原始画面的像素坐标；z 是模型相对深度，不是厘米。镜像只用于预览。
          // 数据详解：toFixed(3) 返回字符串，再由 Number 转回数字；新建数组使样本不依赖之后的模型结果对象。
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
function beginRecording(mode = "sample") {
  if (!running || operation || wordModel.busy || !latestFace || performance.now() - latestTime > 700) return;
  if (mode === "predict" && !wordModel.ready) return;
  // 数据详解：每点击一次录制，创建一个新的临时样本容器：label 固定为点击时选择的词，frames 从空数组开始。
  // 数据详解：phase、deadline、started、timer 用来控制录制过程，不会整体写入最终样本。
  // 数据详解：只有 finishRecording 检查合格，临时帧数据才加入 samples；取消或不合格会丢弃当前动作。
  const item = { mode, label: mode === "predict" ? null : $("label").value, phase: "countdown", deadline: performance.now() + 3000, frames: [], attempts: 0 };
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
        $("cue").textContent = item.mode === "predict" ? "开始 · 说一个词" : item.label === "No speech" ? "开始 · 自然放松" : `开始 · ${item.label}`;
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
  // 数据详解：加入起点 0 和终点 DURATION，既检查相邻帧之间的缺口，也检查录制头尾有没有缺失。
  const times = [0, ...frames.map(frame => frame.timeMs), DURATION];
  const maxGap = Math.max(...times.slice(1).map((time, i) => time - times[i]));
  // 数据详解：有效率 = 有效帧数 / 检测尝试数。Math.max(1, attempts) 避免除以零。
  // 数据详解：它不是词语识别准确率；这里只判断采集是否完整。
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
  } else if (item.mode === "predict") {
    predictRecording(item);
  } else {
    // 数据详解：这是完整样本正式加入内存的位置。每无声说一次词语，对应一个对象，而不是一帧一个样本。
    // 数据详解：id：单个样本的唯一编号；label：你人工标注的词；sessionId：这次页面采集轮次。
    // 数据详解：recordedAt：样本完成时的 UTC 日期时间；durationMs：设定的两秒录制窗口。
    // 数据详解：videoSize：用于理解像素坐标的画面尺寸；quality：有效帧、尝试数、最长缺口等。
    // 数据详解：frames: item.frames 直接引用本次帧数组；本次录制结束后不再向该数组追加帧。
    // 数据详解：后续训练时再选嘴唇点、校正坐标、按时间重采样。现在保存的还是原始特征数据。
    samples.push({ id: crypto.randomUUID(), label: item.label, sessionId,
      recordedAt: new Date().toISOString(), durationMs: DURATION,
      videoSize: { width: canvas.width, height: canvas.height }, quality, frames: item.frames });
    unsaved = true;
    dataChanged();
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
  // 数据详解：slice(-12) 只限制页面显示最近 12 个样本，不会删除更早样本；导出仍包含所有样本。
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
  // 数据详解：导出文件最外层是一个对象，包含数据格式说明和完整 samples 数组。
  // 数据详解：schemaVersion 是文件结构版本，不是模型准确率；detector 记录生成数据时所用模型与版本。
  // 数据详解：coordinates 说明坐标顺序、单位和预处理状态，方便之后正确读取。
  // 数据详解：labels 是可选类别列表，不代表每类已经有样本。exportedAt 是导出时刻。
  const data = { schemaVersion: 1, task: "silent-word-landmarks", exportedAt: new Date().toISOString(),
    detector: { library: "ml5", version: "1.2.1", model: "FaceMesh", runtime: "mediapipe",
      solutionVersion: "0.4.1633559619", input: "unmirrored-canvas", refineLandmarks: false },
    coordinates: { order: ["x", "y", "z"], xyUnits: "video pixels", zUnits: "model relative depth, not metric",
      mirrored: false, normalized: false, timeUnit: "milliseconds since recording start" },
    labels: LABELS, sessionId, samples };
  // 数据详解：导出分三步：JSON.stringify 将对象序列化为文字 → Blob 将文字包装成文件数据 → 创建临时 blob 下载地址。
  // 数据详解：这里没有 fetch 或上传请求；采集数据不会由这个导出函数发送到服务器。
  const url = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: "application/json" }));
  const link = document.createElement("a");
  // 数据详解：download 给出建议文件名。实际保存位置由浏览器决定，一般是下载文件夹，不会自动写到 Model 目录。
  link.href = url; link.download = `lip-samples-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  document.body.append(link); link.click(); link.remove();
  // 数据详解：10 秒后释放临时下载地址占用的资源，不会删除 samples，也不会删除已经下载的文件。
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  // 数据详解：这里只表示已经发起下载，不证明用户最终保存成功；浏览器也可能取消下载，所以需要手动确认文件。
  // 数据详解：导出不会清空 samples。继续录制后再次导出，会包含之前的样本；以后合并文件要按 id 去重。
  unsaved = false;
  renderSamples();
  $("total").textContent = `共 ${samples.length} 个样本 · 已发起下载，请确认文件保存成功`;
}

// 学习：【最后：连接按钮】addEventListener 把页面点击交给对应函数，例如开启摄像头调用 startCamera。
$("start").addEventListener("click", startCamera);
$("stop").addEventListener("click", stopCamera);
$("record").addEventListener("click", () => beginRecording("sample"));
$("cancel").addEventListener("click", () => cancelRecording());
$("export").addEventListener("click", exportData);
// 数据详解：pop 仅撤销内存中最后一个完整样本，不会修改之前已经导出的 JSON 文件。
$("undo").addEventListener("click", () => { if (operation || wordModel.busy) return; samples.pop(); unsaved = true; dataChanged(); renderSamples(); });
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
// 数据详解：离开提醒不是自动备份，浏览器也不保证总会弹出。必须主动导出。
// 数据详解：训练按钮会按完整样本或采集轮次划分训练与留出测试数据，不会把同一动作拆帧分开。
window.addEventListener("beforeunload", event => {
  if (unsaved && samples.length) { event.preventDefault(); event.returnValue = ""; }
});
window.addEventListener("pagehide", stopCamera);
// 初始化移到整个文件末尾，先定义预处理与训练状态。


// ================= 第 2 步：把原始动作整理成神经网络输入 =================
// 这里只处理数字，不训练模型，也不修改原始 samples。
// 数据流：一条 sample → 每帧的嘴唇坐标 → 空间校正 → 时间插值 → 800 个数字。
// 点编号来自 MediaPipe 官方嘴唇连接表，固定顺序沿外唇一周排列。
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

// 批量处理你明确选定的样本。此函数不自动划分训练集，不调用神经网络。
// 保留 id/sessionId，方便之后按完整样本或采集轮次划分，防止测试数据泄漏。
function prepareDataset(selectedSamples) {
  if (!Array.isArray(selectedSamples) || selectedSamples.length === 0) {
    throw new Error("请先采集样本，再整理数据。");
  }
  return selectedSamples.map((sample, index) => {
    try {
      if (!LABELS.includes(sample?.label)) throw new Error("样本标签不在当前类别列表中。");
      return { id: sample.id, sessionId: sample.sessionId, label: sample.label,
        features: prepareSample(sample), featureVersion: FEATURE_CONFIG.version };
    } catch (error) {
      throw new Error(`第 ${index + 1} 个样本：${error.message}`);
    }
  });
}

// 使用示例（先采集样本；下面不自动执行）：
// const oneInput = prepareSample(samples[0]);
// console.log(oneInput.length); // 800
// const preparedData = prepareDataset(samples);
// preparedData[0] 的结构：{ id, sessionId, label: "Hello", features: [800个数], featureVersion }
// 真正训练前还需要划分数据；保存模型时也要保存 FEATURE_CONFIG。


// ================= 第 3 步：整理、划分、训练和预测 =================
// 页面初始化放在文件最末尾，确保这些状态先定义，再更新按钮。
const wordModel = { classifier: null, busy: false, ready: false, revision: 0, trainedRevision: -1 };
const TRAINING_EPOCHS = 50;

function trainingMessage(text, error = false) {
  $("training-status").textContent = text;
  $("training-status").classList.toggle("error", error);
}

// 增删样本后使旧模型失效，避免误以为它已经学过新增的数据。
function dataChanged() {
  wordModel.revision++;
  wordModel.ready = false;
  $("evaluation").textContent = "样本已更新，请重新训练。";
  $("prediction").textContent = "训练后，再录制新动作进行预测。";
  controls();
}

// 为相同 id 生成相同排序，重复训练相同数据时保持留出样本稳定。
function sampleOrder(id) {
  let value = 2166136261;
  for (const char of id) value = Math.imul(value ^ char.charCodeAt(0), 16777619);
  return value >>> 0;
}

// 优先把完整采集轮次留出；只有一轮或各轮类别不全时，按类别留出约 20% 完整样本。
// 不拆帧，不按训练结果挑选测试集。最低每类 5 条只是运行门槛，不保证准确率。
function splitWordData(data) {
  const groups = LABELS.map(label => data.filter(sample => sample.label === label));
  for (let i = 0; i < groups.length; i++) {
    if (groups[i].length < 5) throw new Error(`“${LABELS[i]}”至少需要 5 个样本，目前 ${groups[i].length} 个。`);
  }
  const sessions = [...new Set(data.map(sample => sample.sessionId))].filter(Boolean).sort();
  if (sessions.length > 1) {
    for (const session of sessions) {
      const test = data.filter(sample => sample.sessionId === session);
      const train = data.filter(sample => sample.sessionId !== session);
      if (LABELS.every(label => test.some(s => s.label === label) && train.filter(s => s.label === label).length >= 4)) {
        return { train, test, note: "按完整采集轮次留出测试集" };
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
  return { train, test, note: "按完整样本分层留出约 20%；同一轮采集的测试成绩可能偏乐观，建议另录一轮测试" };
}

async function trainWords() {
  if (wordModel.busy || operation) return;
  wordModel.busy = true;
  wordModel.ready = false;
  $("evaluation").textContent = "尚未完成本次留出测试。";
  $("prediction").textContent = "等待训练完成。";
  $("training-progress").value = 0;
  stopCamera(); // 训练期间释放摄像头，减少与人脸模型争用计算资源。
  controls();
  let candidate = null;
  try {
    trainingMessage("正在整理样本并划分数据……");
    // 先校验所有样本；prepareSample 不会学习数据集统计量，也不会改动原始数据。
    const prepared = prepareDataset(samples);
    const split = splitWordData(prepared);
    await timeout(loadLibrary(), 90000, "ml5 加载超时，请检查网络后重试。");
    // 直接从导入数据训练时，不能依赖摄像头模型顺便初始化 TFJS。
    // 固定 WebGL，避开部分设备默认 WebGPU 后端尚未就绪的问题。
    await ml5.tf.setBackend("webgl");
    await ml5.tf.ready();
    if (wordModel.classifier) { wordModel.classifier.dispose(); wordModel.classifier = null; }
    // 800 个输入 → 16 个隐藏单元（ReLU）→ 四类输出（Softmax）。ml5 建立默认分类层。
    candidate = ml5.neuralNetwork({ inputs: FEATURE_SIZE, outputs: ["label"],
      task: "classification", hiddenUnits: 16, learningRate: 0.01, debug: false });
    await candidate.ready;
    // 只把训练部分交给 addData；测试部分不会用于权重更新或 normalizeData。
    for (const sample of split.train) candidate.addData(sample.features, { label: sample.label });
    candidate.normalizeData();
    // 当前版本的三参数形式：训练设置、每轮回调、完成回调。返回 Promise 可等待并捕获失败。
    // 固定训练轮数，不用测试集选参数。validationSplit:0 避免再从少量样本中隐式切分。
    await candidate.train({ epochs: TRAINING_EPOCHS, batchSize: 8, shuffle: true, validationSplit: 0 },
      (epoch, logs) => {
        if (!Number.isFinite(logs.loss)) throw new Error("训练损失无效，请检查样本或减少学习率。");
        $("training-progress").value = epoch + 1;
        trainingMessage(`训练 ${epoch + 1}/${TRAINING_EPOCHS} 轮 · 损失 ${logs.loss.toFixed(4)} · 训练 ${split.train.length} 条，测试 ${split.test.length} 条`);
      }, () => {});
    trainingMessage("训练结束，正在评估没有参与训练的样本……");
    const scores = LABELS.map(label => ({ label, correct: 0, total: 0 }));
    for (const sample of split.test) {
      const result = await classifyFeatures(candidate, sample.features);
      const score = scores.find(row => row.label === sample.label);
      score.total++;
      if (result[0].label === sample.label) score.correct++;
    }
    const correct = scores.reduce((sum, row) => sum + row.correct, 0);
    $("evaluation").textContent = `${split.note}。答对 ${correct}/${split.test.length}（${(100 * correct / split.test.length).toFixed(1)}%）。` +
      scores.map(row => `${row.label}：${row.correct}/${row.total}`).join("；") + "。此成绩仅代表本次留出数据；反复据此调参后需要新的独立测试数据。";
    wordModel.classifier = candidate;
    candidate = null;
    wordModel.ready = true;
    wordModel.trainedRevision = wordModel.revision;
    trainingMessage("训练完成。可以点击“导出模型（用于 p5）”保存模型，或重新开启摄像头并录制新动作进行预测。");
  } catch (error) {
    candidate?.dispose();
    trainingMessage(`训练失败：${error.message}`, true);
  } finally {
    wordModel.busy = false;
    controls();
  }
}

// 保存训练好的模型，不会替代原始样本的 JSON 导出。
async function exportWordModel() {
  if (!wordModel.ready || wordModel.busy || operation ||
      wordModel.trainedRevision !== wordModel.revision) return;
  wordModel.busy = true;
  controls();
  const output = $("model-export-status");
  output.textContent = "正在导出模型……";
  try {
    await wordModel.classifier.save("model");
    output.textContent = "已发起下载，请确认保存了 model.json、model_meta.json 和 model.weights.bin 三个文件；如被拦截，请允许下载多个文件后重试。将它们一起上传到 p5 项目，与 sketch.js 同级。";
  } catch (error) {
    output.textContent = `导出失败：${error.message}。可以再次点击导出。`;
  } finally {
    wordModel.busy = false;
    controls();
  }
}

// ml5 1.2.1 的 classify 返回 Promise；不使用旧版 error-first 回调。
async function classifyFeatures(classifier, features) {
  const results = await classifier.classify(features);
  if (!Array.isArray(results) || results.length !== LABELS.length ||
      new Set(results.map(row => row.label)).size !== LABELS.length ||
      results.some(row => !LABELS.includes(row.label) || !Number.isFinite(row.confidence))) {
    throw new Error("模型没有返回有效的四类预测结果。");
  }
  return [...results].sort((a, b) => b.confidence - a.confidence);
}

async function predictRecording(item) {
  if (!wordModel.ready || wordModel.busy) return;
  wordModel.busy = true;
  controls();
  try {
    // 新动作不提供词语标签、不加入 samples；与训练共用同一个预处理函数。
    const features = prepareSample({ durationMs: DURATION, frames: item.frames });
    const results = await classifyFeatures(wordModel.classifier, features);
    $("prediction").textContent = `预测：${results[0].label}。` + results.map(row =>
      `${row.label} ${(row.confidence * 100).toFixed(1)}%`).join(" / ") + "。模型分数不是实际正确率。";
    $("record-status").textContent = "预测完成，这次动作没有加入训练样本。";
  } catch (error) {
    $("prediction").textContent = `预测失败：${error.message}`;
  } finally {
    wordModel.busy = false;
    controls();
  }
}

// 重新载入本项目导出的原始 JSON；先完整检查，再一次性添加，失败不改现有样本。
async function importSamples(event) {
  if (wordModel.busy || operation) return;
  const file = event.target.files[0];
  if (!file) return;
  wordModel.busy = true;
  controls();
  try {
    if (file.size > 100 * 1024 * 1024) throw new Error("文件超过 100 MB，请分批导入。");
    const data = JSON.parse(await file.text());
    if (data.schemaVersion !== 1 || data.task !== "silent-word-landmarks" ||
        data.detector?.model !== "FaceMesh" || data.detector.refineLandmarks !== false ||
        data.coordinates?.mirrored !== false || data.coordinates.normalized !== false ||
        data.coordinates.xyUnits !== "video pixels" || JSON.stringify(data.coordinates.order) !== '["x","y","z"]' ||
        !Array.isArray(data.samples) || !data.samples.length) throw new Error("不是兼容的原始采集文件。");
    const ids = new Set(samples.map(sample => sample.id));
    const additions = [];
    for (const sample of data.samples) {
      if (typeof sample.id !== "string" || !sample.id || typeof sample.sessionId !== "string" ||
          !sample.sessionId || !LABELS.includes(sample.label)) throw new Error("样本编号、轮次或英文标签无效。");
      prepareSample(sample); // 检查时间与坐标；不会把特征替换进原始样本。
      if (!ids.has(sample.id)) { ids.add(sample.id); additions.push(sample); }
    }
    if (additions.length) {
      samples.push(...additions);
      unsaved = true;
      dataChanged();
      renderSamples();
    }
    trainingMessage(`导入 ${additions.length} 条，跳过 ${data.samples.length - additions.length} 条重复编号。`);
  } catch (error) {
    trainingMessage(`导入失败：${error.message}`, true);
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
