// 【自动测试】执行 node --test Model2/hand-features.test.cjs。测试纯坐标函数，不需要打开摄像头，也不代表完整浏览器测试已通过。
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { flatten, valid } = require('./hand-features.js');
// 构造21个可预测的点作为测试数据，不是真实摄像头输出。
const hand = { keypoints: Array.from({ length: 21 }, (_, i) => ({ x: 100 + i * 5, y: 100 + i * 3 })) };
// 检查特征数量、镜像方向和 x/y 的顺序。assert 断言不成立时测试失败。
test('21 landmarks produce 42 finite features with x mirrored to match preview', () => {
  const values = flatten(hand, 640, 480);
  assert.equal(values.length, 42); assert.equal(values[0], 1 - 100 / 640);
  assert.equal(values[1], 100 / 480); assert.ok(valid(values));
});
// 把所有像素坐标和画面尺寸同时放大2倍，结果应完全一样：验证分辨率转换的一致性。
test('same hand at a different video resolution produces the same features', () => {
  const doubled = { keypoints: hand.keypoints.map(p => ({ x: p.x * 2, y: p.y * 2 })) };
  assert.deepEqual(flatten(hand, 640, 480), flatten(doubled, 1280, 960));
});
// 错误点数、零宽度、NaN、无穷大、字符串和旧像素数据必须被拒绝，防止训练收到无效特征。
test('malformed landmarks and legacy pixel samples are rejected', () => {
  assert.throws(() => flatten({ keypoints: [] }, 640, 480));
  assert.throws(() => flatten(hand, 0, 480));
  assert.throws(() => flatten({ keypoints: hand.keypoints.map(p => ({ x: NaN, y: p.y })) }, 640, 480));
  assert.equal(valid(Array(768).fill(0)), false);
  assert.equal(valid(Array(42).fill(Infinity)), false);
  assert.equal(valid(Array(42).fill('0')), false);
});
