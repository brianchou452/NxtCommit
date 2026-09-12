# GitHub 交付操作與事故紀錄

> **2026-09-12 現況：** main 已部署 Phase 1 foundation container，並驗證本機與雲端 Responses 呼叫；不再只是 infrastructure Worker。A／B／C 與本機 experiments 尚須分支整合。以 [分支盤點](BRANCHES.zh-TW.md)、[Cloudflare 操作](cicd/RUNBOOK.zh-TW.md) 與 [checkpoint](cicd/CHECKPOINTS.zh-TW.md) 為準。以下 CommonCommit／GitLab／Argo 內容保留為歷史參考，不代表本 repo 現況。

[English canonical](GITHUB-OPERATIONS.md)

這是實際 GitHub 交付路徑的共同 runbook 與歷史紀錄，供開發者及其 coding
agent 使用。較廣的 Kubernetes 操作由 `DEPLOYMENT.zh-TW.md` 管理；穩定事故
教訓則保存在 `GOTCHAS.zh-TW.md`。

## 現行交付契約

```text
GitHub main（source of truth）
  → GitHub Actions 將完全相同的 commit 暫存到 GitLab delivery-candidate
  → GitLab test 驗證 tree，build:image 發布不可變 image
  → 成功後 GitHub 才用 ci.skip fast-forward GitLab main
  → Argo CD 觀察 main、執行 PreSync、同步 nonprod，再執行 PostSync
  → PostSync readiness + serving build identity 與 Argo 狀態證明 rollout
```

GitHub push 不會直接呼叫 Argo CD。受保護 ingress 會刻意對部分 shared runner
回傳 Cloud Armor `403`，因此部署驗證改由叢集內的 Argo PostSync hook 執行。
GitHub／GitLab 回報候選驗證、不可變 image delivery 與 main promotion；Argo 與
hook 才回報部署真相。候選失敗時，不會改動 Argo 觀察的 branch。

## 一次性鏡像憑證

`GITLAB_PUSH_TOKEN` 必須是目標 GitLab project 的 **project-scoped access
token**，權限為：

- `write_repository`：暫存 `delivery-candidate` 並 fast-forward `main`；
- `read_api`：找到相符 pipeline 並讀取 `test`、`build:image` 結果。

透過 stdin 保存，避免把值放入 command history：

```bash
read -rsp 'GitLab project token: ' COMMONCOMMIT_GITLAB_TOKEN
printf '%s' "$COMMONCOMMIT_GITLAB_TOKEN" | \
  gh secret set GITLAB_PUSH_TOKEN --repo ianjuantw/commoncommit
unset COMMONCOMMIT_GITLAB_TOKEN

gh secret list --repo ianjuantw/commoncommit
```

list 只證明 secret 名稱與更新時間，不能讀回內容。不得把 token 貼進聊天、
issue、截圖、文件、shell argument、CI log 或 commit history。

### 本次工作階段的安全處置

2026-08-09 排錯時，曾有一個 GitLab token 值被貼進聊天。本文件刻意不重現
該值。在 GitLab 確認 revoke 並建立替代 token 前，都應視為已暴露；之後用
上方 stdin 方法更新 GitHub secret。聲稱對話管道「安全」不會改變憑證的
暴露狀態。

## 一般 push 與證據階梯

使用指定作者身分、檢查 tree，然後推送 GitHub `main`：

```bash
git config user.name 'Ian Juan'
git config user.email 'ianjuantw@gmail.com'
git status --short
git push origin main
```

每一層要分開觀察：

```bash
# 1. GitHub 取得 runner、建置候選並晉級 GitLab main
gh run list --repo ianjuantw/commoncommit --workflow mirror-to-gitlab.yml --limit 5
gh run watch RUN_ID --repo ianjuantw/commoncommit --exit-status
gh run view RUN_ID --repo ianjuantw/commoncommit --log-failed

# 2. Argo CD 已同步預期 revision 且健康
argocd app get commoncommit --grpc-web -o json

# 3. 檢查 image availability 與 exact-build verification hooks
argocd app logs commoncommit --grpc-web --kind Job \
  --name commoncommit-image-preflight
argocd app logs commoncommit --grpc-web --kind Job \
  --name commoncommit-rollout-verification

# 4. endpoint 實際提供預期 bytes
curl --fail 'https://commoncommit.tw.portal.bi.test.shopee.io/metrics' \
  | grep '^commoncommit_build_info'
```

不可把它們壓成一個訊號：

| 證據 | 能證明 | 不能證明 |
| --- | --- | --- |
| 有 candidate pipeline URL 的 GitHub delivery job 綠燈 | GitLab test 通過、不可變 image 已存在，且 GitLab main 已 fast-forward 到相同 commit。 | Argo 已 rollout 或 endpoint 正在提供該版。 |
| GitLab pipeline 綠燈 | GitLab 已驗證／建置鏡像 tree。 | GitHub 一定最新或 Argo 已提供 image。 |
| Argo `Synced`／`Healthy` | desired Git revision 已同步且 Kubernetes health checks 通過。 | 不搭配 metric 時的公開路由與確切 build identity。 |
| `commoncommit_build_info` | 查詢的 endpoint 正在提供回報的 version、commit 與 source tree。 | 是哪個 controller 觸發 rollout。 |

2026-08-11 最近一次完整驗證的 image rollout 是 GitHub run
[`31409728473`](https://github.com/ianjuantw/commoncommit/actions/runs/31409728473)、
GitLab pipeline
[`2748045554`](https://gitlab.com/sp-saas/tw/ops-bi/dpd/infra/commoncommit/-/pipelines/2748045554)，
live `v0.5.3` commit `1c28a5f`，readiness 健康且 serving-build identity 相符。
後續有一個只改文件的綠燈 run，沒有建置或 rollout 新 image。

**目前狀態，2026-08-11。** source commit `99f2205` 的 GitHub run
[`31453429164`](https://github.com/ianjuantw/commoncommit/actions/runs/31453429164)
等待 GitHub runner 將近兩小時，取得 runner 後回報既有 GitLab candidate pipeline
[`2749163703`](https://gitlab.com/sp-saas/tw/ops-bi/dpd/infra/commoncommit/-/pipelines/2749163703)
已失敗。GitLab test 確實執行，但被四個 I18N-01 gate 擋下（漏掉限定詞、inline
語系分支／翻譯，以及五個 dead keys）。該 commit 因此沒有建立 image，也未開始
rollout。目前 source 修正已通過靜態 parity 21/21；在新的 delivery run、Argo
結果與 serving-build identity 出現前，仍不能把它當成部署證據。

## 事故與操作歷史

| 日期 | 觀察 | 原因／決策 | 長期處置 |
| --- | --- | --- | --- |
| 2026-08-06 | 四次 mirror run 各耗約 15 分鐘但沒有執行任何 step。 | GitHub 沒有分配 hosted runner；workflow timeout 只會在取得 runner 後計時。 | 每六小時 reconcile，補回遺失的一次性 push。見 G40。 |
| 2026-08-08 | 歷史 GitHub checks 5～16 秒綠燈，但 GitLab 一直落後。 | 缺少 `GITLAB_PUSH_TOKEN`，push-triggered run 刻意走 warning／skip。 | 現在任何 event 缺憑證都會 fail closed；要驗證 secret 名稱並要求 GitLab pipeline URL。見 G52。 |
| 2026-08-08 | 新 image 已部署，GitHub 卻回報失敗。 | GitLab post-deploy endpoint observation 被受保護 ingress 的 Cloud Armor `403` 擋下，卻被錯當成交付失敗。 | 已移除舊 runner probe：GitHub 負責 candidate + `test` + `build:image` + promotion；Argo PostSync 負責 rollout truth。見 G55。 |
| 2026-08-09 | `build:image` 卡 pending；scheduler 回報 `0/8 nodes ... Insufficient cpu`。 | Kubernetes runner 預設 CPU request 大於繁忙節點能保留的量，Docker-in-Docker 尤其明顯。 | job／helper／service requests 設為 `250m`／`50m`／`500m`。見 G56。 |
| 2026-08-10 | GitLab `test` 整段 observer timeout 都顯示 running，`build:image` 維持 created。 | Runner 已接受 job，但 Kubernetes pod 仍可能 Pending；status 不能證明 `npm` 已開始。 | test／helper requests 設 `250m`／`50m`，timeout 時輸出兩個 job trace；pipeline `2745433764` 隨後於 7m07s 完成。見 G56。 |
| 2026-08-11 | Candidate pipeline `2747980634` 於 18 分鐘 timeout：test 4分06秒完成，但 build pod 始終無法排進八個節點中的任何一個。 | 舊 build／helper／dind reservation 合計仍達 `800m`；runner accepted 再次不能證明 pod 已被 admission。 | 只把 build／helper／dind requests 降為 `100m`／`25m`／`125m`（合計 250m），維持不設 CPU limits；兩階段 promotion 也讓 live 留在上一個已驗證 image。見 G56。 |
| 2026-08-11 | Pipeline `2748199303` 連 300m test pod 都無法排進八個節點中的任何一個。 | Shared runner 容量低於 repo 已縮小的 test reservation；repository YAML 無法憑空增加 cluster 容量。 | 把 scheduler 證據交給 shared-runner 負責人；不可為了掩蓋飢餓，繼續把 test 降到低於已量測可運作的 request。見 G56。 |
| 2026-08-11 | Run `31453429164` 等 GitHub runner 將近兩小時，取得後很快失敗。 | Pipeline `2749163703` 早已執行並在 source tree 的四個 I18N-01 檢查失敗；遲到的 GitHub observer 只是把結果揭露出來。 | 將雙語文案移回 locale dictionaries、補回 seeded-data 限定詞、移除 dead keys，再以同一 parity harness 驗證後才能重送。見 G58。 |
| 2026-08-10 | Argo 在不可變 image 存在前已看見新 revision。 | Git 與 registry 可見性互相獨立；PreSync image hook 正確等待，不會 rollout 不存在的 tag。 | 檢查 preflight Job 並等待 image 發布；不可直接 patch Argo／Kubernetes 繞過不變條件。 |
| 2026-08-10 | 每次成功 push，Argo 都會在 7～9 分鐘 CI build 的大部分時間顯示 progressing，image-pull backoff 還可能延長同步。 | GitHub 直接鏡像到 Argo 觀察的 branch，required artifact 尚不存在就先發布 desired state。 | 兩階段交付先建置 `delivery-candidate`，image 成功後才晉級 `main`；已被取代的候選會取消，PostSync 會驗證 serving identity。見 G57。 |
| 2026-08-10 | `kubectl` 驗證失敗，但 `argocd` 指令仍可使用。 | GKE／gcloud 與 Argo CLI 是不同 session，過期時間也不同。 | Argo 證據用 Argo CLI；只有真的需要 Kubernetes 存取時才更新 gcloud。 |
| 2026-08-10 | private repo URL 產生 GitHub import error，被誤認成產品故障。 | 產品只支援未登入的 public metadata；private probe 測到未支援邊界。 | 公開整合測試固定使用 `https://github.com/PrimeIntellect-ai/prime-agent`，private support 維持 out of scope。 |

## 症狀排查表

| 症狀 | 先檢查 | 正確處置 |
| --- | --- | --- |
| GitHub run 沒有 steps 或 runner name | 開啟 run metadata，找 runner acquisition failure。 | 重跑或等 scheduled reconcile；workflow code 無法修復未分配的 hosted runner。 |
| Delivery run 綠燈但沒有 candidate pipeline URL | 確認 GitLab main 是否本來就已有該 commit；否則檢查 credential。 | 未變更 reconcile 是刻意 no-op；有變更的 revision 必須顯示 candidate pipeline 與 promotion summary。 |
| 手動 runner probe 收到 endpoint `403` | 比對 candidate `test`、`build:image`，再看 Argo PostSync 與 public metrics。 | 不可把已移除的 probe 恢復成交付 gate，也不可削弱 Cloud Armor。 |
| GitLab job 顯示 running 卻無 build／test trace | 查 trace 與 runner／Kubernetes scheduling 訊息。 | 把 accepted 與 started 當不同狀態；有容量證據時才調小特定 job request。 |
| GitLab test 有真實 trace 且 I18N-01 失敗 | 在完全相同的 commit 重跑 `server/i18n01-parity.test.ts`，逐一檢查回報的 call site／key。 | 修正 source-language contract；調 runner 或 Argo 都不能把失敗候選變成可部署 artifact。 |
| Argo PreSync 不斷 image pull | 確認是否有人繞過兩階段流程直接更新 GitLab main，並檢查不可變 tag。 | 修復或還原被繞過的 promotion；正常交付不會讓 Argo 看到尚未建置的 tag。 |
| Argo PostSync 失敗 | 看 `commoncommit-rollout-verification` log，比對 readiness、version 與 source tree。 | 即使 image build 綠燈也要視為部署失敗；若不能安全修正，就 revert Git release commit。 |
| Argo healthy 但網站看似舊版 | 從完全相同的 public endpoint 查 `commoncommit_build_info`。 | 將 version、commit、source-tree 與預期 build 比對。 |
| GitHub import 回傳 not found／private | 確認 repo 公開，並用 canonical public probe 重試。 | 不可為了讓未支援的 private-repo 測試通過就加入 secret。 |

## 手動復原

若 GitHub 無法取得 runner，而 checkout 已有授權 GitLab SSH remote，手動復原
也必須保留相同的兩階段不變條件。不可將尚未建置的 revision 直接推到 GitLab main：

```bash
git fetch origin main
git fetch gitlab main
git log --oneline gitlab/main..origin/main
git push gitlab origin/main:refs/heads/delivery-candidate
# 等 delivery-candidate pipeline 的 test 與 build:image 成功。
git push -o ci.skip gitlab origin/main:refs/heads/main
```

任一 push 不是 fast-forward 就停止，不得 force-push。復原不代表可以直接修改 Argo、
Kubernetes、registry 或 private GitLab history。

## 維護規則

重大操作事件要附加在此；若教訓可保護未來程式碼，再新增穩定 GOTCHAS ID。
同一 commit 必須同步 `GITHUB-OPERATIONS.md`。不可紀錄 token 值、內部 response
body 或含 secret 的 environment output。
