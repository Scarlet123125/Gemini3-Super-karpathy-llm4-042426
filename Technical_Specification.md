# 知識代理 (Knowledge Agent WOW v5.0) 升級版技術規格書

## 1. 產品概述與核心理念 (Executive Summary & Core Philosophy)

本文件為「知識代理 WOW (Knowledge Agent WOW v5.0)」之完整技術規格書。系統旨在提供一個極致流暢（Sleek）、明亮（Light）且具備高度互動性（WOW Interactive）的智能網頁應用程式。本系統傳承了先前的核心知識萃取優勢（支援 EPUB, PDF, DOCX, Facebook JSON 等多源格式轉換與解析），更在前端互動、視覺化呈現、大語言模型（LLM）精準控制以及全域知識管理上進行了革命性的架構升級。

### 1.1 核心設計目標 (Core Design Objectives)

1. **極簡與奢華並重的現代設計 (Light & Sleek Style)**：
   全繁體中文（Traditional Chinese）介面規劃，採用大面積留白、柔和的陰影（Soft Shadows）、以及明亮的色調（Slate & Blue 主色系），去除不必要的邊框與冗餘視覺元素，提供專業、舒適且低認知負擔的使用者體驗。運用 `motion/react` 打造流暢的轉場與微互動（Micro-interactions）。

2. **零阻力資料注入與前處理 (Frictionless Data Ingestion)**：
   除了支援多元檔案類型的上傳，本系統新增了「純文字/程式碼專屬貼上區（Paste Zone）」。使用者不再需要頻繁切換視窗建立中介檔案，系統能即時擷取該區塊字串，併入虛擬檔案系統隊列，大幅降低使用者從取得資料到開始分析之間的摩擦力。

3. **精準控制、容錯與安全性 (Control, Tolerance & Safety)**：
   - **AbortController 強制中斷 (Stop Button)**：為了解決長文本生成（3000~4000 字）可能導致的漫長等待或方向偏移，系統實作了硬體的 Abort Signal，讓使用者能一鍵（Stop）斬斷 HTTP Stream，並優雅地保留中斷前的推演內容。
   - **自訂大腦引擎 (Custom Brain Engine)**：開放「進階 LLM 功能提示詞與模型編輯」權限。針對三大核心任務（知識總結、對話探勘、WOW 魔術特效），用戶皆可獨立指定使用的底層模型（如 Gemini 3 Flash, Gemini 3.1 Flash Lite, GPT-4o-mini）與 System/User Prompt，高度賦能具備 Prompt Engineering 經驗的高階用戶（Power Users）。

4. **六大 WOW AI 視覺化重塑 (6 WOW Visualizations)**：
   不再侷限於 Markdown 的標題與項目符號。本次升級深度整合 `recharts`，開發出六種立體、互動式的視覺渲染特效模組：時序進展（Gantt）、文檔熱度矩陣（Heatmap）、領域主題佔比（Topic Pie）、實體關聯網（Scatter Network）、風險不確定雷達（Radar）、以及行動優先級矩陣。

## 2. 系統架構與模組設計 (System Architecture & Module Design)

本系統採用純前端（Client-side SPA）搭配 Serverless Function/API 的架構。核心框架為 React 19 + Vite 6，輔以 Tailwind CSS v4 進行極速樣式建構。

### 2.1 模組劃分 (Module Taxonomy)

系統主要分為五大模組：
1. **「文檔樞紐」資料處理模組 (Document Hub & Preprocessing)**
2. **「大腦引擎」LLM 提示與串流控制模組 (Brain Engine & Streaming Control)**
3. **「技能工坊」自動化技能生成與強化模組 (Skill Forge)**
4. **「戰情中心」綜合視覺化儀表板 (War Room Dashboard)**
5. **「對話探勘」連續問答模組 (Interactive Chat Explorer)**

---

### 2.2 模組詳細規格 (Detailed Module Specifications)

#### 2.2.1 「文檔樞紐」資料處理模組 (Document Hub)

*   **多源狀態機 (Multi-source State Machine)**：
    *   **檔案收集器**：利用 `useState<File[]>` 綁定前端上傳邏輯。
    *   **虛擬檔案聚合網**：貼上區（Paste Zone）的內容會被轉換為系統內部的一份虛擬 `File` 物件，並被賦予 `source_type: 'paste'`，接著進入隊列與其他實體文件（PDF/DOCX）合併。
*   **非同步中介格式轉換**：
    *   所有輸入的實體或虛擬資料，皆會在執行初期轉化為純文字（Plain Text）或結構化 AST。系統針對文字進行編碼轉換、雜訊去除，並萃取出結構化 Meta-data，以最精簡的 Token 交由 LLM 處理。
    *   **PDF 精準修剪 (Virtual PDF Trimming)**：介面上提供修剪設定（例如：1-3 頁），在結合如 `pdf-lib` 等前端函式庫時，系統將在內存中重組 PDF 二進制資料，只將特定頁面的文字拋給分析模組。

#### 2.2.2 「大腦引擎」LLM 控制模組 (Brain Engine)

*   **全異步串流架構 (Fully Async Streaming Architecture)**：
    *   **GoogleGenAI 官方 SDK 整合**：採用 `@google/genai` 進行串流（Streaming）生成。
    *   **狀態監控與生命週期**：藉助 `useRef(false)` (isProcessing) 配合 `AbortController`，在 React Re-render 生命週期中確保能隨時截斷 Generator。
    *   當使用者按下「Stop」，系統捕捉 `AbortError`，停止更新狀態，並呼叫 Fallback 機制或凍結現有文本。
*   **模組化 LLM 設定倉儲 (Modular LLM Strategy Store)**：
    *   維護一組複合型狀態 `llmSettings`，其中包含：
        *   `summary`: `{ model, prompt }`
        *   `chat`: `{ model, prompt }`
        *   `magic`: `{ model, prompt }`
    *   這樣的設計確保系統能以最強、最貴的模型執行摘要，而將簡單的對話或特效請求卸載至速度更快、成本更低的輕量化模型（如 Gemini 3.1 Flash Lite），達到性能與成本的最佳平衡。

#### 2.2.3 「生成中心」全面性總結與視覺化 (Generative & Visualization Center)

*   **巨量 Markdown 串流渲染 (Massive Markdown Rendering)**：
    *   使用 `react-markdown` 配合 `remark-gfm` 即時解析 LLM 串流回傳的 Markdown 字串。
    *   透過 `prose` (Tailwind Typography) 提供最佳的閱讀排版（行距、字重、清單對齊）。
*   **六大魔幻視覺展示室 (6 WOW Visualizations Showcase)**：
    基於 `recharts` 構建六個資料圖表組件，透過 `selectedWow` 狀態進行視圖切換：
    1.  **時序進展圖 (Gantt-like Visualization)**：利用水平堆疊長條圖 (`ReBarChart`)，視覺化各階段任務與耗時（利用 transparent 的底層 Bar 達成 Gantt 效果）。
    2.  **文檔熱度矩陣 (Heatmap)**：以動態顏色區塊渲染，每個方塊的透明度（Alpha）代表該區塊資訊的活耀度或重要性。
    3.  **主題佔比圖 (Topic Map)**：使用 `PieChart` 與 `Cell` 控制配色，顯示知識組成成分。
    4.  **實體關聯網 (Scatter Network)**：利用 `ScatterChart` 結合 X (Impact), Y (Relevance), Z (Weight) 三維度參數，視覺化名詞的落點與關聯權重。
    5.  **風險與不確定雷達 (Radar Chart)**：透過 `RadarChart` 與 `PolarGrid` 呈現知識內容在「矛盾、過時、雜訊」等不同維度上的表現。
    6.  **行動矩陣 (Action Matrix)**：運用自訂 CSS Grid（高/低 急迫 vs 高/低 影響），建立視覺化的四象限決策支援系統。

#### 2.2.4 「對話探勘」互動模組 (Interactive Chat Explorer)

*   **上下文感知對話槽 (Context-aware Chat Pipeline)**：
    *   這是一套構建在已生成之 3000 字總結上的擴充服務。我們將生成的總結內容視為 Immutable 的底座（Base Context），將使用者的提問串接到 `User Prompt` 尾端進行連續對話。
    *   **氣泡式即刻對話介面 (Chat Bubble Interface)**：利用 Tailwind 的圓角控制與色彩對比，區分 User (`bg-slate-800`, `text-white`) 與 Bot (`bg-blue-100` / `bg-slate-50`)，呈現出宛如專屬通訊軟體的質感。支援自動打字機特效與 Markdown 解析。
    *   **預設問答選項卡 (Predefined Questions Carousel)**：系統根據生成的內容隨機抽取提供 20 個深度問題提示，使用者不僅可以手動輸入，還能點擊提示按鈕直接發送問題，實現真正的 Frictionless (低摩擦力) 探索。

#### 2.2.5 全域互動組件與動態微動畫 (Global Components & Micro-animations)

*   **Live Log (即時執行日誌)**：獨立的黑色終端機（Terminal）樣式區塊，利用 `useEffect` 持續渲染推演進度（包含成功、警告與錯誤訊息），讓使用者對背後繁瑣的資料處理擁有安全感。
*   **Interactive Indicator (互動指示燈)**：利用 `animate-pulse` 與漸層點點，展示系統是處於 Idle, Processing，抑或是 Completed（就緒）狀態。
*   **平滑的頁面切換 (Framer Motion)**：整個應用程式的視窗切換、選單展開、特效切換皆運用了 `AnimatePresence` 與 `motion.div` 進行透明度（Opacity）與 Y 軸（Y-axis）偏移的補間動畫，呈現極高級的順滑感。

---

## 3. 核心運算流程詳解 (Core Execution Workflow)

當使用者點擊「開始智能推演 (RUN)」後，背後的非同步引擎將依序進入以下狀態：

### Phase 1: 初始化與重置 (Initialization & Reset)
- 清空所有的過往日誌 (`logs`)、聊天紀錄 (`chatHistory`)、生成的總結 (`generatedSummary`) 以及特效選項 (`selectedWow`)。
- 初始化 `AbortController` 以利攔截取消操作。啟用 `isProcessingRef.current = true`。

### Phase 2: 分析與組裝 Prompt (Prompt Composition)
- 抓取使用者所設定的 LLM 變數（包含特定模組的選用大模型與自定義 System Prompt）。
- 組合來自上傳區與 Paste Zone 的資訊，若使用者沒有給予任何輸入，系統則會啟用 Default Fallback Context，確保流程不中斷。
- 提取自訂的 `Skill.md` 架構，轉換為大模型能夠理解的核心規則。

### Phase 3: 虛擬進度展示 (Virtual Phasing & Live Log Emulation)
為弭平人類心理對長時間等待的焦慮感，系統會依序派發事先編排的日誌：「啟動與環境初始化...」、「讀取資料與擷取...」、「注入 WOW AI 特徵...」等進度文字。這個機制的延遲不僅有助於 UX 體驗，也確保背後的非同步預處理任務（如資料清洗、Base64 轉換）能無痛完成。

### Phase 4: 連線 Google Gen AI 並啟動 Streaming (LLM Stream Connection)
- 呼叫 `generateContentStream`。
- 透過 `for await (const chunk of stream)` 持續讀取模型丟回的字串碎片。
- 在每一次 Loop 中，檢查 `AbortController.signal.aborted`。如果為 true，立即 `break` 迴圈並回報『生成中斷』，保留所有已知字串。
- 將 `chunk.text` 透過 `setGeneratedSummary(prev => prev + chunk.text)` 更新到 UI 狀態，激發 React-Markdown 的漸進式渲染（Progressive Rendering）。

### Phase 5: 產出完成與動態儀表板就緒 (Resolution & Dashboard Activation)
- 寫入日誌「流式生成與視覺化整合完畢」。
- 啟用頁面上所有的 Tab 路由切換（Knowledge Summary, Infographics, Magic Visualization, Interactive Chat）。

---

## 4. 資料流與狀態管理 (Data Flow & State Management)

由於此應用沒有導入外部的 Redux 或 Zustand 狀態庫，因此採用了 React 的原生 Hooks 對系統狀態進行高密度集中管理。

### 4.1 核心狀態結構層級

1.  **應用程式全域狀態 (Application Global State)**
    *   `appState`: `'idle' | 'processing' | 'completed'`。決定大架構 UI（按鈕顏色、進度條、日誌顯示）。
    *   `currentStep`: `number`。搭配 `appState === 'processing'` 時使用，計算目前的動畫步驟。

2.  **大腦控制台狀態 (Brain Engine Settings)**
    *   `llmSettings`: `Object`。儲存每個微服務需要的 { model, prompt }。
    *   `language`: `string`。控制 LLM 生成的語言口吻。

3.  **視覺化互動狀態 (Visualization UI State)**
    *   `selectedWow`: `number | null`。控制全螢幕 WOW 報表的展開與收合。
    *   `activeTab`: `string`。控制頂部選單的導覽（知識總結 / 圖表 / 特效 / 對話）。

4.  **對話探勘系統陣列 (Chat System Arrays)**
    *   `chatHistory`: `Array<{ role: 'user'|'bot', content: string }>`。以 Immutable Array 的形式不斷擴增對話槽。

5.  **逃脫艙機制 (Escape Hatch Refs)**
    *   `isProcessingRef`: `MutableRefObject<boolean>`。用於無痛中斷 LLM 請求流程中的 Promise Delay 或 `for` 迴圈。
    *   `abortControllerRef`: `MutableRefObject<AbortController | null>`。用於中止實際發送出去的 HTTP 請求實體。

---

## 5. UI/UX 與前端微互動設計 (UI/UX & Micro-interactions Guidelines)

### 5.1 光影、顏色與幾何學 (Lighting, Colors & Geometry)
*   **圓角系統 (Typography & Borders)**: 整體使用極度柔軟的 `rounded-2xl` 甚至 `rounded-[2rem]`。捨棄方正的銳角，給予使用者安全的親和感。
*   **陰影 (Shadows)**: 使用 Tailwind 的 `shadow-sm`, `shadow-xl`, `shadow-2xl`，並搭配降低透明度的顏色陰影（如 `shadow-slate-200/40`）來創造 Z 軸的高低落差感。
*   **邊框 (Borders)**: 所有卡片的邊線都運用了 `border-slate-100` 或 `border-slate-200`，使整個版面即使有複雜區塊，卻依然維持在同一白色系的光源下，達成極度 Sleek 的效果。背景甚至會運用 `bg-[url('...')]` 的低透明度方格紋理建立層次。
*   **Glassmorphism (磨砂玻璃效應)**: 頂部導覽列（Navbar）與左側與底部的 Sticky bar 使用了 `bg-white/70 backdrop-blur-md`，讓在捲動長文時，背景的文字仍能模糊透出，產生高級感體驗。

### 5.2 排版與視覺階層 (Typography & Hierarchy)
*   主要文字採用 `text-slate-800` 與 `text-slate-600`。
*   利用 `text-xs` 與 `text-[10px]` 作為所有 UI 的 Meta Data，而不會干擾主要的閱讀內容。
*   大量使用 `lucide-react` 向量圖示，在每個按鈕或段落前加上輔助 Icon，減少大腦的解析負擔。
*   **圖表佈局**：刻意隱藏了 `Recharts` 預設的格線（Grid Lines）與軸線（Axis Lines），只保留極簡的數據實體（長條、曲線與圓餅），這也是 Sleek 設計的核心原則。

### 5.3 互動回饋 (Feedback Loop)
*   當任何任務轉換或狀態改變時，`AnimatePresence` 會控制 DOM 節點淡出與位移，使用者不會感受到畫面刷新（Page Reload）的突兀感。
*   **Bot 推論載入中**：在對話框中，模擬打字載入狀態的 3 個小圓點跳躍動畫，給予明確的等待期許。

---

## 6. 風險與限制探討 (Limitations & Trade-offs)

1.  **純前端運行架構的安全風險**：目前的 API 請求透過前端直接將 Request 帶有 `GEMINI_API_KEY` 以 HTTP Post 送出。若不依靠後端 Proxy，API Key 將可能暴露於瀏覽器 Console 中。在此展示版本中此為特意簡化，生產環境必需建置 Server-side 轉發。
2.  **Streaming 的不穩定性處置**：儘管導入了 `try...catch` 與 `abort` 機制，LLM 回傳的 Markdown 可能在隨機切斷的情況下留下殘破無法解析的字串（如 `**未完`）。此時 `react-markdown` 可能會遭遇渲染缺陷。目前系統依賴 `react-markdown` 自身的容錯能力，並無做手動 AST 強制補齊。
3.  **Token 上限與記憶體消耗**：產出 3000~4000 詞的中文大總結，即使是 Gemini 3 Flash 原生理算力也很高，如果將先前的對話（chatHistory）無限串接，極易突破模型的 Context Limit。目前系統的 Chat 模組設計是以「生成的總結」為主體基楚，並沒有每次把完整的 ChatHistory 餵回去，藉以控制 Token 使用量。

---

## 7. 總結與未來展望 (Conclusion & Roadmap)

Knowledge Agent WOW v5.0 不僅僅是個能理解資料的工程師介面，它更是一個融合了頂級 SaaS 軟體設計工藝（Sleek & Light）與前衛視覺化能力的「數位知識探勘者」。

從 Frictionless 的拖列輸入、具備防呆中斷的 LLM Streaming 引擎、甚至擴展出六套專業視覺化框架與無止盡對話艙；本系統證明了依靠純 React 組合的微應用，只要運用正確的 Prompt 以及高度客製化的 Recharts 控制，也能打造出極具商業震撼力（WOW Factor）的智慧產品。未來我們將目標放眼在建立多人即時協作（Multi-player Yjs 整合）、向量資料庫接入以及混合 RAG (Retrieval-Augmented Generation) 的無縫接軌。

---

## 20 個後續深入探討之追問 (20 Comprehensive Follow-up Questions)

請參考以下 20 個人工智慧、前端效能、架構及使用者體驗領域的進階提問，做為未來持續優化探討之根基：

1. 我們如何在不犧牲前端渲染效能的情況下，讓 `recharts` 在展示數千節點的實體關聯圖（Scatter Network）時依然能保持每秒 60fps 的平滑度（Sleek）？
2. 面對超過 50MB 甚至 100MB 的 PDF 檔案，我們目前的前端分頁修剪與字串提取機置是否會遭遇瀏覽器的記憶體崩潰（OOM）？該如何優化資料流處理（Stream Processing）？
3. 在自動化加載預設「Skill.md」強化功能時，若用戶上傳了完全不相關的雜訊技術範疇文件，大模型負責生成的 Skill Creator 是否會產生幻覺（Hallucination）使得魔術特效輸出崩壞？該如何利用 Prompt 建立防呆護欄？
4. 當強制終止（Stop Button）被觸發且串流連線切斷時，我們該如何最優化地收尾、解析並渲染最後收到的不完整的 Markdown 語法（Incomplete AST），而不使前端排版破版或發生 Crash？
5. 3000 到 4000 字的深層輸出極易超過單次上下文輸出的設定上限或超時斷線，您建議未來是使用何種切片請求（Chunked Prompting）還是輪迴反覆生成（Iterative Generation）來緩解？
6. 在「保留原始使用者輸入」與「結合新技能與設定檔」之間，我們是否應該為每次文檔處理建立獨立的時序版控系統（Time-travel Version Control）儲存於 LocalStorage/IndexedDB？
7. 如果用戶在此次對話中頻繁使用 Keep Prompting（繼續對話），我們該如何最佳化管理與壓縮逐漸膨脹的上下文 Token 並保持回覆的脈絡一致性？
8. 我們設計的六大 WOW AI 視覺特效中，目前的底層架構有哪些必須由 LLM 確保輸出特定結構的 JSON 才能精準作圖？而哪些單靠純前端 Regex 與頻率統計邏輯即可低延遲產生？
9. 針對 Traditional Chinese（繁體中文）的生成質量，是否需要加入特別的 System Prompt 或者後處理機制（Post-processing），以有效防止簡體字或大陸慣用語彙入？
10. 當用戶將不同格式的極端資料（如巨量的 TXT, 亂碼的 PDF, 結構顛倒的 JSON）混合上傳時，前處理模組應該統一採用何種容錯 AST 或中介資料結構最易於後續 LLM 消化？
11. 對於目前的排版（包含 3 個指標表格與 3 組複合資訊圖表）在 RWD (Responsive Web Design) 轉至手機瀏覽時有什麼具體的設計準則，以確保不會喪失 Sleek 體驗？
12. 我們目前的 Interactive Indicator (互動指示燈的脈衝特效)，與其使用 Tailwind 的 `animate-pulse`，若改採用 `framer-motion` 的複雜彈簧物理動畫是否會更符合 Light & Sleek 風格？其效能折損如何評估？
13. 若高階使用者要求針對 Agent 產生出的 3 項新 WOW AI Features，直接提供可部署的獨立前端元件程式碼或 CLI 指令碼，本系統該如何透過 Tool Calling 來平滑擴展？
14. Live Log 中的錯誤資訊該對一般用戶屏蔽多少技術細節（例如剔除 HTTP 429 或 TypeError 等字眼），才能兼具讓開發者除錯的直覺性與一般使用者的 UX？
15. 頁面修剪的操作紀錄以及使用者的自定義 Prompt 設定，是否應該深度整合至 `IndexedDB` 或 URL 參數中，以便使用者重新整理後無縫恢復工作階段？
16. 生成的巨量 4000 字文字報告內，參考來源（Citations）該如何利用 Obsidian 專屬連結語法標示，以便反推與精確對應至原始輸入文檔（或是 PDF 的第 X 頁）？
17. 模型選擇模組目前預設是 gemini-3-flash-preview，未來我們如果期望將系統自動在簡單任務切換為模型 Flash，而在困難的圖表資料結構抽取自動升級至 Pro 模型，需建立哪些自動化閾值測試（Threshold Testing）？
18. Paste Zone (純文字粘貼區) 在設計上的字元容量上限應該強制設定於多少以內，才能在避免前端瀏覽器卡頓的前提下，又不會讓 LLM 因 Context Overflow 崩塌？
19. 資訊圖表的視覺配色方案（如 Hex: `#3b82f6` 等色系），我們該如何與整體系統的 Light & Sleek 甚至到淺灰背景之間，達成由全域 CSS 變量連動的動態情境佈景主題（Dynamic Theming）？
20. 未來若計劃導入即時多人協作模式（Multiplayer Collaborative View）以檢視這份自動化產出的知識大壩報告，我們當下的 React 狀態樹結構需要預先重構成具備哪些可以與 WebSocket / CRDT（如 Yjs 或 Automerge） 對接的資料節點？
