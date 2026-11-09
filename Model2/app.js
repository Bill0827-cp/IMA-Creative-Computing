// 【阅读地图】本文件负责整个网页的交互；不是 ml5 库本身。
// 建议阅读顺序：文件末尾的按钮绑定 → startCamera → detectHands → startRecording → train → startPreview。
// 完整数据流：摄像头图像 → 已训练的 HandPose → 21 个关节点 → 42 个数 → 自己训练的分类器 → 手势分数。
// 注意这里有两个模型：handPose 负责“找手上的点”；network 负责“这些点代表哪一种手势”。
// 我们只训练后者。训练、预测都在浏览器中完成；serve.cjs 只负责发送网页文件。
// "use strict" 开启严格模式，帮助发现未声明变量等错误。
"use strict";

// HandPose landmarks -> your own ml5 neural network -> live hand-sign predictions.
// 【一、状态和数据】$ 是自定义的简写，不是 jQuery。$("camera") 等于 document.getElementById("camera")。
const $ = id => document.getElementById(id);
// 每个样本有 21 × 2 = 42 个输入；LIMIT 限制每个类别最多 500 个样本，防止内存无限增长。
const INPUTS = 42, LIMIT = 500;
// 界面颜色数组，仅用于区别类别，不参与模型训练。
const colors = ['#b2bf77', '#c4a3d7', '#e4ac78', '#83b9b2', '#91add4', '#d7939c', '#a9b8a6', '#c7b985'];
// classes 是整个训练数据集，结构示例：
// [{ name: 'Rock', samples: [[x0,y0,...,x20,y20], [另一帧的42个数], ...] }, ...]
// map 把每个名字变成对象；samples 中的一项是一个静态手势样本，不是一段视频。
// const 不能重新赋值；let 可以。数组和对象即使由 const 声明，内部内容仍可修改。
let classes = ['Rock', 'Paper', 'Scissors'].map(name => ({ name, samples: [] }));
// stream：摄像头视频流；starting：正在启动；busy：训练/文件操作中；ready：模型可预测；dirty：数据尚未请求导出。
let stream = null, starting = false, busy = false, ready = false, dirty = false;
// network：自己训练的分类器；libraryPromise：ml5 加载任务；recording：正在录制的类别索引（-1 表示未录制）；timer：录制定时器。
let network = null, libraryPromise = null, recording = -1, timer = null;
// predicting：是否持续预测；predictionTask：正在执行的一次预测任务。
// generation 和 cameraGeneration 是任务版本号：停止/重启时递增，让旧异步任务的结果失效。
// Promise 表示异步任务的最终结果；await 等待它完成，但不会阻塞整个网页的事件处理。
let predicting = false, predictionTask = Promise.resolve(), generation = 0, cameraGeneration = 0;
// handPose 是预训练的手部检测器；handPromise 避免重复加载；detectionTask 用来等待旧检测循环退出。
let handPose = null, handPromise = null, detectionTask = Promise.resolve();
// latestHand：最近检测到的42个数；detectedAt：检测时间；handSequence：检测结果编号；capturedSequence：上次收集的编号，防止同一结果重复入库。
let latestHand = null, detectedAt = 0, handSequence = 0, capturedSequence = -1;
// 获取叠在视频上面的 canvas，以及它的二维绘图工具。视频显示照片，canvas 只画骨架。
const overlay = $('overlay'), overlayContext = overlay.getContext('2d');
// 超过 600 毫秒的检测结果视为过期。performance.now() 是单调计时，适合比较经过了多久。
function freshHand() { return latestHand && performance.now() - detectedAt < 600; }

// 【二、界面状态】更新顶部提示。textContent 把内容当文字显示；classList.toggle 控制错误提示的 CSS 样式。
function status(message, error = false) {
  $('status').textContent = message;
  $('status').classList.toggle('error', error);
}
// 只停止分类预览，不关闭摄像头。版本号变化后，已发出的旧预测即使返回也不能更新界面。
function stopPreview() {
  predicting = false; generation++; controls();
}
// 任何类别/样本修改都使旧模型失效：训练时用的类别顺序或数据已改变，必须重新训练。样本仍保留。
function changed() {
  dirty = true; ready = false; stopPreview();
  $('model-state').textContent = 'UNTRAINED';
  $('winner').textContent = 'Ready to learn.';
  $('confidence').textContent = 'Dataset changed — train to update';
  $('training-status').textContent = 'Collect at least 10 examples per class, then train.';
  $('progress').value = 0;
  renderScores(); controls();
}
// 统一计算按钮能否点击。disabled = true 表示禁用。
// !! 把值转为布尔值；&& 表示同时满足；|| 表示至少一个满足；! 表示取反。
// 三元表达式 条件 ? A : B 用于选择文字；some 检查是否至少有一项符合条件。
function controls() {
// video.readyState >= 2 表示已有可用视频帧；仅获得 stream 还不代表画面已就绪。
  const active = !!stream && $('camera').readyState >= 2;
  $('start').disabled = starting || !!stream || busy;
  $('stop').disabled = !stream && !starting;
  $('train').disabled = busy || recording >= 0 || classes.some(c => c.samples.length < 10);
  $('train').textContent = busy ? 'Training…' : ready ? 'Train again' : 'Train model';
  $('predict').disabled = busy || !ready || !active || recording >= 0;
  $('predict').textContent = predicting ? 'Pause preview' : 'Start preview';
  $('epochs').disabled = busy;
  $('save-model').disabled = busy || !ready || recording >= 0;
  $('add').disabled = busy || recording >= 0 || classes.length >= 8;
  $('import').disabled = busy || recording >= 0;
  $('export').disabled = busy || recording >= 0 || !classes.some(c => c.samples.length);
// reduce 从 0 开始累计各类别样本数；模板字符串 ${...} 把表达式结果插入文本。
  $('total').textContent = `${classes.reduce((n, c) => n + c.samples.length, 0)} examples · ${classes.length} classes`;
// 遍历每张类别卡。正在录制的卡仍允许点击“停止”，但其他卡不能同时录制。
  document.querySelectorAll('.class-card').forEach((card, i) => {
    card.querySelector('input').disabled = busy || recording >= 0;
    card.querySelector('.remove').disabled = busy || recording >= 0 || classes.length <= 2;
    card.querySelector('.capture').disabled = busy || !active || (recording !== i && !freshHand()) || (recording >= 0 && recording !== i) || classes[i].samples.length >= LIMIT;
    card.querySelector('.capture').textContent = recording === i ? '■ Stop recording' : '● Record examples';
    card.querySelector('.undo').disabled = busy || recording >= 0 || !classes[i].samples.length;
    card.querySelector('.class-meta').textContent = `${classes[i].samples.length} / ${LIMIT} hand samples`;
  });
}
// 把42个坐标画成64×64的小骨架缩略图。它不是保存的摄像头照片，也不作为训练输入。
function thumbnail(sample) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = '#eef3e6'; ctx.fillRect(0, 0, 64, 64);
  drawSkeleton(ctx, sample, 64, 64); return canvas;
}
// 按手部拓扑画线，再画关节点。sample 是交替排列的 x、y：第 a 个点在下标 a*2 和 a*2+1。
// 输入坐标相对于画面尺寸；乘以目标画布宽高，就还原为该画布上的像素位置。
function drawSkeleton(ctx, sample, width, height) {
  ctx.strokeStyle = '#70b74c'; ctx.fillStyle = '#c7ff88'; ctx.lineWidth = Math.max(1, width / 240);
  for (const [a, b] of HandFeatures.edges) {
    ctx.beginPath(); ctx.moveTo(sample[a * 2] * width, sample[a * 2 + 1] * height);
    ctx.lineTo(sample[b * 2] * width, sample[b * 2 + 1] * height); ctx.stroke();
  }
  for (let i = 0; i < 42; i += 2) { ctx.beginPath(); ctx.arc(sample[i] * width, sample[i + 1] * height, Math.max(1.5, width / 160), 0, Math.PI * 2); ctx.fill(); }
}
// 【三、生成类别卡片】数据在 classes 中，HTML 只是它的显示。
// replaceChildren 清空旧卡；createElement 创建元素；append 加到页面。
// innerHTML 使用固定模板；用户输入的类别名通过 value/textContent 设置，避免被当成 HTML 执行。
function renderClasses() {
  $('classes').replaceChildren();
  classes.forEach((group, i) => {
    const card = document.createElement('div'); card.className = 'card class-card';
    card.style.setProperty('--color', colors[i]);
    card.innerHTML = '<div class="class-top"><input maxlength="40"><button class="remove" title="Remove class">×</button></div><p class="class-meta"></p><div class="class-actions"><button class="capture"></button><button class="undo">Undo</button></div><div class="thumbs"></div>';
    const input = card.querySelector('input'); input.value = group.name; input.setAttribute('aria-label', `Name for class ${i + 1}`);
// 这里只登记回调函数，不会立即执行。用户修改名字后才调用；trim 去首尾空白，忽略大小写检查重名。
    input.onchange = () => {
      const name = input.value.trim();
      if (!name || classes.some((c, j) => j !== i && c.name.toLowerCase() === name.toLowerCase())) {
        input.value = group.name; status('Choose a nonempty, unique class name.', true); return;
      }
      group.name = name; changed();
    };
// splice(i,1) 删除该类别；pop 删除最后一个样本。删除后重画卡片，并使旧模型失效。
    card.querySelector('.remove').onclick = () => { classes.splice(i, 1); changed(); renderClasses(); };
    card.querySelector('.capture').onclick = () => recording === i ? stopRecording() : startRecording(i);
    card.querySelector('.undo').onclick = () => { group.samples.pop(); changed(); renderClasses(); };
// 只显示最后8个缩略图，完整样本仍保存在 samples；slice 不会删除原数组内容。
    group.samples.slice(-8).forEach(s => card.querySelector('.thumbs').append(thumbnail(s)));
    $('classes').append(card);
  }); controls();
}
// 绘制各类别分数条。find 按内部标签找到结果；?. 在找不到结果时避免报错；没有结果就显示0。
function renderScores(results = []) {
  $('results').replaceChildren();
  classes.forEach((group, i) => {
    // Stable internal labels avoid special property names and allow arbitrary display names.
    const score = results.find(r => r.label === `class_${i}`)?.confidence || 0;
    const row = document.createElement('div'); row.className = 'score'; row.style.setProperty('--color', colors[i]);
    row.innerHTML = '<div class="score-label"><span></span><strong></strong></div><div class="track"><div class="fill"></div></div>';
    row.querySelector('span').textContent = group.name;
    row.querySelector('strong').textContent = `${Math.round(score * 100)}%`;
    row.querySelector('.fill').style.width = `${score * 100}%`;
    $('results').append(row);
  });
}
// 【四、检测与采集】返回最近有效手势的数组副本。展开运算符 [...] 创建新数组，避免样本随共享对象变化。
function readHand() {
  if (!stream || !freshHand()) return null;
  return [...latestHand];
}
// 先加载 ml5，再设置 WebGL 计算后端并加载 HandPose。缓存同一个 Promise；失败后清空缓存，允许重试。
async function loadHandPose() {
  if (!handPromise) handPromise = (async () => {
    await loadLibrary(); await ml5.setBackend('webgl');
// 检测上限设为2，是为了发现并拒绝“双手同时出现”；分类器仍只接受单手。flipped=false：原始检测不镜像，稍后统一转换 x。
    const detector = ml5.handPose({ maxHands: 2, flipped: false });
    await detector.ready; handPose = detector; return detector;
  })().catch(error => { handPromise = null; throw error; });
  return handPromise;
}
// 持续检测循环。token 保存启动时的摄像头版本号；当前版本改变就退出。
// 这里使用 await detect 逐次检测，避免一次启动许多相互重叠的推理任务。
async function detectHands(token) {
  while (stream && token === cameraGeneration) {
    try {
// 训练/文件操作或页面在后台时暂停检测。短暂等待后继续检查，不退出整个摄像头会话。
      if (busy || document.hidden) { latestHand = null; await new Promise(resolve => setTimeout(resolve, 100)); continue; }
// HandPose 的推理发生在这一行：输入视频，输出手的数组，每只手包含21个关键点。这里不是训练自己的分类器。
      const hands = await handPose.detect($('camera'));
      if (token !== cameraGeneration) return;
// 只有恰好一只手才转换成训练特征；0只或2只手都用 null 表示没有有效输入。
      latestHand = hands.length === 1 ? HandFeatures.flatten(hands[0], overlay.width, overlay.height) : null;
      detectedAt = performance.now(); handSequence++;
      overlayContext.clearRect(0, 0, overlay.width, overlay.height);
      if (latestHand) drawSkeleton(overlayContext, latestHand, overlay.width, overlay.height);
      $('tracking').textContent = hands.length > 1 ? 'Show only one hand' : latestHand ? 'Hand tracked · 21 landmarks' : 'No hand detected';
      controls();
// 等待40毫秒给界面留出处理时间。实际检测周期还包括模型推理耗时，所以并不是固定25帧/秒。
      await new Promise(resolve => setTimeout(resolve, 40));
    } catch (error) {
      if (token === cameraGeneration) { stopCamera(); status(`Hand tracking failed: ${error.message}. Restart the camera to retry.`, true); }
      return;
    }
  }
}
// 停止样本收集定时器，但保留已有样本；不停止手部检测。
function stopRecording() { clearInterval(timer); timer = null; recording = -1; controls(); }
// i 是要录制的类别下标。点击一次开始持续采集，再点击同一按钮停止。
function startRecording(i) {
  changed(); recording = i;
  status(`Recording ${classes[i].name}. Move slightly, then click Stop recording.`);
  const capture = () => {
    try {
      const sample = readHand();
// 没有新鲜手部数据就跳过；同一个检测编号只收集一次。新检测结果不等于独立实验样本，相邻姿势仍可能非常相似。
      if (!sample || capturedSequence === handSequence) return;
      capturedSequence = handSequence;
// 真正保存训练样本的地方：把42个数字加进所选类别的 samples。此时尚未训练神经网络。
      classes[i].samples.push(sample);
      const thumbs = $('classes').children[i].querySelector('.thumbs');
      thumbs.append(thumbnail(classes[i].samples.at(-1)));
      while (thumbs.children.length > 8) thumbs.firstChild.remove();
      if (classes[i].samples.length >= LIMIT) { stopRecording(); status('Class sample limit reached.'); }
      controls();
    } catch (error) { stopRecording(); status(error.message, true); }
  };
// 每150毫秒尝试收集一次，并立即收集第一条；最多约6.7条/秒，检测慢时会更少。
  timer = setInterval(capture, 150); capture(); controls();
}
// 【五、摄像头生命周期】申请权限 → 将视频流交给 video → 等视频播放 → 加载检测器 → 启动检测循环。
async function startCamera() {
  const token = ++cameraGeneration; starting = true; controls();
  try {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('Open this app on localhost or HTTPS to use the camera.');
// getUserMedia 返回 Promise；video 请求摄像头，audio:false 不申请麦克风。浏览器可能要求用户授权。
    const acquired = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' }, audio: false });
// 申请权限期间用户可能已点“停止”。即使授权稍后成功，也立即释放这条过期的视频流。
    if (token !== cameraGeneration) { acquired.getTracks().forEach(t => t.stop()); return; }
    stream = acquired; $('camera').srcObject = stream; await $('camera').play();
    if (token !== cameraGeneration) return;
    $('placeholder').hidden = true;
    stream.getVideoTracks()[0].onended = () => { stopCamera(); status('Camera disconnected. Reconnect it and try again.', true); };
// 使用真实视频尺寸设置 canvas 绘图分辨率，而不仅仅设置 CSS 外观尺寸，避免骨架与视频错位。
    $('camera').width = overlay.width = $('camera').videoWidth;
    $('camera').height = overlay.height = $('camera').videoHeight;
    $('camera').parentElement.style.aspectRatio = `${overlay.width}/${overlay.height}`;
    status('Loading HandPose. The first download may take a minute.');
    await loadHandPose();
    if (token !== cameraGeneration) return;
// 等待旧检测循环结束，防止停止后快速重启导致同一检测器同时处理两轮视频。
    await detectionTask;
    if (token !== cameraGeneration) return;
    detectionTask = detectHands(token);
    status('Show one hand. Once the green landmarks appear, record examples of your sign.');
  } catch (error) {
    if (token !== cameraGeneration) return;
    stopCamera(); status(`Camera unavailable: ${error.message}. Check browser permissions and other camera apps.`, true);
  } finally { if (token === cameraGeneration) { starting = false; controls(); } }
}
// 关闭所有视频轨道才会真正释放摄像头。暂停 video 或隐藏元素并不等于关闭硬件。
function stopCamera() {
  cameraGeneration++; starting = false; stopRecording(); stopPreview();
  latestHand = null; overlayContext.clearRect(0, 0, overlay.width, overlay.height); $('tracking').textContent = 'Tracking off';
  stream?.getTracks().forEach(t => t.stop()); stream = null;
  $('camera').srcObject = null; $('placeholder').hidden = false; controls();
}
// 按需创建 script 标签下载固定版本 ml5。90秒超时后报错；成功/失败都清除超时计时器。
function loadLibrary() {
  if (window.ml5) return Promise.resolve();
  if (!libraryPromise) libraryPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/ml5@1.2.1/dist/ml5.min.js';
    const timeout = setTimeout(() => { script.remove(); libraryPromise = null; reject(new Error('ml5 download timed out. Check your connection and retry.')); }, 90000);
    script.onload = () => { clearTimeout(timeout); resolve(); };
    script.onerror = () => { clearTimeout(timeout); script.remove(); libraryPromise = null; reject(new Error('Could not download ml5. Check your connection and retry.')); };
    document.head.append(script);
  });
  return libraryPromise;
}
// 【六、核心：训练你自己的神经网络】
// 训练不是简单地把样本存起来：网络反复预测训练样本，比较预测与正确标签，用误差更新权重和偏置。
// 数学概念：神经元先计算 z = Σ(w_i * x_i) + b，再通过激活函数输出。
// 损失函数衡量预测误差；反向传播计算梯度；优化器据此更新参数。这些实际运算由 ml5 内部的 TensorFlow.js 完成。
// 本函数负责准备数据、设置参数和调用训练 API，不手写矩阵乘法或反向传播。
async function train() {
// epoch 表示完整训练集的一轮训练；50轮不是50个样本。输入框读出来是字符串，Number 转成数字。
  const epochs = Number($('epochs').value);
  if (!Number.isInteger(epochs) || epochs < 1 || epochs > 200) { status('Choose 1–200 whole-number epochs.', true); return; }
  busy = true; ready = false; stopPreview(); controls();
  $('model-state').textContent = 'TRAINING'; $('progress').max = epochs; $('progress').value = 0;
  status('Loading ml5 and preparing training. Keep this tab open.');
  try {
    await predictionTask; await loadLibrary();
// 等待预测结束后释放旧网络资源；每次训练都会新建网络，属于从头训练，不是接着旧权重继续训练。
    network?.dispose(); network = null;
// 创建分类神经网络：inputs=42 是输入特征数；outputs=['label'] 指一个类别字段，不是只有一个类别。
// 类别的实际取值由 addData 提供，如 class_0、class_1、class_2。
// hiddenUnits=64 设置默认隐藏层的单元数；learningRate=0.01 控制参数更新步长。
// task='classification' 表示分类；debug=false 关闭库自带的训练可视化。本页面自己显示进度。
    network = ml5.neuralNetwork({ inputs: INPUTS,
       outputs: ['label'], 
       task: 'classification', 
       hiddenUnits: 124, 
       learningRate: 0.01, 
       debug: false });
    await network.ready;
// flatMap 将“按类别分组”的样本摊平成一张表；每一项是 {inputs: 42个数, label: 内部类别名}。
    const examples = classes.flatMap((group, i) => group.samples.map(inputs => ({ inputs, label: `class_${i}` })));
    // Shuffle across classes before training (recordings were gathered in class order).
// Fisher–Yates 洗牌：每一步从剩余范围随机选一项交换位置，避免训练数据始终按类别成块排列。
    for (let i = examples.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [examples[i], examples[j]] = [examples[j], examples[i]]; }
// 给 ml5 提供监督学习的输入和正确答案。注意 addData 只是加入数据，真正调整权重发生在 train。
    examples.forEach(s => network.addData(s.inputs, { label: s.label }));
    // Match the ml5 hand-sign example: normalize training features; classify applies that metadata.
// 此前除以视频宽高是统一坐标单位；这里再根据训练数据计算归一化规则。预测时 ml5 复用这套规则，而不是重新拟合。
    network.normalizeData();
// 真正开始神经网络训练的调用。
// batchSize=16：每个小批次最多使用16个样本；epochs：训练轮数。
// validationSplit=0：没有划分验证集，因此下面显示的是训练损失，不是测试准确率。
// 第二个参数是每轮结束的回调，epoch 从0开始；第三个是完成回调（这里留空，因为后面使用 await）。
    await network.train({ epochs,
       batchSize: 16, 
       validationSplit: 0 }, (epoch, logs) => {
      $('progress').value = epoch + 1;
      $('training-status').textContent = `Epoch ${epoch + 1} / ${epochs} · loss ${Number(logs.loss).toFixed(4)}`;
    }, () => {});
// 只有训练成功后才允许预测。toFixed(4) 只是显示小数位，不改变模型精度。
    ready = true; $('model-state').textContent = 'READY';
    status('Training complete. Try your hand signs in the live preview.');
    $('confidence').textContent = 'Ready for live predictions';
  } catch (error) {
    $('model-state').textContent = 'UNTRAINED';
    $('training-status').textContent = 'Training failed. Your samples are preserved; you can retry.';
    status(`Training failed: ${error.message}`, true);
  } finally { busy = false; controls(); }
  if (ready && stream) startPreview();
}
// 【七、核心：用训练好的网络预测】每次取一个新鲜手势，等预测结束后再安排下一次，避免任务堆积。
async function startPreview() {
  predicting = true; const token = ++generation; controls();
  await predictionTask;
  if (!predicting || token !== generation) return;
  const step = async () => {
    if (!predicting || token !== generation) return;
    try {
      const sample = readHand();
      if (!sample) {
        $('winner').textContent = 'Show one hand'; $('confidence').textContent = 'Waiting for a tracked hand'; renderScores();
        if (predicting && token === generation) setTimeout(() => { if (predicting && token === generation) predictionTask = step(); }, 100);
        return;
      }
// 神经网络的前向运算入口：42个输入 → 使用学到的权重与偏置计算 → 输出各类别分数。
// 返回结果类似 [{label:'class_1', confidence:0.85}, ...]，ml5 按分数从高到低排序。
// 这里不提供正确答案，也不调用 addData，所以预测不会自动把新姿势加入训练集或更新权重。
      const results = await network.classify(sample);
      if (!predicting || token !== generation) return;
      if (!freshHand()) { $('winner').textContent = 'Show one hand'; $('confidence').textContent = 'Waiting for a tracked hand'; renderScores(); }
      else {
      renderScores(results);
// 取最高分结果，再把 class_1 中的数字1转换为 classes[1]，找到用户命名的手势。分数并不保证识别正确。
      const top = results[0];
      $('winner').textContent = classes[Number(top.label.split('_')[1])].name;
      $('confidence').textContent = `${(top.confidence * 100).toFixed(1)}% model score`;
      }
    } catch (error) { if (token === generation) { stopPreview(); status(`Preview stopped: ${error.message}`, true); } return; }
    if (predicting && token === generation) setTimeout(() => {
      if (predicting && token === generation) predictionTask = step();
    }, 100);
  };
  predictionTask = step();
}
// 【八、保存与打开】数据集导出保存的是样本和标签，不包含训练后的网络权重。JSON.stringify 把对象转为文本。
function exportData() {
  const blob = new Blob([JSON.stringify({ format: 'hand-sign-studio-v1', features: 'mirrored-xy21-relative-to-frame', classes })], { type: 'application/json' });
// Blob 是内存中的文件内容；临时 URL 让下载链接能读取它；稍后 revokeObjectURL 释放这个地址占用的资源。
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = 'hand-sign-dataset.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  dirty = false; status('Dataset download requested. Keep the JSON file to reopen and retrain later.');
}
// 读取用户选择的本地 JSON。先验证整个文件，全部合法后才替换当前数据，避免坏文件破坏已有样本。
async function importData(event) {
  const file = event.target.files[0]; if (!file) return;
  busy = true; stopPreview(); controls();
  try {
    if (file.size > 70 * 1024 * 1024) throw new Error('File is too large (maximum 70 MB).');
    const data = JSON.parse(await file.text());
    if (data.format !== 'hand-sign-studio-v1' || data.features !== 'mirrored-xy21-relative-to-frame' || !Array.isArray(data.classes) || data.classes.length < 2 || data.classes.length > 8) throw new Error('Expected a hand-sign dataset with 2–8 classes. Earlier pixel datasets cannot be used for hand training.');
// Set 保存不重复的名称，用于检查类别重名；同时检查每条样本必须是42个有限数字。
    const names = new Set();
    const incoming = data.classes.map(c => {
      if (typeof c.name !== 'string' || !c.name.trim() || c.name.length > 40 || names.has(c.name.trim().toLowerCase())) throw new Error('Invalid or duplicate class names.');
      names.add(c.name.trim().toLowerCase());
      if (!Array.isArray(c.samples) || c.samples.length > LIMIT || c.samples.some(s => !HandFeatures.valid(s))) throw new Error('Invalid hand landmarks or too many samples.');
      return { name: c.name.trim(), samples: c.samples };
    });
    if (dirty && !confirm('Replace the current dataset? Save it first if you want to keep it.')) return;
// 导入的是数据集，不是训练好的网络。因此调用 changed 使旧模型失效，用户需要重新训练。
    classes = incoming; changed(); dirty = false; renderClasses();
    status('Dataset opened. Train the model to start predicting.');
  } catch (error) { status(`Cannot open dataset: ${error.message}`, true); }
  finally { busy = false; event.target.value = ''; controls(); }
}
// 【九、事件绑定：网页的入口】这里把按钮和函数连接起来。赋值函数名只是登记，点击时才执行。
$('start').onclick = startCamera;
$('stop').onclick = () => { stopCamera(); status('Camera stopped. Your examples are still available.'); };
$('train').onclick = train;
// 模型导出与数据集导出不同：保存结构、训练好的权重、归一化元数据，以及额外的类别名称映射。
$('save-model').onclick = async () => {
  busy = true; stopPreview(); controls();
  try {
    await predictionTask;
// ml5 负责导出模型 JSON、权重 BIN 和元数据 JSON；下面另存标签映射，方便别的项目解释 class_0 等内部标签。
    await network.save('hand-sign-model');
    const blob = new Blob([JSON.stringify({ features: 'mirrored-xy21-relative-to-frame', labels: classes.map((c, i) => ({ label: `class_${i}`, name: c.name })) }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = 'hand-sign-labels.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    status('Model downloads requested. Keep the model JSON, weights BIN, metadata JSON, and labels JSON together. Allow multiple downloads if prompted.');
  } catch (error) { status(`Model export failed: ${error.message}`, true); }
  finally { busy = false; controls(); }
};
$('predict').onclick = () => predicting ? stopPreview() : startPreview();
$('add').onclick = () => {
  let n = classes.length + 1; while (classes.some(c => c.name.toLowerCase() === `class ${n}`)) n++;
  classes.push({ name: `Class ${n}`, samples: [] }); changed(); renderClasses();
};
$('export').onclick = exportData;
// “Open dataset”按钮触发隐藏文件选择框；选择文件后的 change 事件才调用 importData。
$('import').onclick = () => $('file').click();
$('file').onchange = importData;
// 切到后台停止录制和分类；检测循环也会暂停。beforeunload 在有未导出修改时请求浏览器提示；pagehide 释放摄像头。
document.addEventListener('visibilitychange', () => { if (document.hidden) { stopRecording(); stopPreview(); } });
window.addEventListener('beforeunload', event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } });
window.addEventListener('pagehide', stopCamera);
// 首次载入脚本时立即绘制类别和空分数条；摄像头仍需用户点击启动。
renderClasses(); renderScores();
