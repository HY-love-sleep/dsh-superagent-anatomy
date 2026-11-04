# dsh-superagent-anatomy

> 把 DeepSeek 的 Super-agent 原型拆到源码级：一条消息如何从飞书进来，被判成工单、派给独立的 Worker、再回到原会话。

**非官方解读。** 全文依据 [`deepseek-ai/dsh-superagent-prototype`](https://github.com/deepseek-ai/dsh-superagent-prototype) 的固定提交 [`6337fc8`](https://github.com/deepseek-ai/dsh-superagent-prototype/tree/6337fc823ce20251c8de8085948165c81aaa701e)。上游是 MIT 授权的研究原型，官方明确声明它不是产品；本仓库不代表 DeepSeek，也不提供端到端运行认证。

## 从这里开始

**▶ [60 秒交互流程图](https://hy-love-sleep.github.io/dsh-superagent-anatomy/superagent-flow/watch.html)** ｜ [MP4](docs/superagent-flow/superagent-flow.mp4) ｜ [六幕缩略图](docs/superagent-flow/evidence/frames/contact-sheet.jpg)

点开就能播放、拖动、跳到任意章节。不需要下载，也不需要在本机起 HTTP 服务。

一句话概括这套流程：**Orchestrator 判断和协调，Engine 维护规则与状态，Worker 执行与自检；用工单把请求、后续要求和交付串成闭环。**

## 内容

### 文章：一篇回答一个问题

| # | 这篇在回答什么 | 文件 |
|---|---|---|
| 01 | 一条飞书消息要经过哪几道判断，才能变成一个 Worker 任务？ | [源码追踪](articles/01-feishu-to-worker.md) |
| 02 | Router 为什么不做技术拆单？和 Hermes + Codex 那套编排差在哪？ | [设计对比](articles/02-superagent-vs-hermes-codex.md) |

每篇的结构固定：开头三行给结论 → 中段引源码，全部用 **permalink 锁 commit**（行号会漂，commit 不会）→ 结尾一段与对照实现的差异。

### 术语表

[dsh / Super-agent 术语中文对照](glossary/README.md) — Router、Ticket、Mandate、Outbox 这些词在中文语境里到底指什么，以及它们和 LangGraph、Claude Agent SDK 的概念怎么对应。**这是个人理解，欢迎指正。**

### 考卷

[exam/](exam/README.md) — 公开的基线自测：7 道题、我的原始作答、分数和边界。六周后重考，diff 公开。

### 破坏实验

[experiments/](experiments/README.md) — 关掉一个机制，记录它怎么坏。这一栏还在做，进度见文件本身。

## 这个仓库不做什么

- **不是官方文档，不替上游发言。** 上游一改，这里就会过期；每一处引用都锁了 commit，你可以对照着判断哪句话还成立。
- **不号称跑通。** 这里的结论来自读源码和读上游文档，不是端到端运行的证明。涉及运行时行为的推断都单独标注了口径。
- **不含任何凭据、私聊内容或工作数据。**

## 复现流程图视频

根目录的 `package.json` 只用于重新渲染流程视频，不是本仓库的主体。需要 Node.js 22+、FFmpeg 和 Hyperframes 使用的 Chromium：

```sh
npm ci --ignore-scripts --no-audit --no-fund
npx hyperframes browser ensure
npm run check:video
npm run render:video
```

播放器的回归测试与基线截图：`CHROME=/path/to/chrome-headless-shell npm run test:video`。细节见 [流程说明](docs/superagent-flow/README.md)。

## 许可

- 文档与图表：CC-BY-4.0，见 [LICENSE-docs](LICENSE-docs)
- 脚本与播放器代码：MIT，见 [LICENSE](LICENSE)
- 上游归属与第三方素材：见 [NOTICE](NOTICE) 和 [THIRD-PARTY-NOTICES](docs/superagent-flow/THIRD-PARTY-NOTICES.md)

---

English: [README.en.md](README.en.md)
