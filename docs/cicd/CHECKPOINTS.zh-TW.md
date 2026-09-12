# 部署 checkpoint 紀錄

## CP-001 — 需求與初始目錄／2026-09-12

使用者授權建立 GitHub → Cloudflare CI/CD、使用 ianjuan.com 子網域，並保留黑客松評審證據。初始 Hackthon 目錄是空 Git repo，沒有 remote 或 source。早期規劃文件仍保留在原目錄，後續實作以本 repo 紀錄為準。

## CP-002 — Cloudflare 唯讀驗證／2026-09-12

Token 驗證回傳 active；帳戶清單與 ianjuan.com zone 查詢成功，zone 為 active，已確認所屬帳戶。這些檢查不代表寫入權限、DNS 變更、部署或 token 輪替完成。紀錄不包含憑證值。

## CP-003 — 正確 repo／2026-09-12

使用者提供 NxtCommit。確認 remote 為 brianchou452/NxtCommit，main 為 e60996320699133f8b64eb11b0ac85a2a7cd7b18，worktree 乾淨，尚無產品 source/package/CI 設定。已讀 AGENTS.md 與相關 contract；引用的 root 維護 skill、維運、安全、功能實況文件不存在。Contract 提到 SQLite 與 process execution，完整應用部署仍需 runtime 整合。建立 codex/cloudflare-cicd，未修改 main。

## CP-004 — GitHub 身分／2026-09-12

CLI credential helper 沒有 GitHub 憑證。Connector 帳號 ian-juan_tmemu 為 pull=true、push=false。使用者要求改用個人帳號 ianjuantw@gmail.com；GitHub Desktop 已登入 ianjuantw，Safari 顯示 push access 且可進入 Actions secrets。透過已登入的 repo UI 建立 CLOUDFLARE_API_TOKEN，GitHub 顯示「Repository secret added.」。未宣稱 connector 身分已切換。

## CP-005 — 實作與本機驗證／2026-09-12

新增 CI、main-only 序列部署、子網域衝突 preflight、revision smoke check、基礎設施 Worker 與雙語交接。依使用者要求將繼承的 GitLab／Argo 敘述改為 Cloudflare。Product-source guard 防止應用加入後誤發布佔位服務。

本機驗證：125 份 spec schema 通過，13 個引用的產品測試檔不存在，報告明確列出。3 項基礎設施行為測試通過；Wrangler 4.131.1 dry-run 成功；npm audit 回報零弱點。Node 22.23.2 來自 nodejs.org，已依官方 SHA256 檢查下載檔。

## 待完成 checkpoint

| ID | 完成證據 | 狀態 |
| --- | --- | --- |
| CP-006 | 儲存帳戶 variable、發布分支與 GitHub CI run 連結 | 完成；見下方 CP-006 |
| CP-007 | main 發布 run、Cloudflare version 與 HTTPS 版本一致收據 | 等待憑證交接；見下方 CP-007 |
| CP-008 | 真實框架/runtime 接入、產品測試與 readiness 證據 | 等待產品 source／技術棧 |
| CP-009 | 回滾演練與恢復版本證據 | 未執行 |

後續每筆須包含時間、變更、驗證、結果、證據連結與未完成工作。Secret 已設定或 contract 綠燈不代表產品部署完成。

## CP-006 — 雲端設定、CI 與同步文件衝突／2026-09-12

已在 repo UI 儲存並確認 CLOUDFLARE_ACCOUNT_ID。透過 ianjuantw 發布 c2eacb9 分支。[Push CI](https://github.com/brianchou452/NxtCommit/actions/runs/34668690840) 與 [PR CI](https://github.com/brianchou452/NxtCommit/actions/runs/34668726022) 均成功，已建立 [PR #1](https://github.com/brianchou452/NxtCommit/pull/1)。隊員同時推送 c21d4ed 歷史文件；兩份 add/add 衝突以保留隊員文件、將本次手冊移至 docs/cicd/RUNBOOK 解決。新增歷史範圍標示，未刪除事故紀錄。已讀新匯入文件；它們不代表產品 source 或本次部署已完成。

## CP-007 — 首次 main 發布遭 Cloudflare 拒絕／2026-09-12 02:55 UTC

更新分支的兩項 CI 均成功（[PR run](https://github.com/brianchou452/NxtCommit/actions/runs/34668873422)、[push run](https://github.com/brianchou452/NxtCommit/actions/runs/34668871294)）後，[PR #1](https://github.com/brianchou452/NxtCommit/pull/1) 合併為 c21dbf5d14d8ea6eeef6e86f54067a5bc9f50a06。

[部署 run 34668938513](https://github.com/brianchou452/NxtCommit/actions/runs/34668938513) 通過 CI、憑證存在檢查與 account/zone/DNS/custom-domain preflight。Worker 上傳在 Workers Scripts API 遭拒，回傳 authentication error 10000。HTTPS 驗證正確跳過，失敗證據已上傳。不宣稱部署成功、取得 version ID、綁定網域或產品上線。

已確認使用的 token 與使用者 Cloudflare 畫面顯示者一致。已準備專用 NxtCommit GitHub Actions token 摘要：只對所屬帳戶提供 Workers Scripts:Edit，只對 ianjuan.com 提供 Zone:Read 與 DNS:Read。官方 Worker 上傳與自訂網域 API 均要求 Workers Scripts Write。目前等待使用者按下建立；代理未產生新 token。這會授予部署權限，因此電腦操作工具的憑證交接規則要求使用者完成最後提交。建立後須更新 GitHub 既有 secret、重跑失敗部署，再驗證線上 SHA/run 收據。

本機已 fast-forward 至合併後 main。此次僅補 checkpoint 的後續提交使用 [skip ci]，避免記錄權限錯誤時再產生相同失敗；沒有修改 runtime 或 workflow。

## CP-010 — 新 token 與產品程式碼／2026-09-12 03:15 UTC

使用者建立專用 token 並授權部署；GitHub 已確認更新既有 secret。[第 2 次嘗試](https://github.com/brianchou452/NxtCommit/actions/runs/34668938513/attempts/2) 成功上傳 Worker，但 Wrangler 列出 zone Workers Routes 時回傳 10000。已證明 Workers Scripts 寫入有效；網域綁定與 HTTPS 仍未完成。Wrangler 的衝突檢查另需 Workers Routes:Read。紀錄不含憑證內容。

使用者要求部署新推送程式。確認 main d376137 使用 React/Vite、Express、Node 24 與同步 node:sqlite。Workers 的 node:sqlite 只有無功能 stub，不能直接執行此後端。在不重設資料庫介面的前提下，需要 Cloudflare Containers 或既有 Node 主機；已詢問使用者執行環境。Containers 的本機磁碟是暫存資料。

Node 24.19.0 已依官方 SHA256 驗證；鎖定依賴安裝回報零弱點。本機型別檢查與正式 build 通過，server 測試為 14 通過、77 TODO、零失敗。本機 Docker 因公司組織登入政策拒絕 build。新增 GitHub hosted 產品 CI job，包含鎖定安裝、型別、server 測試、build、版本檢查與 Docker foundation 瀏覽器流程；尚待發布取得 run。執行環境接入前保留產品部署 guard。

驗證補記：[GitHub CI 34669746467](https://github.com/brianchou452/NxtCommit/actions/runs/34669746467) 在 feb0a21 的 contracts-and-delivery 與 application-foundation 均通過，包含 Docker foundation 瀏覽器流程。本機正式啟動的 /、/healthz、/readyz、/api/bootstrap 均回傳 200，db=true、execution.resolved=null；/api/missions 依骨架現況回傳 404。這是本機與 CI 證據，並非公開部署完成。

## CP-011 — 付費容器、監測與截止／2026-09-12 03:35 UTC

使用者授權 Workers Paid 與資源監測。已啟用 US$5／月加用量方案，畫面確認 Paid 為 Current plan。設定非 root Node 24 image、單一 basic 容器（¼ vCPU、1 GiB RAM、4 GB 暫存磁碟）與同一 SQLite 實例。使用者後續指定閒置兩小時休眠、台灣時間 2026-09-13 01:00（UTC 2026-09-12 17:00）關閉。已新增入口截止、Node 定時退出、截止後刪除容器及重試 workflow，以及 Codex 一次性後續任務（automation ID nxtcommit）。取消續訂尚待確認。

每半小時監測 HTTP／SQLite 與 Cloudflare 資源用量。費用為估算而非帳單，缺少數據不是零用量。截止後部署與探測停止。使用者提供另一顆專用 Cloudflare token，正存入 GitHub Secrets，不進 source。實際容器上線仍待驗證。

已新增本機與雲端共用的伺服器端 OpenAI Responses client、安全錯誤、output／timeout 限制、provenance、環境範本及連線檢查腳本。本機型別與 build 通過，17 測試通過、77 TODO。活動短碼不是 API key，真實連線仍需有效 key。部署接入不代表 Phase 2 runner 或 authoring routes 已完成。

CP-011 build 修正：GitHub CI 34670771366 找出 production Docker build 未複製 ApplicationShell 引用的 spec/assets。已加入品牌素材至 build stage，final image 僅保留 bundle。這是打包錯誤，產品測試獨立通過；source image registry 更新為 0.7.12。

## CP-012 — 容器建立、啟動修復與訂閱決定 / 2026-09-12 04:10 UTC

0d4b9a1 的 CI 34670900558 通過。部署 run 34670900648 建立並推送 image sha256:ff6d414aabebc6355e01c7d8201940f5f23febf8d0d2d1525743c2c329baaca7、建立 application a03eb9ab-e1c7-4f5b-a61d-585856b9e28d 並綁定 hackathon.ianjuan.com；Worker version 為 df9cf4a8-4cc9-4909-a357-821c612624d6。但 smoke gate 收到 HTTP 403；之後本機 HTTPS 探測收到 HTTP 500，指出缺少 ContainerProxy 匯出，已補上 SDK 匯出。公開服務成功啟動仍待驗證。

使用者明確要求撤銷取消續訂；Cloudflare Billing 已顯示 Workers Paid Active，2026/10/12 續訂。截止自動化已改為保留此訂閱。台灣時間 9/13 01:00 關閉作品仍有效，停止的是容器用量，並非訂閱月費。本機正式啟動入口的五個 endpoint 都通過；100 次請求、20 並行的 bootstrap 探測測得 p95 2.02 ms、RSS 77.59 MiB。這些是本機結果，不是 Cloudflare 容量證據。

CP-012 追加 / 04:15 UTC：補上 proxy 匯出後成功啟動，HTTPS /__deployment 回傳 200，版本精確符合 022bf985585be9a4996d625907149851cf5ec4a9 與 run 34672260466。Python 預設 User-Agent 另被 Cloudflare 以 1010/403 拒絕；使用明確的 NxtCommit 服務 User-Agent 後回傳 200，沒有修改防火牆規則，已納入部署驗證。每 30 分鐘的應用程式探測會阻止閒置兩小時休眠，因此改為只讀 Container getState RPC。定時監測驗證 gateway／生命週期與 analytics，資料庫 readiness 仍於部署時檢查。

## CP-013 — 正式發布與線上監測驗證 / 2026-09-12 04:19 UTC

https://hackathon.ianjuan.com 已提供版本 186fea4640545716698a88143c0219e1e9e9eb52。[CI 34672509416](https://github.com/brianchou452/NxtCommit/actions/runs/34672509416) 與[部署 34672509651](https://github.com/brianchou452/NxtCommit/actions/runs/34672509651) 全部通過，涵蓋容器建置、foundation 瀏覽器流程、公開首頁／bootstrap／health／SQLite 驗證。線上 Node /__deployment 收據精確符合此 SHA 與 deployment run。歷史失敗 run 保留為問題修復證據，不刪除或改標成功。

[監測 34672602388](https://github.com/brianchou452/NxtCommit/actions/runs/34672602388) 通過且無告警。Cloudflare 回傳此應用尖峰記憶體 136835072 bytes（約 130.50 MiB）、CPU p95 0.27944（約 27.94%）；依目前實測負載維持 basic／1 GiB／最多 1 台。採樣時最近 24 小時已收錄的容器毛額估算為 US$0.0005，僅反映目前短暫執行，不含月費與其他產品費用，不是整天預測或帳單。定時生命週期 RPC 不會重設閒置時間。兩小時休眠設定已測試並部署，但尚未經過完整兩小時閒置觀察。

Workers Paid 為 Active，依使用者最新要求保留續訂。Runtime 截止、受時間保護的刪除 workflow 與一次性 Codex 驗證仍設定於台灣時間 9/13 01:00；未來關閉尚未發生。OpenAI 本機／雲端共用設定與限制呼叫的 client 已提交，但尚無有效 API key，不宣稱 provider 呼叫成功或 AI 產品功能完成。隊友 dev/computer-c checkout 的未提交工作保持不動。

Cloudflare Worker version: `213a4d22-7a4f-46cc-9e71-da680361ec60`; image digest: `sha256:7ddfb5661277cb7c3e8a03963922a49e4a789c75d47801801511a8afd3f2a977`.

## CP-014 — OpenAI 憑證與本機驗證 / 2026-09-12

確認 Personal Organization 已套用 US$100 promotion，未重複兌換。使用者建立限 Responses Write 的 key 並提供；已存入隊友 checkout 與 delivery worktree 的 Git 忽略 .env（權限 0600），以及 Cloudflare OPENAI_API_KEY secret。本機固定 prompt 驗證成功，模型 gpt-5-mini-2025-08-07，input 11、output 64、total 75 tokens，2836 ms，無 fallback。不記錄憑證值。新增需獨立驗證身分且快取結果的容器固定 prompt 檢查，以驗證真正雲端 runtime；雲端結果仍待確認。此項未實作產品文案 route 或 execution runner。

CP-014 雲端修正：容器檢查已進入編譯後 client，但回傳不含敏感內容的 openai_transport_failed。Cloudflare 預設 interceptHttps=false，在全面禁止外網時 HTTP allowlist 不會開啟 HTTPS。已加入限定 HTTPS interception、api.openai.com handler，並以 NODE_EXTRA_CA_CERTS 信任 Cloudflare runtime CA，保留 TLS 驗證與 allowlist。容器配置耗時數分鐘，另延長收據重試窗口；雲端成功仍待驗證。

## CP-015 — 本機與雲端 OpenAI 均驗證成功 / 2026-09-12 04:43 UTC

19ed0793e6f5466eaa36aed707af590cdc409a72 的 [CI 34673517417](https://github.com/brianchou452/NxtCommit/actions/runs/34673517417) 與[部署 34673517601](https://github.com/brianchou452/NxtCommit/actions/runs/34673517601) 全部通過。線上容器經身分驗證的 OpenAI 檢查成功，模型 gpt-5-mini-2025-08-07，2677 ms，input 11 + output 63 = total 74 tokens，fallback=false。加上先前本機 75 tokens 成功紀錄，兩個 runtime 已使用同一 key 取得真正 provider 呼叫證據。未授權雲端探測回傳 404；重複授權探測回傳相同 response ID，確認沒有第二次 provider 呼叫。金鑰與 prompt 不進公開前端或 checkpoint。API 存取已接通，產品文案／runner 實作仍屬隊友的應用程式工作。

## CP-016 — OpenAI 額度用量告警 / 2026-09-12

使用者要求 API 額度快用完時通知。Personal Organization 月用量參考值由 US$120 改為 US$100，強制上限維持 OFF。已儲存並重新載入確認 provider 原生 Email 告警：80%（US$80）、90%（US$90）、95%（US$95），明確寄至 ianjuantw@gmail.com；原本 100% owner 告警保留。重新載入後門檻與收件人均存在。此監測涵蓋組織整個日曆月用量，包括本機與 Cloudflare 呼叫；不是即時精確的 promotion 餘額告警，也不會停止 API。Dashboard 目前四捨五入顯示 US$0.00，不表示完全沒有用量。實際寄信須等跨越門檻，未為測試告警而刻意消耗額度。
