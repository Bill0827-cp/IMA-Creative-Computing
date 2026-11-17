# 双 AprilTag 墙图展览 · Cloudflare

此项目已改为服务器管理的多组墙图 AR 展览。Cloudflare Workers 托管网页和 API，D1 保存图片配对及安装参数，R2 保存图片。手机通过同源 WebAssembly Worker 检测 **tag36h11** 标签，不再编译墙图特征，也不需要每位观众做站立／蹲下校准。

## 后台与观众流程

手机观看页为铺满页面的摄像头，首次只显示开启按钮；开启后隐藏全部网页控件，不显示标题、状态、参数、图片列表或后台入口。浏览器自身的地址栏和权限提示由浏览器控制。第二张照片在墙图平面内采用圆形柔边裁切，摄像头窗口不裁成圆形。后台独立通过 `/admin.html` 访问。

1. 打开网站的 `/admin.html`，输入管理员密钥。
2. 新增一组，上传墙图 A 和它对应的显示图 B。可创建最多 40 组，每组有独立的 B、两个标签 ID、安装尺寸和渐变角度。
3. 设置墙图实际宽高、标签黑框边长、左右标签中心距离、墙图下缘到黑框上缘的距离。后台分配默认唯一 ID；重复、越界或重叠布置将阻止发布。
4. 下载整张安装 SVG 或左右标签 SVG，按 **实际尺寸 / 100%** 打印，复核底部 50 mm 标尺。大幅整张图需打印店或分块打印，不能选择“适应纸张”缩放。
5. 将两个标签按布置图贴在图片下方，顶部朝上、与墙图共面。保留白色静区；标签尺寸指外侧黑框边长，不含白边。图像内容比例与设置不同时，安装图和覆盖图均居中裁切。
6. 点击「保存并发布」。新观众立即读取新配置，已打开的观看页约 15 秒自动刷新一次；上传后未发布的配对不会出现在展览中。
7. 手机打开网站首页，允许后置摄像头。墙图和下方两个标签完整入镜时，自动找到配对并透视覆盖。站立平视时保持真实画面；手机随身体降低、仰视时逐渐显示 B。多组可同时定位。

后台工作草稿保存在当前浏览器 IndexedDB，管理员密钥只保存在当前标签页 sessionStorage。备份配置包含图片 URL 和参数；它不是包含图片文件的跨账号迁移包。R2 上传的图片使用随机 URL，属于可公开访问的展览资源。移除某组会在下次发布时移除其映射，不立即删除 R2 文件，避免误删共享图片。

## 为什么不需要每次校准

后台保存的是实际墙图和两个标签的固定几何关系。手机获取两组已知 ID 标签的八个角点，用归一化最小二乘拟合平面投影，将墙图四角投影到视频中。只有对应的两个标签都被正确识别、位置关系合理时才显示覆盖图；单标签或 ID 重复不会凭空猜测。

相机位置通过平面投影与估计的相机内参计算，并结合后台设置的墙图中心离地高度换算摄像头高度。默认墙图中心离地 **175 cm**，对角视场角为 60°，均可在后台调整。**无需每次姿态校准，不等于无需安装测量，也不等于精密测量。** 不同手机镜头内参和镜头畸变可能影响高度估计，展示现场仍需要核对。不能检测人的真实身高、年龄或蹲姿。

默认手机离地 **150 cm** 开始轻微融合，**120 cm** 为完整显现位置。非线性渐变让前半段更多保留真实墙图：约 140 cm 时 B 只占约 7%，135 cm 时约 31%，130 cm 时约 67%。默认缓动时间 900 ms，稳定到新高度后约 2.7 秒接近目标混合比例，站起时同样缓慢退回原图。旧版已发布配置自动补上这些高度默认值，图片配对与标签位置不变；可逐组在后台修改后发布。

保留位置滤波与轻微边缘柔化。第二张图下载完成后才开始渐显，避免加载结束突然跳出。缺失标签后快速淡出；超过约 600 ms 没有可信更新也视为丢失。标签太小、远距离、反光、极斜角度和纸张弯曲都会影响效果。

## 当前 Cloudflare 资源

- Worker：`wall-perspectives`
- D1：`wall-perspectives`，绑定 `DB`
- R2：`wall-perspectives-images`，绑定 `IMAGES`
- 静态资源：`ASSETS`
- Secret：`ADMIN_TOKEN`（至少 24 字符，建议使用自动生成的随机值）

观看页：https://wall-perspectives.wangqt0827.workers.dev/

后台：https://wall-perspectives.wangqt0827.workers.dev/admin.html

`wrangler.jsonc` 包含当前数据库 ID；如果迁移到其他账号，应创建新的资源并更新绑定，不能直接复用该 ID。

## 开发与部署

需要 Node.js 和 Cloudflare 官方 Wrangler（已锁定在 package-lock.json）。

```powershell
cd D:\IMA-Creative-Computing\Lenticular_Camera
npm.cmd ci
node configure-admin.cjs
npm.cmd run db:local
npm.cmd run dev
```

本地页面通常为 `http://localhost:8787`，使用本地 D1/R2 模拟资源。`.dev.vars` 与 `ADMIN_ACCESS.md` 保存本机管理员密钥，已被 Git 忽略，不应提交或复制到公开目录。`node serve.cjs` 也是构建并启动 Wrangler 的快捷入口。

发布：

```powershell
npx.cmd wrangler login
npm.cmd run db:remote
npm.cmd run deploy
node configure-admin.cjs --remote
```

最后一条通过 stdin 上传密钥，不把值放到命令参数或日志。管理员密钥文件路径为 `Lenticular_Camera/ADMIN_ACCESS.md`。更换管理员密钥时更新 `.dev.vars` 后重新运行该命令，旧会话密钥随即失效。

新账号部署前需创建 D1 和 R2：`wrangler d1 create wall-perspectives`、`wrangler r2 bucket create wall-perspectives-images`，并将返回的 D1 ID 写入 `wrangler.jsonc`。Cloudflare 资源使用量遵循账号套餐。手机正式访问必须用 HTTPS；项目不再以 GitHub Pages 为后台运行环境。

## 文件与验证

- `admin.html` / `admin.js`：后台编辑、双图上传、发布、草稿、安装图导出。
- `worker.mjs`：管理员 Bearer 密钥校验、图片格式与大小限制、配置校验、D1 版本冲突保护、R2 图片服务。
- `catalog.mjs`：共享数据格式与安装参数校验。
- `app.js`：多组实时定位、按角度显现、自动配置刷新。
- `tag-pose.mjs`：八点投影拟合、几何一致性检查及绝对仰角估计。
- `tag-worker.js` / `detector-client.mjs`：同源 WASM 检测，单帧背压与超时。
- `tag-format.mjs`：官方 tag36h11 编码与实际尺寸 SVG。
- `vendor/apriltag`：固定版本检测器、官方标签编码、许可证与 SHA256 清单；不依赖运行时外部 CDN。

```powershell
npm.cmd test
# Wrangler dev 启动后，仅在本地测试上传/发布链路：
node integration.test.mjs
```

测试包含真实 WASM 标签解码与四角顺序、ID/尺寸校验、双标签缺失/重复/错放拒绝、观看角度、相机旋转不改变观看位置、渐变、后台鉴权、版本冲突，以及本地真实 D1/R2 链路。摄像头视觉效果、现场印刷尺寸与跨手机误差仍需实机测试。

第三方来源：[AprilRobotics AprilTag 3.4.3](https://github.com/AprilRobotics/apriltag/tree/v3.4.3)、[AprilTag JS WASM](https://github.com/AliAlimohamad/apriltag-js/tree/4359086c430e44342098a464c359aacf00cf6bc8)。BSD-2-Clause 授权声明保留于 vendor 目录。Cloudflare 配置参考：[Workers 静态资源](https://developers.cloudflare.com/workers/static-assets/binding/)。
