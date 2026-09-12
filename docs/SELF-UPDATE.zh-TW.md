# 可開關的本機自我更新 Agent

> **2026-09-12 LangGraph / Langfuse 更新：** 本機 agents 已使用持久化階段流程與 metadata-only 監控；續跑、防重播、操作指令及限制請見 [Agent 操作手冊](AGENT-OPERATIONS.zh-TW.md)。既有 Demo 鎖與網站版本維持獨立。

[English](SELF-UPDATE.md)

操作者可啟用模型真正修改程式的「前端穩定度」更新流程。預設為 **關閉＋Demo
鎖定**，與原有建議型 Chaos 迴圈分開。沒有公開 API 控制此功能，使用本機 CLI：

```bash
npm run agents:update -- status
npm run agents:update -- demo-on   # 展示前凍結
npm run agents:update -- off       # 停止新工作並撤銷待套用版本
npm run agents:update -- demo-off  # 明確結束展示保護
npm run agents:update -- on        # 啟用；Demo 鎖也必須關閉
npm run agents:update -- run       # 一次有界真實模型迭代
npm run agents:update -- watch 10  # 最多 10 輪，間隔 5 分鐘
npm run agents:update -- rollback  # 回到前一靜態版本，需先 demo-off
```

設定持久化於 Git 忽略的 `var/self-update/settings.json`。單獨 on 不會解除 Demo
鎖。每次切換產生新 epoch；舊候選即使遇到 off/on 或 demo-on/demo-off，也不能
套用。模型生成或容器驗證中改開關，會取消該輪；套用前再次核對 epoch。
短暫的版本切換／smoke transaction 與開關操作互斥，因此 `demo-on` 成功回覆後，
待處理的更新不能再套用。回覆之前已完成的切換不會自動還原。
設定損壞或缺失皆不放行。以 SIGTERM 停止 watcher；沒有開機自動執行服務。

## 迭代範圍

模型僅收到三個本機前端檔案：`src/services/api.ts`、`src/services/authoring.ts`、
`src/components/useApplicationSession.ts`。最多三個精確匹配替換，每段不超過
16 KB，附雙語理由，不得改 imports 或加入遠端 URL。
機密、後端、SQLite migration、依賴、測試、更新控制與核准截圖均不可修改。
第一版處理請求失敗與狀態復原，不是任意功能的全自主開發。

初始目標是穩定處理 null／非 JSON 錯誤回應，同時保留成功 payload、server
錯誤碼與 AbortError 身分。已滿足目標時保留 no-op 建議，不套用新版本。
用 `npm run agents:update -- goal "<下一個有界目標>"` 保存新目標並撤銷舊目標
候選，下一輪啟用時執行。擴大檔案範圍仍需檢視控制器修改，不能讓模型自行
擴權；原有固定品質 gate 持續有效。

使用既有 `.env` 憑證，每輪最多一次呼叫、45 秒期限；GPT-5 最多 5000 completion
tokens（含 reasoning），其他相容模型最多 3000。僅接受 OpenAI 官方端點。
回傳 usage 才記錄，未知不填零。Prompt 版本為 `self-update-proposal-v1`。
不將原始碼或建議匯出 Langfuse，報告不含 API key。

## 驗證與套用

1. 從操作者初始化的乾淨原始碼快照及目前版本開始。
2. 模型提出精確替換，由程式驗證允許範圍。
3. 獨立候選在 Docker 跑 typecheck、全部 server tests、六個固定請求契約、
   production build 及全部整合後 foundation／product Playwright journeys。
   不更新核准截圖。
4. 固定 image digest；容器無網路、服務憑證或 Docker socket，原始碼／測試唯讀，
   僅輸出與暫存可写，另含獨立 32 MB Vite config 快取。限制 2 CPU、2 GB RAM、256 PIDs、240 秒。沒有 host
   執行備援；Docker executable/context 由操作者設定。
5. 全通過且 epoch、目前 base 仍相同，才原子切換 `current`。保留舊雜湊 assets
   給已開啟頁面使用；API／後端 process 與資料庫固定不動。
6. 驗證本機 readiness 和 HTML，失敗或逾時回到上一個 pointer；解除 Demo
   保護後也可用本機 rollback 指令還原。

網頁健康與測試全綠不等於完全正確，也不是完整 visual regression 核准、語意
品質證據或後端發布。有限修改範圍、固定測試、Demo 鎖与上一版降低風險，但
不能證明任意生成 JavaScript 安全。設定、watcher 與版本目錄以可信本機 OS
使用者為前提，不是 multi-tenant 隔離。

## 初始化本機部署

先檢查、建置並提交可信控制器原始碼：

```bash
npm run check
npm run check-version
npm run agents:update -- init
SELF_UPDATE_ROOT=./var/self-update HOST=127.0.0.1 PORT=4188 \
  VAR_DIR=./var/chaos-local EXECUTION_MODE=demo npm start
```

`init` 需要本機 `nxtcommit-agent-verifier:local` image，並記錄不可變 ID，同時保留獨立 `nxtcommit-self-update-verifier:local` tag。
若本機 image 被移除，可用 `npm run agents:update -- verifier` 明確更新固定 image，
並撤銷待處理工作。
預設 Docker 為 `~/.docker/bin/docker`、context `colima`；可用
`SELF_UPDATE_DOCKER`、`SELF_UPDATE_DOCKER_CONTEXT` 覆寫。
它複製乾淨的已追蹤原始碼與建置好的 dist，保持 off／Demo locked。
初始化不啟動 watcher 或改變既有 process；需帶 `SELF_UPDATE_ROOT` 重啟一次
應用，後續前端版本切換不需重啟。模型程式不在 host 執行，也不改 Git 分支或
delivery worktree。

候選的 `proposal.json`、`verification.log`、瀏覽器 artifacts、終態 `result.json`
在 `var/self-update/candidates/<id>/`。成功版本、原始碼快照與 manifest 在
`releases/<id>/`，`current` 是真正 serving pointer。最多保留 20 個 release，
超過後停止新工作，待操作者歸檔；失敗候選亦需管理保留期限。
目前 worker 使用作業系統釋放的 SQLite 鎖與啟用 journal；不要刪除 lock database。
舊目錄鎖會拒絕啟動，詳見 [復原操作](AGENT-OPERATIONS.zh-TW.md)。

## 交接

入口：`server/self-update/cli.ts`、`runner.ts`、`control.ts`、`proposal.ts`。
應用接線：`server/index.ts` 的 `SELF_UPDATE_ROOT`。契約測試：`control.test.ts`；
候選品質 gate：`quality-cli.ts`。沒有新增產品頁或身分驗證宣稱。
整合後 B scripted fixture engine 與待處理視覺核准獨立於此流程；本機真實執行證據與受控單元
測試分開記錄於部署紀錄。

## 本機實測 — 2026-09-12

候選 `8d63b714-cac6-485b-b328-c82a40e380b3` 由真實 `gpt-5-mini` 產生（回報
2147 tokens），固定請求契約從 4/6 改善為 6/6，78 個 server tests 與 12 個
Docker browser journeys 通過，終態為 `promoted`。Serving release header 與
index HTML 都符合該版本。接著在真實執行中開啟 demo-on，候選
`5363297d-8d9e-4b53-992e-3cb6f2ad7404` 進入 `cancelled`，serving pointer 不變；
off 模式執行亦未建立新候選。最終為 off、Demo locked。報告在忽略的
`var/self-update/`；先前 build-cache 與 image 遺失失敗均保留且未套用。
Git 分支保留操作者 baseline；生成程式在目前 release 快照中，未偷偷合併 Git。
