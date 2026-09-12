# commoncommit 專案目錄移植

[English](CATALOG-PORT.md)

既有 NxtCommit 的 Discover 與任務頁已納入本機 commoncommit 版本
`a52346519fa7258a56ec39f70212b243d599e833` 的全部 25 個 repo 專案及 25 個
募資任務。固定任務 ID 為 `catalog-{slug}`。來源快照保留雙語標題、摘要、故事、
驗收條件、里程碑、標籤、風險、repo 資料、歷史與社群留言。另一次獨立核對確認
repo 網址及每個敘事欄位與來源擷取一致，25/25 無遺漏。

專案：ms、node-csv、cosign、quick-lru、yaml、ky、marked、redis-mock、jose、
globset、localsend、pdfjs、tesseractjs、mermaid、scrcpy、immich、homeassistant、
excalidraw、whisperx、jellyfin、ollama、langgraph、deno、supabase、bun。

## 持久化與來源

`server/persistence/catalog.ts` 以單次追加式 SQLite 交易匯入，以
`commoncommit-catalog-v1` 標記完成。重複啟動不會重複資料，也不會取代現有錢包、
贊助、留言或個人頁。Discover 隱藏舊 Home 專用的重複卡片，但保留原路由與收據。
同專案名稱的真正 B 任務仍會顯示。贊助及帳本仍由既有 B 服務統一管理。

來源人物使用獨立的 `catalog-` 身分。只有總額、缺乏個人明細的來源贊助，建立一筆
明確命名的示範社群資金池，另外保留原稿支持者人數。node-csv 原稿總額 2300 已過時，
依來源實際贊助／帳本總和校正為 2900。YAML 與 ky 有原稿消耗總額但缺少消耗帳本，
因此在固定快照時間加入明確的快照紀錄，分別補上 610 與 980 點。收據只向當次消耗
發生前已有的贊助分攤，後來的新支持者不會承擔歷史消耗。

人氣、維護者、額度、里程碑、發布、採用率、執行歷史與修改稿均為來源示範內容。
保留公開 repo 連結，不代表重新向 GitHub 驗證。歷史執行與修改稿放在唯讀來源區，
不成為即時引擎證據。匯入 repo 的 workspace 為 `none`；可投入原型額度，但不會
執行 repo 或建立上游變更。新贊助可恢復停滯的目錄募資案，並透過既有服務出現在
My Commitment 收據中。

離線擷取器 `scripts/imports/commoncommit-catalog.mjs` 僅以記憶體儲存及固定時間
評估允許的來源模組，不聯絡 provider、不修改來源資料庫、不啟動來源執行流程。

## 設計檢查與驗證

保留既有任務版型、共用 token、翻譯字典、導覽及 main 最新其他分頁樣式。來源內容
新增 repo 資料、風險與可展開的歷史區；可見 demo 標籤說明數字與歷史的來源。
原 approved golden 不變，新增內容屬刻意差異，不宣稱與 golden 完全一致。
匯入的手機基準未涵蓋新目錄區塊，因此瀏覽器測試明確檢查 390 px 中文內容及橫向
溢位。`e2e/catalog.e2e.spec.ts` 保存桌機與手機截圖。

伺服器測試涵蓋全部 25 案、帳本一致、匯入案不可執行、重複升級、保留舊資料、
贊助、重送、重啟、重設及隔離歷史消耗。瀏覽器測試涵蓋探索至詳情、repo 連結、
雙語內容、贊助至 My Commitment 及手機版。即時更新回歸測試確認慢速訂閱者在
非同步關閉前已移除，不會讓後續事件造成伺服器錯誤。
正式部署採追加方式，不為安裝目錄而重設線上示範；部署前保存既有管理員備份，
部署後以 `/__deployment` 核對實際服務版本。

設計清單結果：已核對適用的 seed／頁面合約及來源 golden；首頁順序不變。新增區塊
沿用既有畫布、字型、間距及卡片，不新增語意色或圖解。Repo 圖解維持 main 現有
實作，本次內容移植不宣稱重新設計圖解。Demo 來源與執行限制保持可見。已檢視桌機
Mermaid 與 390 px 中文 LocalSend 截圖，新內容正常換行且頁面沒有橫向溢位。
目錄瀏覽器流程也使用 reduced motion，並以鍵盤開啟歷史內容。Mobile visual
baseline not covered（手機視覺基準未涵蓋）。132 份規格合約檢查零錯誤。

本版本機驗證：型別檢查與正式建置通過，171 項伺服器測試及 50 項 foundation／product
瀏覽器測試通過。匯入與回歸涵蓋於 `server/catalog.test.ts`、
`server/global-stream.test.ts`、`e2e/catalog.e2e.spec.ts`。部署與 HTTPS 實際版本另行核對。
