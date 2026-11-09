// Shared by collection and prediction; independent of the DOM for testing.
// 【坐标工具】立即执行函数把内部变量包起来，避免污染全局作用域。root 在浏览器里是 globalThis。
(function (root) {
// 每对数字表示一条骨架线的两个端点索引。0是手腕；1–4为拇指；5–8食指；9–12中指；13–16无名指；17–20小指。
  const edges = [[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[0,17],[17,18],[18,19],[19,20]];
// 输入：HandPose 给出的一只手和视频宽高；输出：按固定顺序排列的42个数字。训练和预测必须调用同一转换。
  function flatten(hand, width, height) {
    if (!(width > 0 && height > 0) || hand?.keypoints?.length !== 21) throw new Error('Expected 21 hand landmarks and valid video dimensions.');
// flatMap 把每个点返回的 [x,y] 拼成一个长数组，而不是21个小数组。坐标顺序不可随意改变，否则模型会把不同关节混为一谈。
    return hand.keypoints.flatMap(p => {
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) throw new Error('Invalid hand landmark.');
      // Mirror x to match the displayed camera; divide by dimensions for resolution independence.
// 例如 x=160、宽=640，镜像后 x=1-160/640=0.75；y只除以高度。一般落在0到1附近，但画面边缘检测可能略超出。
// 这里不会消除位置和尺度差异：同一个手势移到别处仍有不同坐标，所以采集时要覆盖不同位置和距离。
      return [1 - p.x / width, p.y / height];
    });
  }
// 导入数据时检查数组形状、数值有限性和宽松范围。±10 是拒绝离谱输入的保护范围，不是要求真实手势覆盖此范围。
  function valid(sample) { return Array.isArray(sample) && sample.length === 42 && sample.every(v => Number.isFinite(v) && Math.abs(v) <= 10); }
// 把三个工具打包。Node 测试通过 module.exports 获取；网页通过全局 HandFeatures 获取。
  const api = { flatten, valid, edges };
  if (typeof module !== 'undefined') module.exports = api;
  else root.HandFeatures = api;
})(globalThis);
