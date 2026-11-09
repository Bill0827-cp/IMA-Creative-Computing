# Hand Sign Studio

## 中文代码阅读指南

代码中已加入中文学习注释。建议先理解下面的流程，再看具体函数：

摄像头画面 → HandPose 找出21个手部关键点 → 转为42个 x/y 数字 → 收集并标注手势 → 训练自己的神经网络 → 对新手势进行预测。

**两个模型不要混淆**：`handPose` 是已训练好的关键点检测器；`network` 是用你自己的样本训练的手势分类器。

推荐阅读顺序：

1. `index.html`：找到视频、采集、训练和预测区域。每个 `id` 与 JavaScript 中的 `$()` 对应。
2. `app.js` 最后的“九、事件绑定”：看看点击按钮会调用什么函数。
3. `startCamera()` → `loadHandPose()` → `detectHands()`：摄像头如何产生手部坐标。
4. `hand-features.js` 的 `flatten()`：21个点如何变成42个数，镜像和尺寸换算如何完成。
5. `startRecording()`：数据怎样放进 `classes[i].samples`。一次样本是静态姿势，不是一段动作视频。
6. `train()`：创建网络、整理样本、打乱顺序、加入数据、归一化、训练。这里详细解释了隐藏层、学习率、批次、轮数和损失。
7. `startPreview()`：`network.classify(sample)` 使用训练好的参数预测，结果不会自动加入训练数据。
8. `exportData()`、`importData()` 和保存模型按钮：区别“保存样本”和“保存训练后的权重”。
9. `style.css`：理解布局和样式；`serve.cjs`：理解为什么需要运行本地服务器。

神经网络的矩阵运算和反向传播在 ml5 内部的 TensorFlow.js 中执行，本项目通过 API 调用它们。注释中的数学解释是帮助理解调用背后的过程，不表示本项目手写了这些算法。

常见语法：`const` 声明不重新赋值的变量；`let` 可以重新赋值；`=>` 定义函数；`async/await` 等待异步任务；`map` 转换数组；`flatMap` 转换并展开一层；`forEach` 遍历；`some` 检查至少一项；`find` 查找第一项；`?.` 在对象为空时安全跳过访问。

修改注释不会改变功能。学习时可以先在页面调整 epochs 或类别名，再观察训练损失和新样本的预测结果；训练损失降低不等于对新手势一定识别更准。

Train your own single-hand, static-sign classifier in one page: collect hand landmarks, train ml5.neuralNetwork, and try live predictions.

## Run

From the repository root, run:

    node Model2/serve.cjs

Open http://127.0.0.1:8002. No npm installation is needed. Use localhost or HTTPS for camera access. The browser downloads ml5 1.2.1 and the pretrained HandPose model, so internet access is needed. The first camera start may take a minute.

## Train your signs

1. Enable the camera and show one hand. Wait for the green landmark skeleton.
2. Rename Rock, Paper, and Scissors to your own signs, or add/remove classes (2?8 classes).
3. Hold a sign and click Record examples. Slowly vary its position, angle, and distance. Stop recording BEFORE switching signs. Collection pauses when no hand or two hands are detected. Each collected sample uses a fresh detector result.
4. Collect at least 10 examples per class; start with 30?50 across several separate recording bursts. Keep class counts similar. Undo removes the last sample.
5. Click Train model (50 epochs by default). Progress shows epochs and training loss.
6. Live predictions start automatically if the camera is running. Test fresh poses. No hand or two hands displays Show one hand instead of a classification.
7. Save dataset downloads landmark examples and names. Open dataset restores them for retraining. Save trained model downloads the ml5 model JSON, weights BIN, normalization metadata JSON, and a separate label-map JSON. Allow multiple downloads if prompted; keep all four files together.

Samples and weights otherwise live only in page memory. Save before refreshing. This page reopens datasets for retraining; it does not provide a saved-model import control. To reuse an exported model in another sketch, use ml5.neuralNetwork().load(...), the exact preprocessing below, and hand-sign-labels.json to translate internal labels into names.

## Relationship to the example

Based on the supplied official [rock?paper?scissors training example](https://editor.p5js.org/ml5/sketches/rR51vvi-u) and [neural-network reference](https://docs.ml5js.org/#/reference/neural-network).

- A pretrained ml5.handPose detector finds 21 hand landmarks. You train your own sign classifier, not HandPose itself.
- Like the example, each hand becomes 42 values in landmark order: x0, y0, x1, y1, through x20, y20.
- This app mirrors x to match the preview and divides by video dimensions: x = 1 - keypoint.x / videoWidth; y = keypoint.y / videoHeight. It uses the full frame, not a crop. Collection and inference share this conversion.
- network.addData(inputs, { label: 'class_0' }) associates coordinates with a class. Internal labels map to editable display names.
- network.normalizeData() computes training normalization. network.train(...) trains a dense classifier with 64 hidden units. network.classify(...) applies the saved normalization during inference.
- network.save('hand-sign-model') exports the model and normalization metadata. The app separately exports display names and a preprocessing identifier.

This replaces the previous pixel classifier. Old pixel datasets are rejected: collect new hand-landmark examples. New datasets use format hand-sign-studio-v1 and feature identifier mirrored-xy21-relative-to-frame. They contain landmarks, not camera images.

## Scope and tips

This recognizes static poses with one hand, like rock/paper/scissors. It does not recognize motion sequences, two-hand signs, or complete sign language. Two-dimensional landmarks may confuse poses that differ mainly in depth or palm orientation. Use the same hand initially; collect both left and right hands if both should work.

Coordinates are frame-relative, so vary position and distance while collecting. Keep the whole hand visible. Training loss and confidence scores are not held-out accuracy: test new poses after training. With a visible hand the classifier chooses among trained classes; an Other pose class with varied examples may help but cannot guarantee rejection of every unfamiliar pose.

## Files and checks

- app.js: camera, HandPose, collection, training/prediction, and exports.
- hand-features.js: shared coordinate conversion and skeleton connections.
- index.html and style.css: interface.
- serve.cjs: local server.
- hand-features.test.cjs: mirroring, coordinate order, resolution independence, malformed inputs.

Run:

    node --check Model2/app.js
    node --test Model2/hand-features.test.cjs

Manual checks: camera allow/deny/retry; skeleton alignment; no-hand/two-hand collection pause; train distinct signs; clear predictions when hand leaves; stop/restart camera; dataset round trip; reject legacy pixels without replacing current samples; invalidate the model after editing; verify all model exports download.

Camera images and collected landmarks are not uploaded by this app. Dependencies and model assets download from external servers. The Model folder is unchanged.
