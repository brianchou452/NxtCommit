# 分支與檔案盤點 — 2026-09-12

[English](BRANCHES.md) · [協作指南](COLLABORATION.zh-TW.md)

> 推送前更新：遠端 main 已前進到 `111df8b`，包含 `974ed8b` 的 CI 效能工作。本文件提交已接上該遠端歷史；下表與 JSON 保留較早 `e73f296` 盤點基準，因此 CI 分支現已整合。後續隊員未提交的 agents／Langfuse 工作不在此固定快照中，未被改動。
這是本機快照，不保證 GitHub 遠端仍停在相同 SHA。盤點讀取所有本機 branch 的 tracked file tree、差異及交接文件；未執行全部分支測試，未合併程式碼。完整路徑與 Git object ID 見 [JSON 清單](branch-inventory.json)；不含檔案內容、忽略的 env、資料庫或私密 runtime artifacts。

## 工作目錄

- `NxtCommit` 與 `NxtCommit-delivery` 共用 Git object store，分別在 chaos 與 main 工作；兩者當次檢查皆乾淨。
- `NxtCommit-ci-performance` 是另一份 clone，另有本機 CI 分支；當次檢查乾淨。
- 本機清單共七個 branch ref（含兩份 main），跨兩個 repository；原 repo 的 A/B 只出現在 cached remote refs，另列如下。

## 本機 branch


| Repository | Branch | Pinned SHA | Scope / relation to delivery main `e73f296` |
| --- | --- | --- | --- |
| shared | `main` | `e73f296` | Foundation + Cloudflare + Responses + key runbook |
| shared | `codex/cloudflare-cicd` | `5b2dcfe` | Infrastructure history; fully contained in main |
| shared | `codex/product-delivery` | `026f710` | Initial container delivery; fully contained in main |
| shared | `dev/computer-c` | `ec95912` | Authoring/review; 1 branch-only and 10 main-only commits |
| shared | `codex/chaos-experiment-agents` | `e3b692a` | Includes C, chaos and self-update; 6 branch-only and 10 main-only commits |
| ci-performance | `main` | `e228efd` | Older local main; not the delivery source of truth |
| ci-performance | `codex/ci-speed-capacity` | `974ed8b` | CI consolidation, capacity probe and measured report; contains `e73f296` |

## 分支專屬文件與限制

從對應 repository 讀取固定版本，不需要切換隊員 checkout：

```bash
git show ec95912:docs/PHASE2-C.md
git show ec95912:docs/PHASE2-C-VISUAL-REVIEW.md
git show e3b692a:docs/CHAOS-AGENTS.md
git show e3b692a:docs/SELF-UPDATE.md
# In NxtCommit-ci-performance:
git show 974ed8b:docs/cicd/PERFORMANCE.md
```

以上文件均有 `.zh-TW.md` 版本。

- C：repository 分析、文案草稿、reviewability、review persistence、operations 與前端頁面；交接報告有 8 個 C browser journeys 通過，但 14 個視覺比較仍失敗／待審。需要 B 真實執行證據與單一 mission authority。
- Chaos：17 個 controlled fault scenarios 與 sequential advisory roles；不是已部署的任務 agent fleet。
- Self-update：限制範圍的本機前端更新，預設 off + demo locked；分支文件記錄真實本機驗證，但生成的 release snapshot 不在 Git source 中。未推論為 Cloudflare 已上線。
- CI performance：文件記錄 application CI 68→59 秒、contracts 41→26 秒的單次樣本與 720 個唯讀暖機請求；不是持續負載、LLM 或整合產品容量證明。最新分支與快取 remote 的 `5400dbc` 不同，交接時需明確指定 `974ed8b`。

## A／B 快取遠端參照


| Ref | SHA | Read without checkout |
| --- | --- | --- |
| `origin/dev/computer-a` | `24b211f` | `git show 24b211f:docs/PHASE2-COMPUTER-A.md` |
| `origin/dev/computer-b` | `e6057bd` | `git show e6057bd:docs/PHASE2-COMPUTER-B-HANDOFF.md` |
| B coverage | `e6057bd` | `git show e6057bd:docs/PHASE2-COMPUTER-B-COVERAGE.md` |

A/B 不屬於本機 branch 的 JSON 清單。整合前 fetch 並重新核對 SHA 與交接；本次不將快取參照當成已合併功能。

## 更新快照

每次重要交接重跑 `git branch -vv`、`git worktree list`、`git rev-list --left-right --count main...分支`，並以 `git ls-tree -r 分支` 比較完整檔案樹。計數僅適用於上表固定基準；之後的文件 commit 也會改變 ahead/behind。清單本身為新增文件，未存在於被盤點的基準 tree。
