# 在 p5.js 中使用嘴唇动作模型

1. 在原来的 Model 页面完成训练，点击“导出模型（用于 p5）”。允许浏览器下载多个文件，并确认三个文件都已保存。
2. 在 p5.js Web Editor 新建项目。将本目录的 `index.html`、`sketch.js` 内容分别替换编辑器中的同名文件，再添加 `lip-features.js`。
3. 上传导出的 `model.json`、`model_meta.json`、`model.weights.bin` 到项目根目录，与 `sketch.js` 同级。文件名不同时修改 sketch.js 中的三个路径。
4. 点击运行，再点击“加载模型并开启摄像头”，允许摄像头权限。等待绿色嘴唇点出现。
5. 点击“录制新动作并预测”，等待 3 秒倒计时，在随后的 2 秒内无声说一次词语，保持页面在前台。

`sketch.js` 中的 `label` 和 `confidence` 保存最新结果。在 `draw()` 中根据 `label` 控制颜色、动画或其他交互。`No speech` 是训练类别之一。

`lip-features.js` 从训练页面原样提取，负责空间校正和时间重采样。不要直接将原训练页面的 `get_data.js` 放入 p5；它依赖原页面的按钮和 DOM。未来若修改训练预处理，需同步更新此文件并重新训练、导出模型。

示例使用 p5 1.11.10、ml5 1.2.1 和与训练页面一致的 MediaPipe FaceMesh 配置。需要联网加载库和 FaceMesh 资源。也可以在本地通过 localhost HTTP 服务运行，不能直接双击 HTML。

此目录没有附带训练权重；需使用自己的训练结果。已做 JavaScript 语法及预处理一致性检查，尚未用实际模型和摄像头完成端到端验证。
