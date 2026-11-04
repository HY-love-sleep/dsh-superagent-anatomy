# dsh-superagent-anatomy

> Reading DeepSeek's Super-agent prototype down to the source: how one message travels from Feishu, becomes a ticket, gets dispatched to an isolated worker, and answers back in the original conversation.

**Unofficial.** Everything here is pinned to commit [`6337fc8`](https://github.com/deepseek-ai/dsh-superagent-prototype/tree/6337fc823ce20251c8de8085948165c81aaa701e) of [`deepseek-ai/dsh-superagent-prototype`](https://github.com/deepseek-ai/dsh-superagent-prototype). Upstream is an MIT-licensed research prototype that its authors explicitly call *not a product*. This repository does not speak for DeepSeek and makes no end-to-end runtime claims.

## Start here

**▶ [Interactive 60-second flow walkthrough](https://hy-love-sleep.github.io/dsh-superagent-anatomy/superagent-flow/watch.html)** ｜ [MP4](docs/superagent-flow/superagent-flow.mp4)

Opens and plays in the browser — no download, no local HTTP server.

The whole design in one line: **the Orchestrator decides and coordinates, the Engine owns rules and state, the Worker executes and self-checks; a ticket ties the request, the follow-ups and the delivery into one closed loop.**

## Contents

| # | What this answers | File |
|---|---|---|
| 01 | Which admission checks does a Feishu message pass before it becomes a worker task? | [Source trace](articles/01-feishu-to-worker.md) (zh-CN) |
| 02 | Why doesn't the Router do technical decomposition? How does it differ from a Hermes + Codex workflow? | [Design comparison](articles/02-superagent-vs-hermes-codex.md) (zh-CN) |

Every article follows the same shape: three-line conclusion → source quotes as **commit-pinned permalinks** (line numbers drift, commits don't) → one section on how a reference implementation differs.

Also in this repo:

- [Glossary](glossary/README.md) (zh-CN) — what Router / Ticket / Mandate / Outbox mean here, mapped onto LangGraph and Claude Agent SDK concepts. Personal reading; corrections welcome.
- [Exam](exam/README.md) (zh-CN) — a public baseline self-test: 7 questions, my raw answers, my score, and where each boundary is. Re-taken after six weeks, diff published.
- [Experiments](experiments/README.md) (zh-CN) — break one mechanism, record how it fails. In progress.

## What this repo is not

- **Not upstream documentation.** Upstream moves; this will go stale. Every quote is commit-pinned so you can tell which claims still hold.
- **Not a proof that it runs.** Conclusions come from reading source and upstream docs. Anything inferred about runtime behaviour is labelled as such.
- **No credentials, no private conversations, no work data.**

## Licence

- Documents and diagrams: CC-BY-4.0 — [LICENSE-docs](LICENSE-docs)
- Scripts and player code: MIT — [LICENSE](LICENSE)
- Upstream attribution and third-party assets: [NOTICE](NOTICE)
