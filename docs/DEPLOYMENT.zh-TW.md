# 部署與維運

> **2026-09-12 LangGraph / Langfuse 更新：** 本機 agents 已使用持久化階段流程與 metadata-only 監控；續跑、防重播、操作指令及限制請見 [Agent 操作手冊](AGENT-OPERATIONS.zh-TW.md)。既有 Demo 鎖與網站版本維持獨立。

[English](DEPLOYMENT.md)

本文件是隨附之非正式環境 Kubernetes 設定的操作手冊。提交進儲存庫的 `Makefile`、Kustomize overlay 與 `deploy/` 範本包含環境專用值。在其他專案或叢集使用此儲存庫前，請先檢視這些內容；不要將內部拓撲複製到公開文件。

此儲存庫沒有正式環境目標。

每個環境應選擇一種管理方式：

| 管理方 | 適用情況 | 持久變更方式 |
| --- | --- | --- |
| 手動 `make deploy-nonprod` | 沒有 GitOps 控制器管理此工作負載 | 直接透過 Kubernetes 套用並驗證 |
| ArgoCD | 已安裝的 Application 會對齊 overlay | 變更 Git；避免直接修正，否則 self-heal 會將其取代 |

## 維運警告

- SQLite 與執行工作區儲存在 `emptyDir`。每次 pod 更換、rollout、驅逐或節點遺失，都會捨棄應用程式狀態。
- 伺服器將執行中的控制器保存在行程記憶體內，且只支援一個副本。因此 Deployment 使用 `Recreate`：rollout 會有短暫中斷，但不會同時執行兩個可各自寫入的資料庫，也不會讓新 SPA 混用舊 API。
- 目前的沙箱無法安全執行任意第三方儲存庫。請將執行範圍限制於內建 fixture。
- 應用程式沒有使用者驗證或授權。請將網路存取限制於受信任的非正式環境使用者。
- `deploy/` 中的 GitOps 資源是範本。這些檔案存在，不代表它們已安裝到周邊的平台儲存庫。

## 發布不變條件

可部署映像的版本必須在三處一致：

1. `Makefile` 中的 `VERSION`；
2. `k8s/overlays/nonprod/kustomization.yaml` 中的 `newTag`；
3. `docs/CHANGELOG.md` 中第一個已發布的 `## v...` 項目。

在任何建置或部署前進行驗證：

```bash
npm ci
npm run check
make check-version
git status --short
```

`make build` 會拒絕與映像相關且尚未 commit 的檔案，因為它的來源標籤描述的是 `HEAD`。`make build-dirty` 只供本機迭代使用；絕不可推送或部署該映像。

## 先決條件

隨附的目標預期具備：

- Docker，且可存取設定的映像 registry；
- Google Cloud CLI，以及設定之非正式環境叢集的 Kubernetes 憑證；
- `kubectl`、Kustomize 支援與 `make`；
- 建立 namespace、secret、工作負載與 registry 資源的權限；
- 部署所設定的 `llm` 模式時，具備伺服器端 OpenAI 與 Langfuse 憑證。

請從 `Makefile` 與 overlay 讀取實際目標值，不要在另一份文件重複寫入。

工作站與 registry 的一次性設定：

```bash
gcloud auth login
make credentials
COMMONCOMMIT_IMAGE_REPO=$(awk '$1 == "IMAGE_REPO" { print $3 }' Makefile)
COMMONCOMMIT_REGISTRY_HOST=${COMMONCOMMIT_IMAGE_REPO%%/*}
gcloud auth configure-docker "$COMMONCOMMIT_REGISTRY_HOST"
make registry  # 僅在設定的儲存庫尚不存在時執行
```

推導出的 registry 主機只用於 Docker 驗證；Make 目標仍會使用其 `IMAGE_REPO`、`PROJECT` 與 `REGION` 值。移植 manifest 時，請一併變更或覆寫這些值。上述命令會改變遠端雲端狀態，因此請先確認選定的帳戶、專案、叢集與 registry。

## 第一次部署

執行 secret 腳本前，namespace 必須已存在。

```bash
COMMONCOMMIT_KUBE_CONTEXT=your-kube-context
kubectl --context "$COMMONCOMMIT_KUBE_CONTEXT" apply -f k8s/base/00-namespace.yaml
make secrets CONTEXT="$COMMONCOMMIT_KUBE_CONTEXT"
make build
make push
make deploy-nonprod CONTEXT="$COMMONCOMMIT_KUBE_CONTEXT"
```

`make secrets` 會從行程環境或本機已忽略的 `.env` 讀取 `OPENAI_API_KEY`、`LANGFUSE_PUBLIC_KEY` 與 `LANGFUSE_SECRET_KEY`。目前的輔助工具會將 `.env` 當作 shell 程式碼載入，並透過 `kubectl --from-literal` 傳遞每個值；它不會輸出這些值，但命令執行期間，本機行程檢查仍可能看見它們。請只在受信任的工作站使用由自己撰寫且可信的 `.env`。以 stdin 或 secret manager 取代此路徑，仍屬待完成的安全強化工作。

不要直接在命令中輸入憑證，也不要將其放進已提交的 manifest、CI 日誌、文件或聊天紀錄。

## 例行手動部署

只有在環境未由 ArgoCD 主動對齊時，才使用此路徑：

```bash
COMMONCOMMIT_KUBE_CONTEXT=your-kube-context
npm run check
make check-version
make build
make push
make deploy-nonprod CONTEXT="$COMMONCOMMIT_KUBE_CONTEXT"
```

此目標會套用非正式環境 overlay、選擇相符映像，並等待 rollout 狀態。工作負載使用 `Recreate`，因此舊 pod 結束至新 pod ready 之間，非正式環境會短暫中斷。rollout 成功仍不夠；接著必須驗證實際執行中的建置身分。

## GitOps 部署

此儲存庫包含供外部 GitOps 儲存庫使用的範本：

- `deploy/bi-portal-tools/application-commoncommit.yaml`，用於 ArgoCD 註冊；
- `virtualservice-commoncommit.yaml`，用於 ingress；
- `commoncommit-monitoring.yaml`，用於抓取與告警；
- `commoncommit-dashboard-configmap.yaml`，用於 Grafana。

請依該私人平台儲存庫的審查程序安裝。在宣稱此路徑可供維運前，請驗證以下所有項目：

1. ArgoCD 可讀取鏡像儲存庫，且 Application 確實存在。
2. Application 追蹤預期分支及 `k8s/overlays/nonprod` 路徑。
3. Ingress、監控與儀表板資源已在其上層 Kustomization 註冊。
4. 公開路由支援長時間存續的 SSE 連線。
5. 即時建置身分符合實際建置的 commit 與來源樹。

啟用 ArgoCD `selfHeal` 時，不要使用直接的 `kubectl` 變更作為持久 rollback 或修正；控制器會恢復 Git 狀態。

## CI/CD 行為

預期流程為：

```text
GitHub main
  → GitHub Actions 將 commit 暫存到 GitLab delivery-candidate
  → GitLab 驗證並建置不可變 image，不改變 desired state
  → image 成功後 GitHub 才 fast-forward GitLab main（略過重複 CI）
  → Argo CD 觀察 main，執行 PreSync + rollout + 叢集內 PostSync
  → 平台監控獨立觀察實際 serving state
```

**各環節的量測現況，2026-08-11。** 交付機制已有歷史端到端證據。Pipeline
`2749163703` 在 image 發布前被四個 I18N-01 gate 擋下，兩階段契約也正確地沒有
晉級。目前 source 修正已通過靜態 parity 21/21，但本機結果不能預告部署；仍須
取得新的 pipeline、不可變 image、Argo 結果與 serving identity。帶日期的 run ID
與事故歷史請見
[GitHub 交付操作](GITHUB-OPERATIONS.zh-TW.md)。

| 環節 | 量測到的狀態 | 如何確認 |
| --- | --- | --- |
| 候選交付 | **Fail closed 且運作中。** GitHub 先暫存 `delivery-candidate`，要求相符 `test`、`build:image`，成功後才晉級；目前失敗候選沒有改變 desired state | delivery run 會列 candidate pipeline URL，只有成功才列 promoted commit |
| GitLab 驗證與建置 | `99f2205` 的 I18N-01 21 項失敗 4 項；目前 source fix 已 21/21，等待遠端證據 | 必須取得相符綠燈 pipeline、registry tag 與 source-tree label |
| GitOps 推出 | 歷史 Application 與自動 reconcile 設定仍在；不可由本機通過推論新 revision 已上線 | 以 `argocd app get commoncommit` 加上預期 revision 驗證 |
| Rollout 驗證 | 晉級後仍由 PostSync 擔任叢集內 exact-build 權威檢查 | 必須同時取得 PostSync 成功、Argo Healthy／Synced 與外部 build metric |

### 交付時間預算與失敗邊界

| 區段 | 健康目標 | 硬邊界 | 失敗影響 |
| --- | ---: | ---: | --- |
| 找到 candidate pipeline | 1 分鐘內 | 60 秒 | GitLab main 與 live state 不變 |
| Test + 不可變 image | 量測約 7～10 分鐘 | 18 分鐘 | candidate 失敗，不啟動 Argo rollout |
| Argo 發現 + Recreate rollout | 4 分鐘內 | 平台 reconcile 加 hook deadline | 由 Argo 回報 degraded／failed，不讓 CI 隔著 Cloud Armor 猜測 |
| 叢集內 exact-build verification | 數秒 | 240 秒 | PostSync 失敗，不能宣稱部署健康 |

同一時間只交付最新版本：新的 GitHub main commit 會取消已被取代的 observer，
GitLab interruptible candidate jobs 也會取消。若 GitLab main 已與 GitHub 相同，
scheduled reconcile 會快速 no-op。目前單副本 `Recreate` 仍有短暫中斷；在 SQLite
與記憶體內 execution ownership 搬到共享外部服務前，零停機 rollout 仍不安全。

### 工作流程跑不了時的手動鏡像

`origin` 旁邊已經設定了一個 `gitlab` SSH remote，所以鏡像可以直接從 checkout 做掉，不需要工作流程、也不需要碰推送權杖：

```bash
git push gitlab origin/main:refs/heads/delivery-candidate
# 等 delivery-candidate 上的 test 與 build:image 成功。
git push -o ci.skip gitlab origin/main:refs/heads/main
```

這是 GitHub 端 runner 故障時的復原路徑，也是這次補掉那 22 個 commit 落差的方式。它是不帶 `--force` 的 fast-forward 推送，所以 GitLab 分支若有分岔會被擋下而不是被覆蓋——先看 `git log gitlab/main..origin/main`。

重要區別：

- 缺少 token 或 token 沒有 `read_api` 時，交付會失敗；無法觀測的 candidate 絕不晉級。只有 GitLab main 已與 GitHub 相同時，scheduled run 才會 no-op。
- 鏡像每次推送只有一次機會，而那次機會不總是我們自己弄丟的：2026-08-06 有連續四次執行以「The job was not acquired by Runner of type hosted」失敗，那是 GitHub 端的配發失敗，沒有執行任何步驟，每次燒掉 15 分鐘。對帳就是復原路徑；它會在真的需要補上進度時加註。
- GitLab runner 不觸發也不判定 rollout；已安裝的 Application 會自動協調，PostSync hook 會從允許的網路邊界內驗證。不得為了 CI 削弱 Cloud Armor。
- 驗證會觀察正在提供服務的版本與來源樹指標。它本身無法證明是哪個控制器執行 rollout。
- 映像標籤視為不可變。與映像相關的原始碼變更時，請提升版本，不要覆寫既有標籤。

## 驗證

設定環境專用的服務 URL，但不要將其提交：

```bash
COMMONCOMMIT_URL=http://your-nonprod-host.example.com

curl --fail "$COMMONCOMMIT_URL/healthz"
curl --fail "$COMMONCOMMIT_URL/readyz"
curl --fail "$COMMONCOMMIT_URL/metrics" | grep '^commoncommit_build_info'
curl --fail "$COMMONCOMMIT_URL/api/bootstrap"
```

確認：

- `/readyz` 回傳 HTTP 200，且包含 `status: "ok"` 與 `db: true`；
- `executionMode` 與環境 overlay 宣告的模式完全一致；
- `commoncommit_build_info` 回報預期的版本、commit 與來源樹；
- SPA、深層連結與兩個 SSE 端點皆可透過 ingress 運作；
- Prometheus 正在抓取服務，且啟用 Langfuse 時能收到 trace。

`/readyz` 回報的是憑證是否已設定，而不是新的模型請求能否成功。請使用 `make validate-llm` 進行即時且不洩漏密鑰的憑證檢查。

## 日誌與指標

```bash
make logs
```

以 `missionId`、`runId`、執行模式與 trace ID 關聯失敗。絕不要將可能包含密鑰的原始環境輸出複製到事件紀錄。

實用的服務檢查：

- 執行完成狀態與阻擋原因；
- 不可讀的測試輸出；
- LLM 延遲、token 與錯誤率；
- prompt injection 旗標與寫入拒絕；
- 行程重新啟動與可寫入 volume 失敗；
- 建置身分漂移。

針對從未增加過的 counter，Prometheus 運算式可能回傳空向量。零有意義時，告警規則必須明確處理資料不存在的情況。

## Rollback

請選擇符合部署管理方的 rollback 程序。

### 由 ArgoCD 管理的環境

還原或更新發布 commit，使 `Makefile`、overlay 標籤與變更日誌描述預期版本，接著讓 ArgoCD 對齊並重複即時驗證。不要依賴 `kubectl rollout undo`；self-healing 會以 Git revision 取代它。

### 手動管理的環境

當 ArgoCD 未管理工作負載時，可以執行緊急 rollout undo：

```bash
COMMONCOMMIT_KUBE_CONTEXT=your-kube-context
kubectl --context "$COMMONCOMMIT_KUBE_CONTEXT" \
  -n commoncommit rollout undo deploy/commoncommit
kubectl --context "$COMMONCOMMIT_KUBE_CONTEXT" \
  -n commoncommit rollout status deploy/commoncommit --timeout=180s
```

接著驗證實際建置身分。rollback 不會還原 rollout 期間遺失的 SQLite 資料。

## 疑難排解

| 症狀 | 檢查項目 |
| --- | --- |
| 建立 secret 時顯示找不到 namespace | 先套用 `k8s/base/00-namespace.yaml` |
| Pod 在 `/app/var` 下因 `EACCES` 失敗 | 保留 pod 的 `fsGroup: 1000` 與可寫入的 volume mount |
| `make build` 拒絕執行 | Commit 與映像相關的變更，或只在本機測試時使用 dirty build |
| `make check-version` 失敗 | 對齊 Makefile、overlay `newTag` 與變更日誌發布標題 |
| CI 完成建置，但即時版本始終不變 | 確認鏡像已送達、ArgoCD Application 已安裝、儲存庫存取與 sync 健康狀態 |
| 即時模式與 overlay 不同 | 檢查已部署的 ConfigMap、rollout revision 與伺服器端憑證 |
| SSE 在 ingress 處中斷 | 檢查已部署 VirtualService 的 timeout，不要假設範本已原封不動地安裝 |
| Rollout 後狀態消失 | 目前使用 `emptyDir`，這是預期行為；持久化儲存仍在路線圖中 |
