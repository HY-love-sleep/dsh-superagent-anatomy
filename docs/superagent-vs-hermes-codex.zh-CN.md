# Superagent 与 Hermes + Codex：设计对比及借鉴建议

## 0. 阅读范围

本文比较两种编排方式：

- **项目工作流**：Hermes 负责需求与验收，Codex architect 负责规划，Codex worker 按任务单执行。
- **Superagent**：基于公开研究原型 [deepseek-ai/dsh-superagent-prototype](<https://github.com/deepseek-ai/dsh-superagent-prototype>)，固定提交为 [`6337fc823ce20251c8de8085948165c81aaa701e`](<https://github.com/deepseek-ai/dsh-superagent-prototype/commit/6337fc823ce20251c8de8085948165c81aaa701e>)。文中上游链接均锁定该版本。

对照工作流来自一份未入库的流程说明。本文只概括其架构与规则，不附原文、个人文件路径、会话记录或部署配置。第 2 节给出比较所依赖的完整角色与流程假设；未在说明中描述的能力不推断为不存在。

**证据口径：**

- **【工作流约定】**：对照模型中的既定规则，不代表已检查其脚本实现。
- **【原型文档】**：公开文档明确描述的职责和机制。
- **【代码核查】**：核查了对应局部实现，不等于做过端到端运行验证。
- **【建议】**：可考虑的改造方向，不代表原型已实现或本仓库已执行。

本次没有读取 Hermes/Codex 配置，没有运行旧工作流，也没有做性能或成本基准。上游 [README:3–7](<https://github.com/deepseek-ai/dsh-superagent-prototype/blob/6337fc823ce20251c8de8085948165c81aaa701e/README.md#L3-L7>) 明确声明它是研究原型，不是官方产品或生产能力承诺，也不完全等同于内部实现和相关文章中的全部设想。

## 1. 结论先行

**共同点是控制与施工分离、持久记录优先于会话记忆；最大区别不是模型或 agent 数量，而是编排的对象。**

- **项目工作流围绕“一次迭代”编排**：需求变成明确任务单，受限 worker 按机器验收施工，强调需求口径、成本纪律和可验证性。
- **Superagent 围绕“持续到来的工作与消息”编排**：判断哪些消息授权了工作、后续讨论归哪个任务、失败后如何恢复、何时需要人、怎样把结果送回原会话。

最值得借鉴的不是再加一个主控模型，而是把**任务身份、授权、状态、后续消息和交付**变成宿主程序维护的机制。

**建议：保留项目工作流的验收内核，借鉴 Superagent 的事件与生命周期管理。**

## 2. 角色映射：项目工作流实际不只是“两层”

### 2.1 对照工作流

【工作流约定】比较采用以下角色分工：

| 角色 | 责任 | 不承担的工作 |
|---|---|---|
| 人 | 澄清需求、决定取舍、看最终效果 | 不必管理每个施工步骤 |
| Hermes | 维护需求规格与验收表，审任务单、复核、汇报 | 不直接修改实现或承接长任务 |
| Codex architect | 技术拆单、影响分析、失败复盘 | 不修改仓库或执行实现代码 |
| Codex worker | 每单一条会话，按任务单施工、自测、报告 | 不擅自扩大范围或改变需求口径 |
| 验收工具 | 按项目规则机器判定 | 不替代人的产品判断 |

迭代闭环为：

```text
人提出需求
  ↓
Hermes 更新需求与验收口径
  ↓
architect 产任务草案 → Hermes 审改 → 向人确认
  ↓
worker 施工 → 机器验收
  ├─ PASS → Hermes 复核 → 人看效果
  └─ FAIL → 回喂同一 worker；最多两轮，仍失败则升级复盘
```

另外包含三项重要约定：

1. 需求规格、状态记录、人的决策记录分别持久保存，会话不是唯一事实来源。
2. worker 只读任务单指定的规格章节，以控制上下文成本。
3. 验收工具即使由施工 agent 实现，也须由 Hermes 做一次负向测试，确认故意破坏条件时确实会失败。

这些约定是后文讨论的比较基线，不是对任意 Hermes/Codex 组合的普遍描述。

### 2.2 Superagent 的分工

【原型文档】主 Session 负责路由，Executor 读取原始来源、判断范围、实施和验证；router 不承担技术拆单或二次改写需求。[职责依据](<https://github.com/deepseek-ai/dsh-superagent-prototype/blob/6337fc823ce20251c8de8085948165c81aaa701e/docs/004-prompts.md#L73-L89>)

```text
Feishu / GitHub 事件
  ↓
宿主：记录、去重、准入、线程分流
  ├─ 已有任务的后续输入 → 原 Ticket worker
  └─ 需要接单判断 → Orchestrator：接单 / 路由 / 停止 / 忽略
                         ↓ 原始请求与授权范围
                   Ticket worker：调查、方案、实现、验证、交付
                         ↕ 后续消息、CI、review
                   宿主：持久化、调度与恢复
                         ↓ 可用结果或确需人处理的问题
                   回到原会话
```

上图是逻辑分工，不表示所有消息都重新经过 router，也不表示每次交付都一定是代码 PR。

**因此，router 不是 architect 的升级版，Hermes 也不能直接改名为 router。**

| 项目工作流职责 | Superagent 中更接近的位置 |
|---|---|
| Hermes 接收需求、向人汇报 | Orchestrator + Source/Channel |
| Hermes 制定需求与业务验收口径 | 不属于 router 的默认职责；需要项目规范、原始请求与必要澄清 |
| architect 技术拆单与影响分析 | 通常由 Ticket worker 负责，不必有独立常驻规划层 |
| worker 按单施工 | Ticket worker 的一部分；后者还处理调查、交付和范围内后续反馈 |
| 状态文件中的执行进度 | 持久化的 Ticket / Assignment / Report 及面板视图 |
| 项目机器验收 | 仍需项目自己的测试或 CI，框架不会自动提供可靠业务标准 |

## 3. 共同点：项目工作流已经做对的部分

### 3.1 不让主控顺手变成施工者

两者都把长任务交给执行者，让主控保持可响应。区别在于项目工作流保留独立技术规划者，而 Superagent 刻意把技术责任留给直接接触原始上下文和代码的 worker。

### 3.2 不把聊天记忆当唯一事实来源

项目工作流用需求、状态、决策文件跨会话传递事实；Superagent 则持久化事件、接单决定、工单、派工、输入和报告。[领域依据](<https://github.com/deepseek-ai/dsh-superagent-prototype/blob/6337fc823ce20251c8de8085948165c81aaa701e/docs/001-domain.md#L21-L43>)

二者并不冲突：**需求规格记录产品意图，任务记录保存执行事实。** 不该用数据库取代业务规格，也不该让手写状态文件与数据库同时声称是执行状态的唯一真相。

### 3.3 用任务隔离限制上下文

项目工作流每单一个 worker；Superagent 每 Ticket 一个执行 Session 与目录，并按需展开原始上下文。[执行器依据](<https://github.com/deepseek-ai/dsh-superagent-prototype/blob/6337fc823ce20251c8de8085948165c81aaa701e/docs/003-execution.md#L23-L53>)

但任务隔离不保证上下文大小恒定：一个 Ticket 可能持续处理评论、CI 和修改反馈。

### 3.4 需要验证、人的决定和后台派发

两者都不能只以“命令跑完”判断成功，也都避免让主控阻塞等待长任务。Superagent 进一步管理后台工作、并发槽位与完成唤醒。[调度依据](<https://github.com/deepseek-ai/dsh-superagent-prototype/blob/6337fc823ce20251c8de8085948165c81aaa701e/docs/003-execution.md#L31-L61>)

## 4. 核心差异

| 维度 | Hermes + Codex 项目工作流 | Superagent 原型 |
|---|---|---|
| 主要优化目标 | 清晰需求、可控施工、成本纪律 | 持续接收工作、可靠交付、减少人的注意力消耗 |
| 工作单位 | 经确认的任务单与一次 goal loop | 有独立身份和授权的 Ticket，可跨多次 Assignment |
| 控制层职责 | Hermes 管需求验收，architect 管技术规划 | Router 管路由，worker 在授权范围内端到端负责 |
| 输入上下文 | 指定规格章节与任务单 | 原始请求、相关线程和按需补读的资源 |
| 执行状态 | 文件记录与会话 id | SQLite 持久状态、输入与报告、待执行动作 |
| 授权 | 人确认任务单与操作禁区 | Gate / Policy / Mandate；上下文投递不授予额外权限 |
| 后续讨论 | 已规定 FAIL 回喂；跨线程跟踪未描述 | 订阅投递给原任务，范围内处理，越界则交回路由 |
| 退出规则 | 最多两轮，仍失败则升级复盘 | 按影响和授权范围判断；不同类型的重试另有规则 |
| 故障恢复 | 同一 worker 会话 resume；宿主恢复未描述 | 区分 Ticket 与 Assignment，持久化待办，重启后恢复 |
| 验收 | 项目专用机器验收，加独立负向测试 | 通用交付要求与项目检查；不天然含该负向测试约定 |
| 完成语义 | 验收后复核、汇报、看效果 | 进度、问题、ready、失败分开；开 PR 不等于 ready |
| 主动工作 | 比较基线中未描述 | 书面规则；observe 只记录，auto 才按匹配规则接单 |
| 成本判断 | 显式迭代预算、少读规格 | 按需读取、并发管理、减少消息；没有更省 token 的实测保证 |

### 4.1 从“派一条命令”到“管理有身份的工作”

【原型文档】以下对象有不同生命周期：

- **Trigger**：不可变事件，承载审计与去重身份。
- **Ticket**：被授权的工作，不是某次模型调用。
- **Assignment**：某次派工，关联一个执行器实例。
- **Input / Report**：后来收到的信息，以及执行者报告的事实与状态。

这样可以区分“任务未完成”“执行器失败”“输入没送达”，而不必把每次恢复都变成新任务。[定义依据](<https://github.com/deepseek-ai/dsh-superagent-prototype/blob/6337fc823ce20251c8de8085948165c81aaa701e/docs/001-domain.md#L25-L43>)

### 4.2 上下文与授权分离

【原型文档】同一线程的评论、机器人 review 和 CI 可以进入任务上下文，但**收到建议不等于被授权实施建议**。任务内后续问题由 worker 判断；超范围请求交回路由；只为背景而跟进的线程也不提供新授权。[授权依据](<https://github.com/deepseek-ai/dsh-superagent-prototype/blob/6337fc823ce20251c8de8085948165c81aaa701e/docs/002-authorization.md#L7-L44>)

这把“不越任务范围”的提示词原则，推进成显式准入、授权记录、订阅与交回流程。范围是否合适仍有模型判断成分，不能把它理解成对所有实现动作的确定性拦截。

### 4.3 恢复的不只是模型会话

会话 resume 不能独自回答以下问题：任务创建但未派发怎么办？评论记录但未送入 worker 怎么办？外部 PR 已创建但本地状态未更新怎么办？回复排队但发送失败怎么办？

【原型文档】Superagent 使用 SQLite、事务、Effects 与 Outbox，先持久记录待执行工作，再在事务提交后执行；重启恢复时要求核对现状再重复外部动作。[架构依据](<https://github.com/deepseek-ai/dsh-superagent-prototype/blob/6337fc823ce20251c8de8085948165c81aaa701e/docs/007-architecture.md#L149-L181>)；[恢复依据](<https://github.com/deepseek-ai/dsh-superagent-prototype/blob/6337fc823ce20251c8de8085948165c81aaa701e/docs/003-execution.md#L144-L191>)。

【代码核查】Effects 按 kind/key 持久排队，失败退避重试，并用 generation 避免旧执行结果覆盖新任务载荷。[实现](<https://github.com/deepseek-ai/dsh-superagent-prototype/blob/6337fc823ce20251c8de8085948165c81aaa701e/src/app/effects.ts#L42-L159>)

这**不是所有外部操作 exactly-once 的保证**。外部动作与本地回执之间仍可能有不确定窗口；worker 自行创建的产物也须恢复时核对。

### 4.4 从进度汇报到人的注意力管理

【原型文档】工作期间默认保持安静，结果可用、需要具体决定或确实无法完成时才打扰人；请求确认与直接问答另有规则。[设计原则](<https://github.com/deepseek-ai/dsh-superagent-prototype/blob/6337fc823ce20251c8de8085948165c81aaa701e/docs/000-philosophy.md#L3-L15>)

【代码核查】Replies 根据用途检查发送资格：结果需要相应就绪或完成状态；求助需要匹配当前结构化问题；回答需要对应人的原始消息，涉及已分配工单时，还需匹配 worker 已报告的回答记录。[实现](<https://github.com/deepseek-ai/dsh-superagent-prototype/blob/6337fc823ce20251c8de8085948165c81aaa701e/src/core/replies.ts#L64-L91>)

**值得借鉴的是完整证据留在记录里，对人只说可用结果与必要动作，不是删掉测试、数字或失败证据。**

## 5. 项目工作流中应保留的优势

1. **明确的需求和验收口径。** 工作流框架不能凭空产生业务正确性；规格仍应独立维护。
2. **独立负向测试。** 实现与验收工具由同一 agent 编写时，可能一起漏需求；故意破坏条件并确认失败，是有价值的校验。但一次负向测试不能证明覆盖充分。
3. **人的产品决策记录。** Superagent 的 `Decision` 主要是接单/路由决定，不等于产品取舍日志，两者不应互相替代。
4. **明确预算。** 两轮上限可以保留为默认止损机制，再叠加时间/token 预算。

需要校正一种归因：**第二轮仍失败，只能说明该迭代预算耗尽，不能证明一定是需求或任务单错误。** 实现、环境、依赖和验收工具本身也可能有问题，应分类复盘。

Superagent 对临时基础设施故障、评估超时、自动 reviewer 等有不同维度的重试限制，不能混成一个 goal loop 计数器。[执行故障](<https://github.com/deepseek-ai/dsh-superagent-prototype/blob/6337fc823ce20251c8de8085948165c81aaa701e/docs/003-execution.md#L118-L157>)；[自动 review 规则](<https://github.com/deepseek-ai/dsh-superagent-prototype/blob/6337fc823ce20251c8de8085948165c81aaa701e/docs/004-prompts.md#L83-L89>)。

## 6. 借鉴优先级

以下均为【建议】，不是已有实现或已执行的迁移。

### P0：先补状态与交付，不增加 agent 层级

**结构化任务记录。** 至少保存任务 id、原始请求、规格范围/版本、worker 会话、执行尝试、检查结果、产物位置、当前问题、人工暂停及其解除条件。初期可以用单写入者维护的文件；出现并发或频繁恢复需求后再考虑数据库。人工可读状态页尽量由记录生成，避免双重真相。

**明确完成条件。** 区分施工中、检查通过但待复核、结果可用、需人决定、执行失败。交付前确认产物存在且符合约定；代码 PR 可审阅与已合并是两件事。

**结构化求助。** 不只说“任务失败，看日志”，而是明确缺少什么、已试过哪些可行办法、人现在只需做什么。无关且已获授权的工作可继续。

### P1：补消息归属与恢复

**后续输入回到原任务。** 维护原始对话/PR 与任务 id 的映射，FAIL、评论和补充要求回到原 worker；超范围请求重新评估，不自动扩大任务范围。

**区分失败类型。**

| 类别 | 建议处理 |
|---|---|
| 网络、限流、临时传输失败 | 少量退避重试，单独计数 |
| 实现或验收失败 | 消耗施工预算，检查是否取得新进展 |
| 需求冲突、影响越界、确需人的决定 | 保留现场，提出具体问题，不靠重试解决 |

**记录外部动作。** 先对派工、创建 PR、提交产物、发送完成消息增加简化 outbox/回执；重启后核对实际结果再决定重做，不必立即复制完整事件平台。

### P2：确有规模需求后再平台化

- 并发槽位与队列，让人的追问优先于新后台任务。
- Feishu/GitHub 来源适配与线程订阅。
- 策略版本、审计视图、任务面板。
- 主动工作：先 observe 看误报，再考虑 auto。[模式定义](<https://github.com/deepseek-ai/dsh-superagent-prototype/blob/6337fc823ce20251c8de8085948165c81aaa701e/docs/002-authorization.md#L91-L105>)

单人、单项目、低频派工时，这些机制的维护成本可能超过收益。多项目是可能的扩展需求，不代表本原型已提供多仓库编排。

## 7. 推荐的混合形态

【建议】保留 Hermes 的需求验收职责，只补轻量任务宿主：

```text
人：需求与产品决定
  ↓
Hermes：需求规格、验收口径、决策记录
  ↓
轻量宿主：任务身份、范围、状态、预算、输入队列、回执
  ↓
复杂任务按需调用 architect 规划
  ↓
Codex worker：调查 → 实现 → 自测 → 机器验收 → 报告
  ↑ 任务内后续反馈
  ↓
Hermes 独立复核 → 原会话交付可用结果或具体问题
```

这保留了项目工作流的产品与验收责任人，**不是 Superagent 的默认 router 分工**。architect 可保留给复杂拆单和复盘，不必每单必经；减少中转不能以牺牲设计判断为代价。

## 8. 边界：不要把设计目标当能力保证

1. **目录不是安全沙箱。** 原型 Executor 以运行者 OS 用户执行；目录与命令包装建立默认行为，不是完整安全边界。[依据](<https://github.com/deepseek-ai/dsh-superagent-prototype/blob/6337fc823ce20251c8de8085948165c81aaa701e/docs/003-execution.md#L23-L29>)；[明确限制](<https://github.com/deepseek-ai/dsh-superagent-prototype/blob/6337fc823ce20251c8de8085948165c81aaa701e/docs/003-execution.md#L76-L80>)。
2. **Executor 抽象不等于可直接切换 Codex。** 本文涉及的具体执行器是 DSH；没有验证替换后端的适配工作。[执行器映射](<https://github.com/deepseek-ai/dsh-superagent-prototype/blob/6337fc823ce20251c8de8085948165c81aaa701e/docs/007-architecture.md#L197-L207>)。
3. **宿主检查与提示词约束不同。** 准入和回复用途有程序检查；技术范围、完整自审等仍需模型遵循要求。[优先级说明](<https://github.com/deepseek-ai/dsh-superagent-prototype/blob/6337fc823ce20251c8de8085948165c81aaa701e/docs/004-prompts.md#L63-L71>)。
4. **ready 不等于 merged。** 开 PR 不意味着可以交付；有 PR 的工单还跟踪 PR 生命周期。合并权限由部署指令及仓库保护决定，不因采用此架构而自动获得。[交付规则](<https://github.com/deepseek-ai/dsh-superagent-prototype/blob/6337fc823ce20251c8de8085948165c81aaa701e/docs/004-prompts.md#L83-L89>)；[合并与结束](<https://github.com/deepseek-ai/dsh-superagent-prototype/blob/6337fc823ce20251c8de8085948165c81aaa701e/docs/003-execution.md#L82-L106>)。
5. **没有成本与性能胜负结论。** 少占人的注意力是设计目标，不是已测得的收益；更便宜、更快、更可靠都需要同任务对照实验。

## 9. 最终判断

项目工作流已经抓住角色分工、会话外真相、受限施工、确定性反馈和预算退出，并不是缺少几个 agent 的简陋方案。

Superagent 更值得借鉴的是持续工作的组织机制：**谁授权、哪件事、消息归谁、失败怎样恢复、何时结果可用、怎样少打扰人。**

**先补任务状态、结构化求助和交付闭环，再补消息归属与恢复，最后才考虑主动监听与完整平台化。**

## 参考与核查范围

- 原型文档：[000 Philosophy](<https://github.com/deepseek-ai/dsh-superagent-prototype/blob/6337fc823ce20251c8de8085948165c81aaa701e/docs/000-philosophy.md>)、[001 Domain](<https://github.com/deepseek-ai/dsh-superagent-prototype/blob/6337fc823ce20251c8de8085948165c81aaa701e/docs/001-domain.md>)、[002 Authorization](<https://github.com/deepseek-ai/dsh-superagent-prototype/blob/6337fc823ce20251c8de8085948165c81aaa701e/docs/002-authorization.md>)、[003 Execution](<https://github.com/deepseek-ai/dsh-superagent-prototype/blob/6337fc823ce20251c8de8085948165c81aaa701e/docs/003-execution.md>)、[004 Prompts](<https://github.com/deepseek-ai/dsh-superagent-prototype/blob/6337fc823ce20251c8de8085948165c81aaa701e/docs/004-prompts.md>)。
- 架构索引：[007 Architecture:1–300](<https://github.com/deepseek-ai/dsh-superagent-prototype/blob/6337fc823ce20251c8de8085948165c81aaa701e/docs/007-architecture.md#L1-L300>)。
- 局部代码：[Effects](<https://github.com/deepseek-ai/dsh-superagent-prototype/blob/6337fc823ce20251c8de8085948165c81aaa701e/src/app/effects.ts#L42-L159>)、[Replies](<https://github.com/deepseek-ai/dsh-superagent-prototype/blob/6337fc823ce20251c8de8085948165c81aaa701e/src/core/replies.ts#L20-L95>)。
- 仓库内延伸阅读：[飞书请求到 Worker 的源码追踪](<feishu-to-worker-source-trace.zh-CN.md>)。

以上是设计与局部代码核查，不是运行正确性认证；比较基线的原始流程说明不随本文公开，因此其脚本行为不能由本文独立复现。
