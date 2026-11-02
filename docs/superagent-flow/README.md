# Superagent：从一句请求到闭环交付

**一句话：Orchestrator 判断和协调，Engine 维护规则与状态，Worker 执行与自检；用工单把请求、后续要求和交付串成闭环。**

## 直接使用

- [观看或下载 60 秒 MP4](<superagent-flow.mp4>)：1920 × 1080，30 fps，H.264，无声中文图解。
- [交互 HTML](<watch.html>)：播放、暂停、拖动、章节跳转，另附六句话摘要和固定版本源码依据。
- [可编辑 HTML 动画](<index.html>)：Hyperframes 直接读取的根合成；全部文字和图形均可编辑。
- [六幕缩略图](<evidence/frames/contact-sheet.jpg>)：实际 HTML 渲染捕获，不是概念效果图。

GitHub 的 HTML 文件页仅显示源码，不能运行播放器。下载整个目录（保留 `assets/`），然后在该目录执行：

```sh
python3 -m http.server 8090 --bind 127.0.0.1
```

浏览器打开 `http://127.0.0.1:8090/watch.html`。不要只下载 HTML 或直接以 `file://` 打开：本地文件的 iframe 同源访问可能被浏览器阻止。离线使用不依赖 CDN、HeyGen 账号或系统中文字体。

## 六幕结构

| 时间 | 要点 |
| --- | --- |
| 00–10 秒 | 核心是持续跟进的工单，不是一段临时聊天。 |
| 10–20 秒 | Orchestrator、Engine、Worker 各司其职，Engine 不是另一个模型。 |
| 20–30 秒 | 新消息归一化、去重和检查准入；@ 不等于直接开工。 |
| 30–40 秒 | 接受后记录工单、授权与执行安排，异步准备目录和独立会话。 |
| 40–50 秒 | 原线程相关人类后续要求通常进入原 Worker，超范围交回评估。 |
| 50–60 秒 | report 是内部报告；常规结果经调度者组织回复、Outbox 投递回原会话。 |

## 内容口径与边界

依据公开研究原型 [deepseek-ai/dsh-superagent-prototype](<https://github.com/deepseek-ai/dsh-superagent-prototype/tree/6337fc823ce20251c8de8085948165c81aaa701e>) 固定提交 `6337fc823ce20251c8de8085948165c81aaa701e`，详细追踪见 [源码说明](<../feishu-to-worker-source-trace.zh-CN.md>)；播放器“依据与边界”包含六个直接源码链接。

这是静态源码解读，不是官方产品宣传或真实飞书端到端运行证明。特意保留以下边界：

- prepare 是可配置部署命令，不内置固定 clone / worktree 流程。
- 独立目录和 Session 不等于安全沙箱。
- 普通进展通常不通知人；接单确认以及 PR 合并 / 关闭终态通知有其他路径。
- 就绪不代表测试必然真实、结果必然正确、PR 已合并或消息已送达。
- 已有工单线程的相关人类后续消息通常不重新接单；机器人和 CI 不能提供明确的人类授权，也不能凭消息恢复已结束任务；启动新工作仍受主动规则约束。

## 本地复现

从仓库根目录运行，要求 Node.js 22+、FFmpeg，以及 Hyperframes 使用的 Chromium：

```sh
npm ci --ignore-scripts --no-audit --no-fund
npx hyperframes browser ensure
npm run check:video
npm run render:video
```

依赖版本锁定在 [package.json](<../../package.json>) 与 [package-lock.json](<../../package-lock.json>)。渲染命令实际调用 Hyperframes 0.9.0，不是浏览器录屏或用 FFmpeg 假冒 HTML 渲染；FFmpeg 仅由 Hyperframes 编码视频，并用于后续解码验证。

播放器回归测试与基准截图：

```sh
CHROME=/absolute/path/to/chrome-headless-shell npm run test:video
```

测试使用临时回环 HTTP 服务，运行结束立即关闭；默认基线是 `git merge-base HEAD origin/main`，可用 `BASELINE_REV` 指定。不会替换或改动 DSH GUI。

## 视觉对照说明

这是新增的解说文件，不是修改已有应用界面。基线版本没有该 HTML 地址：

- **Before**：[实际基线 HTTP 404](<evidence/before-baseline-404.png>)，由测试直接从基线 Git 树读取同一地址；不是虚构旧 UI。
- **After**：[实际 HTML 播放器桌面截图](<evidence/after-player-desktop.png>)，同一路径、1440 × 1100、浅色、无登录状态，第二章选中。
- [390 × 844 手机宽度截图](<evidence/after-player-mobile.png>)。

基线不存在播放器，因此不声称有“同一旧播放器状态”的视觉对比。基线修订与变更修订在 PR 中标明。

## 检查记录与许可

[验证记录](<REVIEW.md>)列出实际检查与保留的工具警告；[第三方声明](<THIRD-PARTY-NOTICES.md>)记录 GSAP 和开源中文字体的来源与许可。画面不使用私聊内容、凭据、用户头像或其他私人素材。
