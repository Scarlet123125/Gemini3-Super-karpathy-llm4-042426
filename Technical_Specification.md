# 知識代理 (Knowledge Agent WOW v5.0) 升級版技術規格書

## 1. 產品概述與核心理念
本文件為「知識代理 WOW (Knowledge Agent WOW v5.0)」之完整技術規格書。系統旨在提供一個極致流暢（Sleek）、明亮（Light）且具備高度互動性（WOW Interactive）的智能網頁應用程式。該系統不僅傳承了原先所有優點（如支援 EPUB, PDF, DOCX, Facebook JSON 轉檔至 Obsidian Markdown 格式），更針對輸入介面、大語言模型（LLM）控制、視覺化報表及自動化技能（Skill）生成進行了革命性的升級。

### 1.1 設計目標
1. **極簡與奢華並重（Light & Sleek Style）**：全 Traditional Chinese（繁體中文）介面，提供專業、舒適的視覺體驗。
2. **零阻力資料注入（Frictionless Data Ingestion）**：整合拖曳、多檔案上傳、以及純文本 / Markdown 直接貼上區塊，解決使用者在多種資料夾來源切換的痛點。
3. **精準控制與安全性（Control & Safety）**：新增強制終止按鈕（Stop Button）、分頁修剪功能（Page Trimming），確保大語言模型在長時間運行時具備最高的使用者主控權。
4. **六大 WOW AI 視覺化重塑（6 WOW Visualizations）**：非僅純文字輸出，結合動態資訊圖表（Infographics）與表格，使 3000~4000 字的總結報告不僅內容豐富，視覺亦極具衝擊力。

---

## 2. 系統架構與模組設計

### 2.1 模組劃分
系統主要分為四大模組：
1. **「文檔樞紐」資料處理模組 (Document Hub & Preprocessing)**
2. **「大腦引擎」LLM 提示與模型控制模組 (Brain Engine & LLM Control)**
3. **「技能工坊」自動化技能生成與強化模組 (Skill Forge)**
4. **「戰情中心」視覺化與即時日誌儀表板 (War Room Dashboard)**

### 2.2 模組詳細規格

#### 2.2.1 「文檔樞紐」資料處理模組
*   **多源輸入支援**：
    *   **檔案上傳**：支援 PDF, TXT, Markdown 格式多選上傳。
    *   **貼上區（Paste Zone）**：新增一大塊可快速貼上純文字、程式碼或 Markdown 的專屬區域，系統於背後自動轉換並賦予虛擬檔名加入隊列。
*   **PDF 精準修剪（PDF Trimming Tool）**：
    *   整合 `pdf-lib` 提供用戶可視化設定欲提取的 PDF 頁面範圍（例如：1-5, 8-12）。
    *   修剪完成後，用戶可選擇是否先行下載修剪後的輕量化 PDF 文件，然後再交由系統轉換為 Markdown。

#### 2.2.2 「大腦引擎」LLM 控制模組
*   **模型選擇器**：支援 Gemini-3-flash-preview（預設）、GPT-4o-mini、Claude-3 等選擇介面（前端虛擬或實際 API 串接）。
*   **設定自訂區**：用戶可自由編輯 System Prompt / User Prompt，系統將此設定下放，滿足高階玩家（Power Users）需求。
*   **停止按鈕（Kill Switch / Stop Button）**：當 LLM 生成過程中，可以透過中斷 AbortController 或 Stream 阻斷的方式，強制停止生成並儲存當前部分結果，防止因 Token 爆量造成的資源浪費。

#### 2.2.3 「技能工坊」自動化技能升級 (Skill Forge)
*   **輸入與覆寫**：提供 `skill.md` 專屬輸入視窗。使用者可保持載入「預設轉換技能（Default Skill.md）」，或貼上自身編寫的規則。
*   **使用「Skill Creator Skill」升級**：
    *   當用戶點擊「強化技能」，系統會啟動專家級 Prompt，自動分析現有 `skill.md` 架構。
    *   在此階段，自動添加 3 項額外的 **WOW AI Features**（例如：AI 邏輯盲區偵測、AI 多維度標籤網路編織、AI 實踐行動藍圖轉換）。
*   **生成 3 個具體使用情境（Use Cases）**：利用升級後的 `skill.md` 模擬並產出 3 個具體的使用場景範例。

#### 2.2.4 「生成中心」全面性總結與視覺化 (Generative & Visualization Center)
*   **核心產出（3000~4000字 總結）**：Agent 將根據被強化的 `skill.md` 及上傳的文檔/修剪後的 PDF 生成極度豐富的繁體中文大總結（Comprehensive Summary）。
*   **6 種視覺化特效（WOW Visualizations）**：
    1.  **知識雷達圖（Knowledge Radar）**：分析資料涵蓋的維度（如廣度、深度、落地性、技術性等）。
    2.  **概念關聯網（Entity Network）**：以圖形化呈現名詞之間的關聯。
    3.  **時序進展圖（Timeline Gantt）**：若文件為報告，呈現事件的發展時間軸。
    4.  **文件字數/情緒熱力圖（Heatmap）**：各檔案的貢獻多寡。
    5.  **核心痛點/解法對照樹（Problem-Solution Tree）**。
    6.  **行動優先級四象限圖（Priority Matrix）**。
*   **3 大資訊圖表與表格 (3 Infographics & 3 Tables)**：結合 React `recharts` 元件，在文件中嵌入 3 個由真實數據渲染的圖表，與 3 個重點整理表格。

---

## 3. 功能作業流程 (Workflow Specification)

1.  **第一階段：上傳與修剪** -> 用戶上傳 PDF，輸入範圍 1-3，點擊修剪機制。
2.  **第二階段：設定語言與模型** -> 確認介面為 Traditional Chinese，模型使用預設 Gemini 3。
3.  **第三階段：強化 Skill.md** -> 載入原始文檔轉換技能，觸發強化機制，生成包含 3 個新 AI Feature 的增強版 Skill，並產出 3 個 Use Cases。
4.  **第四階段：執行巨集總結** -> 系統讀取所有轉檔 Markdown 與貼上區資訊，調用模型，串流顯示 (Live Log) 產出。若出現異常，用戶按下 Stop 按鈕即可停止。
5.  **第五階段：沉浸式圖表展示** -> 3000 字總結完成後，畫面最下方自動渲染 3 組圖表、3 組表格，並可手動切換 6 種 WOW 視覺特效。
6.  **第六階段：無止盡提示 (Keep Prompting)** -> 針對生成的 4000 字總結，下方提供對話框，用戶可基於該總結繼續進行追問、擴寫、或要求重新生成特定觀點。

---

## 4. 錯誤處理與邊界條件 (Error Handling)

*   **PDF 解析失敗**：若 PDF 包含加密或純圖片無 OCR 文字，系統捕獲錯誤並於 Live Log 印出紅字。建議用戶使用純文字貼上區替代。
*   **Token 限制 (Quota Exceeded)**：串接 API 如觸碰限制，系統抓取 `429` 錯誤，進入重試機制並於面板上跳出警示通知，協助保留已生成之一半進度。
*   **字數無法精準對齊 3000-4000 限制**：LLM 本質上具備隨機性。系統架構設計上將「總結」切割成三個獨立的指令發送（例如：概述 1000 字 + 演練 2000 字 + 結論 1000 字），再合併輸出，大幅增加滿足限制之成功率。

---

## 20 個後續深入探討之追問 (20 Comprehensive Follow-up Questions)

1. 我們如何在不犧牲前端渲染效能的情況下，讓 `recharts` 在展示數千節點的實體關聯圖時依然平滑（Sleek）？
2. 面對超過 50MB 甚至 100MB 的 PDF 檔案，我們的分頁修剪與字串提取（Client-side `pdf-lib`）是否會遭遇瀏覽器記憶體崩潰？該如何優化？
3. 在自動化加載預設「Skill.md」強化功能時，若用戶上傳了完全不相關的技術範疇文件，Skill Creator 是否會產生幻覺？
4. 當強制終止（Stop Button）被觸發時，Stream 的連線切斷，我們該如何最優化地保留並渲染最後收到的 incomplete Markdown 語法而不使畫面破版？
5. 3000 到 4000 字的產出極易超過單次上下文輸出的設定上限，您建議使用 LangChain 的長文本合併或是透過純前端連續觸發解決？
6. 在「保留原始轉檔」與「結合新技能」之間，我們是否應該為每次文檔處理建立獨立的版控系統（Version Control）？
7. 如果用戶在此次對話中需要頻繁使用 Keep Prompting（繼續對話），我們該如何管理與壓縮逐漸膨脹的上下文？
8. 六大 WOW AI 視覺特效中有哪些應該依靠純前端邏輯產生？有哪些應該讓 LLM 輸出特定 JSON 結構以利作圖？
9. 針對 Traditional Chinese（繁體中文）的生成質量，是否需要加入特別的 System Prompt 防止簡體字詞混入？
10. 當用戶將不同格式的檔案（TXT, PDF, JSON）混合上傳時，前處理模組應該統一採用什麼樣的中介資料結構（AST 或自定義 JSON）最易於後續 LLM 處理？
11. 對於表格 1、2、3 在介面上的自適應（Responsive）處理，當轉至手機瀏覽時有什麼具體設計準則？
12. 互動提示指示器 (Interactive Indicator) 的動畫特效，應使用 CSS Keyframes 還是 `framer-motion` 處理最符合 Light & Sleek 風格？
13. 若使用者要求針對產生出的 3 項新 WOW AI Features 提供個別的落地程式碼，本系統該如何擴展？
14. Live Log 中的錯誤資訊該對一般用戶屏蔽多少技術細節，才能兼具除錯性及 UX？
15. 是否有考慮將頁面修剪的 `pdf-lib` 操作紀錄快取於 IndexedDB 以便使用者重新整理後恢復？
16. 生成的 3000 字報告內，參考來源（Citations）該如何標示以對應原始的 1-3 頁修剪後 PDF？
17. 模型選擇模組目前設定的 default 是 gemini-3-flash-preview，未來自動適配到 1.5-pro 等級的模型需經過哪幾項自動化測試？
18. Paste Zone (純文字粘貼區) 的容量上限應該設定在多少 Token 內最符合本架構的穩定性？
19. 3 份資訊圖表（Infographics）的視覺配色方案，該如何與整體 Light & Sleek 主題達成一致的情境連動？
20. 未來如果希望導入協作模式（多用戶同時檢視這份自動化產出的 3000 字報告），架構在當下需要預留哪些 WebSocket 對接節點？
