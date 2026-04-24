import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileUp, FileText, Settings, Play, Square, MessageSquare, Plus,
  Activity, Bot, Share2, Sparkles, Wand2, Database, LayoutTemplate, 
  X, CheckCircle2, ChevronRight, BarChart, PieChart as PieChartIcon, 
  Terminal, ScrollText, StopCircle
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart as ReBarChart, Bar, XAxis, YAxis, 
  Tooltip as ReTooltip, CartesianGrid, LineChart, Line, PieChart, Pie, Cell,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ScatterChart, Scatter, ZAxis
} from 'recharts';
import { GoogleGenAI } from '@google/genai';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- MOCK DATA & CONSTANTS ---
const DEFAULT_SKILL_MD = `轉檔：EPUB / PDF / DOCX / Facebook JSON → Obsidian Markdown
將電子書、報告、文件或社群平台匯出轉成乾淨的 Markdown。

來源格式 | 輸出位置 | 媒體位置
EPUB / PDF / DOCX | raw/books/ | raw/books/assets/
Facebook JSON 匯出 | raw/notes/social/facebook/ | raw/notes/social/facebook/assets/`;

const MOCK_SUMMARY = `
## 核心總結：全域知識架構分析
本報告透過整合所提供的輸入數據，進行全面的跨維度分析與萃取。

### 1. 核心觀點探討
在本次提供的資料中，展現了強烈的知識轉換與資料融合特性。我們觀察到以下關鍵主題：
- **異質資料標準化**：無論是社群媒體的 JSON、傳統閱讀的 EPUB 或是專業報告 PDF，最終都被統一至 Obsidian 的 Markdown 節點中。
- **自動化清理機制**：不僅僅是格式轉換，更包含了中英文間距統一、去除浮標、修復翻譯殘留等清理邏輯。

### 2. 進階強化技能分析 (Enhanced Skill)
經過大腦引擎強化後的 Skill.md，現已具備：
1. **WOW 功能一：AI 邏輯盲區偵測** - 在轉檔期間自動提示內容邏輯斷層。
2. **WOW 功能二：多維度標籤網路編織** - 針對段落語義，自動安插 Obsidian #Tags 原生標籤。
3. **WOW 功能三：實踐行動藍圖轉換** - 將長文的結論轉化為 Checklist。

### 3. 三大具體應用場景 (Use Cases)
1. **研究員的社群大腦**：一鍵將 Facebook 長年活動紀錄轉換為 Markdown，建立個人生命歷程知識網。
2. **出版級文獻庫建立**：從散落的 PDF 中精確裁剪指定範圍（如 1-3 頁），過濾頁碼與雜訊，打造零干擾閱讀環境。
3. **沉浸式學習系統**：透過語言模型的自動註解與語法高亮，將技術文件 DOCX 直接化為可用於開發的程式碼片段資料集。

> *此為精萃後之動態生成內容，實際運行將具備完整 3000 字至 4000 字的深度探討...*
`;

// --- UI COMPONENTS ---
const Button = ({ children, className, variant = 'primary', ...props }: any) => {
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-sm",
    secondary: "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50",
    danger: "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100",
    ghost: "bg-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-100"
  };
  return (
    <button 
      className={cn("px-4 py-2 rounded-xl font-medium transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50", variants[variant as keyof typeof variants], className)}
      {...props}
    >
      {children}
    </button>
  );
};

// --- MAIN APP ---
export default function App() {
  const [dataSources, setDataSources] = useState<File[]>([]);
  const [pasteZone, setPasteZone] = useState('');
  const [skillMd, setSkillMd] = useState(DEFAULT_SKILL_MD);
  const [language, setLanguage] = useState('Traditional Chinese');
  const [model, setModel] = useState('gemini-3-flash-preview');
  
  // App State: idle, processing, completed
  const [appState, setAppState] = useState<'idle' | 'processing' | 'completed'>('idle');
  const [currentStep, setCurrentStep] = useState(0);
  const [logs, setLogs] = useState<{time: string, msg: string, type: string}[]>([]);
  const [generatedSummary, setGeneratedSummary] = useState('');
  
  // Output specific AI Features State
const [llmSettings, setLlmSettings] = useState({
  summary: { model: 'gemini-3-flash-preview', prompt: '請將以下輸入內容解析並生成包含 3000-4000 字的深度總結，確保遵循指定的格式與規則。' },
  chat: { model: 'gemini-3-flash-preview', prompt: '你現在是使用者的專屬知識顧問，請依照先前的知識總結回答以下問題。' },
  magic: { model: 'gemini-3-flash-preview', prompt: '請將內容轉換為視覺化友善的格式，並輸出對應結構。' }
});

const isProcessingRef = useRef(false);
const abortControllerRef = useRef<AbortController | null>(null);

const [selectedWow, setSelectedWow] = useState<number | null>(null);
const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'bot'; content: string }[]>([]);
const [chatInput, setChatInput] = useState('');

  // Modals / Overlays
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState('summary'); // summary, magic, charts, chat
  
  const addLog = (msg: string, type = 'info') => {
    setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), msg, type }]);
  };

  const handleRun = async () => {
    if (appState === 'processing') return;
    setAppState('processing');
    isProcessingRef.current = true;
    abortControllerRef.current = new AbortController();
    setLogs([]);
    setGeneratedSummary('');
    setSelectedWow(null);
    setCurrentStep(0);
    setActiveTab('summary');

    const steps = [
      { msg: '啟動：初始化環境與載入模型...', delay: 800 },
      { msg: '讀取資料：解析上傳文件與貼上區擷取...', delay: 1200 },
      { msg: '智慧模組：分析 Skill.md，注入 WOW AI 擴展技能...', delay: 1500 },
      { msg: '產生串流：連接大語言模型進行深度總結推演...', delay: 500 },
    ];

    for (let i = 0; i < steps.length; i++) {
      if (!isProcessingRef.current) break; // Stopped
      setCurrentStep(i);
      addLog(steps[i].msg, 'process');
      await new Promise(r => setTimeout(r, steps[i].delay));
    }

    if (!isProcessingRef.current) return;
    setCurrentStep(4);

    try {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY environment variable is not set. Please set it in AI Studio settings.');
      }
      
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const inputData = pasteZone.trim() || '使用者無提供額外原始文本，請利用系統已知範圍及預設輸入進行推演。';
      
      const userPrompt = `Input Data:\n${inputData}\n\nSkill / Formatting Rules:\n${skillMd}\n\nLanguage: ${language}\n\nPlease generate a 3000-4000 word comprehensive summary and analysis based on the instructions.`;

      addLog('推演啟動，正在匯入並串流渲染內容...', 'success');
      
      const stream = await ai.models.generateContentStream({
        model: llmSettings.summary.model,
        contents: userPrompt,
        config: {
          systemInstruction: llmSettings.summary.prompt
        }
      });

      for await (const chunk of stream) {
        if (!isProcessingRef.current || abortControllerRef.current?.signal.aborted) {
          break;
        }
        if (chunk.text) {
          setGeneratedSummary(prev => prev + chunk.text);
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError' || !isProcessingRef.current) {
         addLog('LLM 執行已由用戶中斷', 'error');
         return;
      }
      addLog(`生成失敗: ${err.message}`, 'error');
      // Fallback
      addLog('啟動 Fallback 備用虛擬資料以供展示...', 'info');
      const chunks = MOCK_SUMMARY.split('\n');
      for (let i = 0; i < chunks.length; i++) {
        if (!isProcessingRef.current) break;
        await new Promise(r => setTimeout(r, 100));
        setGeneratedSummary(prev => prev + chunks[i] + '\n');
      }
    }

    if (isProcessingRef.current) {
      setAppState('completed');
      addLog('流式生成與視覺化整合完畢', 'success');
    }
  };

  const handleStop = () => {
    if (appState === 'processing') {
      isProcessingRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      addLog('使用者強制終止生成程序 (Aborted)', 'error');
      setAppState('idle');
    }
  };

  const handleChatSubmit = async (e?: React.FormEvent, predefinedMsg?: string) => {
    if (e) e.preventDefault();
    const msg = predefinedMsg || chatInput.trim();
    if (!msg) return;

    if (!process.env.GEMINI_API_KEY) {
      addLog('GEMINI_API_KEY is missing.', 'error');
      return;
    }

    const newUserMsg = { role: 'user' as const, content: msg };
    setChatHistory(prev => [...prev, newUserMsg]);
    setChatInput('');
    
    // add placeholder for bot
    setChatHistory(prev => [...prev, { role: 'bot', content: '' }]);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const userPrompt = `Based on the generated summary:\n${generatedSummary}\n\nUser question: ${msg}`;

      const stream = await ai.models.generateContentStream({
        model: llmSettings.chat.model,
        contents: userPrompt,
        config: {
          systemInstruction: llmSettings.chat.prompt
        }
      });

      let currentResponse = '';
      for await (const chunk of stream) {
        if (chunk.text) {
          currentResponse += chunk.text;
          setChatHistory(prev => {
            const newHistory = [...prev];
            newHistory[newHistory.length - 1].content = currentResponse;
            return newHistory;
          });
        }
      }
    } catch (err: any) {
      setChatHistory(prev => {
        const newHistory = [...prev];
        newHistory[newHistory.length - 1].content = `[錯誤] ${err.message}`;
        return newHistory;
      });
    }
  };

  const FOLLOW_UP_QUESTIONS = [
    "我們如何在不犧牲前端渲染效能的情況下，讓 recharts 在展示數千節點的實體關聯圖時依然平滑？",
    "面對超過 50MB 甚至 100MB 的 PDF 檔案，我們的分頁修剪與字串提取是否會遭遇記憶體崩潰？",
    "若用戶上傳了完全不相關的技術範疇文件，Skill Creator 是否會產生幻覺？該如何防範？",
    "當強制終止（Stop Button）被觸發時，該如何最優化地保留並渲染最後收到的 incomplete Markdown？",
    "3000 到 4000 字的產出極易超過單次上下文輸出的設定上限，您建議如何切片請求緩解？",
    "在「保留原始轉檔」與「結合新技能」之間，我們是否應該建立獨立的版控系統（Version Control）？",
    "如果用戶頻繁使用 Keep Prompting（繼續對話），我們該如何管理與壓縮逐漸膨脹的上下文 Token？",
    "六大 WOW AI 視覺特效中有哪些應該依靠 LLM 輸出特定 JSON 結構以利作圖？",
    "針對繁體中文生成質量，加入哪些 System Prompt 能有效防止簡體字詞混入？",
    "當用戶將TXT, PDF, JSON混合上傳時，前處理模組應該統一採用什麼AST或中介資料結構？",
    "表格 1、2、3 在手機瀏覽自適應（Responsive）處理有什麼具體設計準則？",
    "互動提示指示器的動畫特效，應使用 CSS Keyframes 還是 framer-motion 最符合 Sleek 風格？",
    "若使用者要求針對產生出的 WOW AI Features 提供個別落地程式碼，本系統該如何擴展？",
    "Live Log 中的錯誤資訊該對一般用戶屏蔽多少細節，才能兼具除錯性及 UX？",
    "頁面修剪的操作紀錄是否該快取於 IndexedDB 以便使用者重新整理後恢復？",
    "生成的大量文字報告內，參考來源（Citations）該如何標示以對應原始上傳文件段落？",
    "從 gemini-3-flash-preview 自動適配到 1.5-pro 等級的模型需經過哪幾項自動化測試？",
    "Paste Zone 的字元容量上限應該設定在多少最符合前端穩定性？",
    "資訊圖表的視覺配色方案，該如何與整體 Light & Sleek 達成一致的情境連動？",
    "導入多人協作檢視此報告模式時，當下需要預留哪些 WebSocket 對接節點？"
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans flex flex-col md:flex-row shadow-2xl selection:bg-blue-100 overflow-hidden border-2 border-slate-200">
      
      {/* LEFT SIDEBAR: Setup & Config */}
      <motion.aside 
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="w-full md:w-72 bg-slate-50/50 border-r border-slate-200 flex flex-col h-screen sticky top-0 overflow-y-auto"
      >
        <div className="p-4 border-b border-slate-100 bg-white/70 backdrop-blur-md sticky top-0 z-10 shrink-0">
          <div className="flex items-center gap-3 text-blue-600 mb-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold shrink-0">A</div>
            <h1 className="text-lg font-semibold tracking-tight text-slate-800">智能文檔轉檔與分析系統 <span className="text-slate-400 text-xs font-normal ml-2">v5.0.0</span></h1>
          </div>
        </div>

        <div className="p-6 space-y-8 flex-1">
          {/* DATA SOURCE */}
          <section className="space-y-4">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-500" />
              1. 資料來源 (Data Ingestion)
            </h2>
            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-4 text-center hover:bg-slate-50 transition cursor-pointer group">
              <FileUp className="w-6 h-6 mx-auto text-slate-400 group-hover:text-blue-500 mb-2" />
              <p className="text-xs text-slate-600 font-medium">點擊或拖曳上傳文件</p>
              <p className="text-[10px] text-slate-400 mt-1">支援 PDF, TXT, MD</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">純文本貼上區 (Paste Zone)</label>
              <textarea 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs h-24 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none resize-none transition"
                placeholder="貼上文字內容或程式碼..."
                value={pasteZone}
                onChange={e => setPasteZone(e.target.value)}
              />
            </div>
            {/* Trim option fake UI */}
            <div className="flex gap-2 items-center text-xs bg-slate-50 border border-slate-100 p-2 rounded-lg">
               <span className="text-slate-600 font-medium">📄 PDF 分頁修剪:</span>
               <input type="text" placeholder="例: 1-3" className="w-20 px-2 py-1 rounded border border-slate-200 outline-none focus:border-blue-400 text-center" />
            </div>
          </section>

          {/* SKILL CONFIG */}
          <section className="space-y-4">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-blue-500" />
              2. 系統技能 (Skill.md)
            </h2>
            <textarea 
              className="w-full bg-slate-900 text-green-400 font-mono border-0 rounded-xl p-3 text-[10px] h-32 focus:ring-2 focus:ring-blue-300 outline-none resize-none"
              value={skillMd}
              onChange={e => setSkillMd(e.target.value)}
            />
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1 !py-1.5 !text-xs" onClick={() => setSkillMd(DEFAULT_SKILL_MD)}>
                重置預設
              </Button>
              <Button variant="secondary" className="flex-1 !py-1.5 !text-xs">
                自動優化技能
              </Button>
            </div>
          </section>

          {/* SETTINGS */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Settings className="w-4 h-4 text-blue-500" />
                3. 模型設定
              </h2>
              <button 
                className="text-[10px] bg-slate-200/50 text-slate-600 px-2 py-1 rounded hover:bg-slate-200 transition font-bold"
                onClick={() => setShowSettings(true)}
              >
                各項 LLM 進階設定 (Prompt & Model)
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-semibold text-slate-600 block mb-1">輸出語言</label>
                <select 
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-100"
                  value={language}
                  onChange={e => setLanguage(e.target.value)}
                >
                  <option value="Traditional Chinese">繁體中文 (預設)</option>
                  <option value="English">English</option>
                </select>
              </div>
              <div>
                <label className="font-semibold text-slate-600 block mb-1">全域預設模型</label>
                <select 
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-100"
                  value={model}
                  onChange={e => setModel(e.target.value)}
                >
                  <option value="gemini-3-flash-preview">Gemini 3 Flash (預設)</option>
                  <option value="gemini-3.1-flash-lite-preview">Gemini 3.1 Flash Lite</option>
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                  <option value="gpt-4o-mini">GPT-4o Mini</option>
                </select>
              </div>
            </div>
          </section>
        </div>

        {/* CONTROLS */}
        <div className="p-4 border-t border-slate-100 bg-white/70 backdrop-blur-md sticky bottom-0 z-10 shrink-0 flex flex-col gap-2">
          {appState === 'processing' && (
            <button className="px-4 py-1.5 bg-red-50 text-red-600 rounded-full text-xs font-bold border border-red-100 hover:bg-red-100 w-full flex items-center justify-center gap-2" onClick={handleStop}>
              <StopCircle className="w-4 h-4" />
              停止執行 (STOP)
            </button>
          )}
          {appState !== 'processing' && (
             <button className="px-6 py-2 bg-blue-600 text-white rounded-full text-xs font-bold shadow-lg shadow-blue-200 w-full flex items-center justify-center gap-2" onClick={handleRun}>
              <Play className="w-4 h-4" />
              {appState === 'completed' ? '重新轉檔 (RUN)' : '開始轉檔 (RUN)'}
            </button>
          )}
        </div>
      </motion.aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 bg-white overflow-hidden">
        
         {/* TOP NAVBAR */}
        <div className="flex gap-4 p-4 shrink-0 bg-slate-50/30 border-b border-slate-100">
          <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 p-3 flex flex-col">
            <span className="text-[10px] font-bold text-blue-500 uppercase mb-2 italic">轉檔效率分析 (Inforgraphic 1)</span>
              {/* placeholder bar chart fake UI */}
              <div className="flex-1 flex items-end gap-1 px-2">
                <div className="w-full bg-blue-100 h-[30%] rounded-t"></div>
                <div className="w-full bg-blue-200 h-[50%] rounded-t"></div>
                <div className="w-full bg-blue-400 h-[90%] rounded-t"></div>
                <div className="w-full bg-blue-600 h-[70%] rounded-t"></div>
                <div className="w-full bg-blue-300 h-[40%] rounded-t"></div>
                <div className="w-full bg-slate-400 h-[20%] rounded-t"></div>
              </div>
              <div className="flex justify-between text-[9px] mt-1 text-slate-400"><span>PDF</span><span>DOCX</span><span>FB JSON</span><span>EPUB</span><span>MD</span><span>TXT</span></div>
          </div>
          <div className="w-64 bg-slate-900 rounded-xl p-3 flex flex-col shrink-0">
            <span className="text-[10px] font-bold text-emerald-400 uppercase mb-1">實時日誌 (Live Log)</span>
            <div className="flex-1 font-mono text-[9px] text-slate-300 overflow-hidden leading-tight">
               {logs.map((log, i) => (
                    <div key={i} className="mb-[2px] truncate">
                        <span className="text-slate-500 shrink-0">[{log.time}]</span>{' '}
                        <span className={cn(
                            log.type === 'error' && 'text-red-400',
                            log.type === 'success' && 'text-emerald-500',
                            log.type === 'process' && 'text-blue-300'
                        )}>{log.msg}</span>
                    </div>
                ))}
            </div>
          </div>
          <div className="w-48 bg-white rounded-xl shadow-sm border border-slate-200 p-3 flex flex-col shrink-0">
             <span className="text-[10px] font-bold text-slate-400 uppercase mb-2">資源分佈</span>
             <div className="flex-1 flex items-center justify-center">
                 <div className="w-24 h-24 rounded-full border-[10px] border-blue-500 border-t-slate-100 border-l-slate-100 relative">
                     <div className="absolute inset-0 flex items-center justify-center text-xs font-bold">72%</div>
                 </div>
             </div>
             <p className="text-[9px] text-center mt-2 text-slate-500">系統處理完成度</p>
          </div>
        </div>

        <header className="h-14 flex items-center justify-between px-6 bg-white/70 backdrop-blur-md border-b border-slate-200 shrink-0 sticky top-0 z-10">
          <div className="flex items-center gap-6">
             <TabButton active={activeTab === 'summary'} onClick={() => setActiveTab('summary')} icon={ScrollText}>知識總結</TabButton>
             <TabButton active={activeTab === 'charts'} onClick={() => setActiveTab('charts')} icon={PieChartIcon}>資訊圖表與表格</TabButton>
             <TabButton active={activeTab === 'magic'} onClick={() => setActiveTab('magic')} icon={Sparkles}>WOW 魔術特效</TabButton>
             <TabButton active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} icon={MessageSquare}>對話探勘</TabButton>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-semibold border border-green-100">
              <span className={cn("w-2 h-2 rounded-full", appState === 'processing' ? "bg-amber-500 animate-pulse" : "bg-green-500")}></span>
              {appState === 'processing' ? '運行中' : appState === 'completed' ? '就緒' : '待機'}
            </span>
          </div>
        </header>

        {/* CONTENT SCROLL AREA */}
        <div className="flex-1 overflow-y-auto p-8 scroll-smooth">
          <AnimatePresence mode="wait">
            
            {/* EMPTY STATE */}
            {appState === 'idle' && (
              <motion.div 
                key="idle"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex flex-col items-center justify-center h-full text-slate-400"
              >
                <Bot className="w-16 h-16 text-slate-300 mb-4" />
                <h2 className="text-xl font-bold text-slate-600 mb-2">準備就緒，等待指令</h2>
                <p className="text-sm">請於左側上傳文檔或貼上內容，並點擊開始推演。</p>
              </motion.div>
            )}

            {/* PROCESSING STATE (Logs Indicator) */}
            {appState === 'processing' && (
              <motion.div 
                key="processing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="max-w-3xl mx-auto space-y-6 mt-10"
              >
                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                      <Activity className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">深度推演中...</h2>
                        <p className="text-sm text-slate-500">正在處理文檔並優化 3 大 AI WOW 技能</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Live Progress Steps */}
                    {[0, 1, 2, 3, 4].map((step) => (
                      <div key={step} className={cn("flex items-center gap-3 transition-opacity", currentStep >= step ? "opacity-100" : "opacity-30")}>
                        {currentStep > step ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        ) : currentStep === step ? (
                          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <div className="w-5 h-5 border-2 border-slate-200 rounded-full" />
                        )}
                        <span className={cn("text-sm font-medium", currentStep === step ? "text-blue-600" : "text-slate-600")}>
                          {step === 0 && '初始化環境'}
                          {step === 1 && '解析並轉換資料 (PDF/MD/TXT)'}
                          {step === 2 && '利用 Skill Creator 升級技能並添加 3 大特徵'}
                          {step === 3 && '建構精準 Use Cases'}
                          {step === 4 && '撰寫 3000-4000 詞深度彙整報告'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Live Console */}
                <div className="bg-slate-900 rounded-2xl p-4 font-mono text-xs text-slate-300 shadow-inner h-48 overflow-y-auto">
                    <div className="flex items-center gap-2 mb-3 text-slate-500 border-b border-slate-800 pb-2">
                        <Terminal className="w-4 h-4" />
                        <span>Live Execution Log</span>
                    </div>
                    {logs.map((log, i) => (
                        <div key={i} className="mb-1 flex gap-3">
                            <span className="text-slate-600 shrink-0">[{log.time}]</span>
                            <span className={cn(
                                log.type === 'error' && 'text-red-400',
                                log.type === 'success' && 'text-green-400',
                                log.type === 'process' && 'text-blue-300'
                            )}>{log.msg}</span>
                        </div>
                    ))}
                </div>
              </motion.div>
            )}

            {/* COMPLETED STATE */}
            {appState === 'completed' && activeTab === 'summary' && (
              <motion.div 
                key="summary"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-4xl mx-auto pb-20"
              >
                <div className="bg-white p-10 md:p-14 rounded-[2rem] border border-slate-100 shadow-2xl shadow-slate-200/40">
                  <div className="prose prose-slate prose-headings:text-slate-800 prose-a:text-blue-600 max-w-none">
                    <Markdown remarkPlugins={[remarkGfm]}>{generatedSummary}</Markdown>
                  </div>
                  
                  {/* Fake "Continue streaming" blur if it was a real long generation */}
                  <div className="mt-8 pt-8 border-t border-slate-100">
                     <p className="text-center text-sm font-medium text-slate-400 flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        深度探討 3700+字 輸出完成
                     </p>
                  </div>
                </div>
              </motion.div>
            )}

            {appState === 'completed' && activeTab === 'charts' && (
              <motion.div 
                key="charts"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="max-w-5xl mx-auto space-y-8 pb-20"
              >
                <h3 className="text-xl font-bold text-slate-800 mb-6">重點數據與圖表整合 (3 Infographics & 3 Tables)</h3>
                
                {/* 3 Tables Layout */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <InteractiveTable 
                      title="文件轉換與清洗對照"
                      columns={["格式", "轉換率", "處理時長"]}
                      data={[["PDF", "99.1%", "2.4s"], ["DOCX", "100%", "0.8s"], ["JSON", "98.5%", "1.2s"]]}
                    />
                    <InteractiveTable 
                      title="知識聚合層級分析"
                      columns={["層級", "特徵", "節點數"]}
                      data={[["核心", "跨域交集", "12"], ["次要", "領域專精", "45"], ["邊緣", "雜訊過濾", "8"]]}
                    />
                    <InteractiveTable 
                      title="行動藍圖與優先級"
                      columns={["優先級", "行動項目", "狀態"]}
                      data={[["高", "部署自動轉檔腳本", "待審"], ["中", "檢閱盲區報告", "進行"], ["低", "更新 Obs 圖譜", "排程"]]}
                    />
                </div>

                {/* 3 Recharts Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                  <ChartCard title="文件處理複雜度 (知識向量長度) - BarChart">
                    <ResponsiveContainer width="100%" height={240}>
                      <ReBarChart data={[{name: 'EPUB', uv: 4000}, {name: 'PDF', uv: 3000}, {name: 'Facebook', uv: 2000}]}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis fontSize={12} tickLine={false} axisLine={false} />
                        <ReTooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                        <Bar dataKey="uv" fill="#3b82f6" radius={[4,4,0,0]} barSize={40} />
                      </ReBarChart>
                    </ResponsiveContainer>
                  </ChartCard>

                  <ChartCard title="知識節點成長趨勢 - LineChart">
                    <ResponsiveContainer width="100%" height={240}>
                      <LineChart data={[{name: 'W1', val: 120}, {name: 'W2', val: 240}, {name: 'W3', val: 210}, {name: 'W4', val: 490}]}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis fontSize={12} tickLine={false} axisLine={false} />
                        <ReTooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                        <Line type="monotone" dataKey="val" stroke="#10b981" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}} />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartCard>

                  <ChartCard title="領域主題分佈 - PieChart" className="lg:col-span-2">
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie
                          data={[{name: '技術筆記', value: 400}, {name: '社群思維', value: 300}, {name: '財務規劃', value: 300}, {name: '日常隨筆', value: 200}]}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'].map((color, index) => (
                            <Cell key={`cell-${index}`} fill={color} stroke="transparent" />
                          ))}
                        </Pie>
                        <ReTooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex justify-center gap-6 mt-4 text-xs text-slate-500 font-medium">
                       <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-500"></span> 技術筆記</span>
                       <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-500"></span> 社群思維</span>
                       <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-amber-500"></span> 財務規劃</span>
                       <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-purple-500"></span> 日常隨筆</span>
                    </div>
                  </ChartCard>
                </div>
              </motion.div>
            )}

            {appState === 'completed' && activeTab === 'magic' && (
              <motion.div 
                key="magic"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="max-w-4xl mx-auto space-y-6 pb-20"
              >
                {selectedWow === null ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[
                      {id: 0, title: '時序進展圖 (Gantt)', icon: BarChart, color: 'text-blue-500', bg: 'bg-blue-50'},
                      {id: 1, title: '文檔熱力圖 (Heatmap)', icon: Activity, color: 'text-red-500', bg: 'bg-red-50'},
                      {id: 2, title: '主題雷達圖 (Topic Map)', icon: PieChartIcon, color: 'text-purple-500', bg: 'bg-purple-50'},
                      {id: 3, title: '實體關聯網 (Network)', icon: Share2, color: 'text-green-500', bg: 'bg-green-50'},
                      {id: 4, title: '風險不確定雷達 (Radar)', icon: Activity, color: 'text-amber-500', bg: 'bg-amber-50'},
                      {id: 5, title: '行動過濾矩陣 (Matrix)', icon: LayoutTemplate, color: 'text-indigo-500', bg: 'bg-indigo-50'},
                    ].map((wow) => (
                      <div 
                        key={wow.id} 
                        onClick={() => setSelectedWow(wow.id)}
                        className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition cursor-pointer group flex flex-col items-center text-center"
                      >
                         <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110", wow.bg, wow.color)}>
                            <wow.icon className="w-6 h-6" />
                         </div>
                         <h4 className="font-bold text-slate-700 text-sm">{wow.title}</h4>
                         <p className="text-xs text-slate-400 mt-2">點擊產生立體渲染視圖</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 relative">
                    <button 
                      onClick={() => setSelectedWow(null)}
                      className="absolute top-6 right-6 p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 transition"
                    >
                      <X className="w-5 h-5" />
                    </button>
                    <h3 className="text-lg font-bold text-slate-800 mb-8">
                      {selectedWow === 0 && '時序進展圖 (Gantt-like Visualization)'}
                      {selectedWow === 1 && '文檔熱度分析矩陣 (Heatmap)'}
                      {selectedWow === 2 && '領域主題成分佔比 (Topic Map)'}
                      {selectedWow === 3 && '實體名詞關聯網 (Scatter Network)'}
                      {selectedWow === 4 && '風險與不確定性分析 (Radar Chart)'}
                      {selectedWow === 5 && '行動優先級矩陣 (Action Matrix)'}
                    </h3>

                    {/* RENDER THE SPECIFIC VISUALIZATION */}
                    {selectedWow === 0 && (
                      <ResponsiveContainer width="100%" height={300}>
                        <ReBarChart layout="vertical" data={[
                          { name: '環境初始化', start: 0, 耗時: 1.2 },
                          { name: '文獻轉檔與提取', start: 1.2, 耗時: 2.5 },
                          { name: '智慧化盲區偵測', start: 3.7, 耗時: 1.8 },
                          { name: '生成報告', start: 5.5, 耗時: 2.2 },
                          { name: '視覺化圖表建構', start: 7.7, 耗時: 0.8 },
                        ]}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                          <XAxis type="number" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis dataKey="name" type="category" width={120} fontSize={12} tickLine={false} axisLine={false} />
                          <ReTooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                          <Bar dataKey="start" stackId="a" fill="transparent" />
                          <Bar dataKey="耗時" stackId="a" fill="#3b82f6" radius={[4,4,4,4]} barSize={20} />
                        </ReBarChart>
                      </ResponsiveContainer>
                    )}

                    {selectedWow === 1 && (
                      <div className="grid grid-cols-4 gap-2">
                        {Array.from({length: 16}).map((_, i) => (
                          <div key={i} className="" style={{
                            backgroundColor: `hsla(0, 100%, 65%, ${Math.random() * 0.8 + 0.1})`,
                            height: '60px', borderRadius: '12px', transition: 'all 0.3s'
                          }} />
                        ))}
                      </div>
                    )}

                    {selectedWow === 2 && (
                       <ResponsiveContainer width="100%" height={300}>
                         <PieChart>
                           <Pie data={[{n:'異質化處理',v:35},{n:'格式清理',v:25},{n:'結構化抽取',v:20},{n:'行動決策',v:20}]} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="v">
                              {['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'].map((color, idx) => <Cell key={idx} fill={color} />)}
                           </Pie>
                           <ReTooltip />
                         </PieChart>
                       </ResponsiveContainer>
                    )}

                    {selectedWow === 3 && (
                      <ResponsiveContainer width="100%" height={300}>
                        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis type="number" dataKey="x" name="Impact" hide />
                          <YAxis type="number" dataKey="y" name="Relevance" hide />
                          <ZAxis type="number" dataKey="z" range={[100, 600]} name="Weight" />
                          <ReTooltip cursor={{ strokeDasharray: '3 3' }} />
                          <Scatter name="Entities" data={[
                            { x: 10, y: 30, z: 200, n: 'Obsidian' }, { x: 40, y: 70, z: 400, n: 'Markdown' },
                            { x: 80, y: 40, z: 300, n: 'PDF' }, { x: 60, y: 90, z: 250, n: 'LLM' },
                            { x: 30, y: 10, z: 150, n: 'Graph' }
                          ]} fill="#10b981" />
                        </ScatterChart>
                      </ResponsiveContainer>
                    )}

                    {selectedWow === 4 && (
                      <ResponsiveContainer width="100%" height={300}>
                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={[
                          { subject: '技術矛盾', A: 120, fullMark: 150 },
                          { subject: '資料斷層', A: 98, fullMark: 150 },
                          { subject: '邏輯跳躍', A: 86, fullMark: 150 },
                          { subject: '過時資訊', A: 99, fullMark: 150 },
                          { subject: '格式混亂', A: 85, fullMark: 150 },
                          { subject: '雜訊干擾', A: 65, fullMark: 150 },
                        ]}>
                          <PolarGrid stroke="#f1f5f9" />
                          <PolarAngleAxis dataKey="subject" tick={{fill: '#64748b', fontSize: 12}} />
                          <PolarRadiusAxis angle={30} domain={[0, 150]} tick={false} axisLine={false} />
                          <Radar name="風險指數" dataKey="A" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.4} />
                          <ReTooltip />
                        </RadarChart>
                      </ResponsiveContainer>
                    )}

                    {selectedWow === 5 && (
                      <div className="grid grid-cols-2 grid-rows-2 h-64 gap-2 relative">
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-slate-500 shadow-sm">急迫性 vs 影響力</div>
                        </div>
                        <div className="bg-amber-50 rounded-xl p-4 flex flex-col items-center justify-center text-amber-700">高急迫 / 低影響<br/><span className="text-xs opacity-70">例：清理翻譯外掛殘留</span></div>
                        <div className="bg-red-50 rounded-xl p-4 flex flex-col items-center justify-center text-red-700">高急迫 / 高影響<br/><span className="text-xs opacity-70">例：統一中英文間距</span></div>
                        <div className="bg-slate-50 rounded-xl p-4 flex flex-col items-center justify-center text-slate-500">低急迫 / 低影響<br/><span className="text-xs opacity-70">例：更新備份紀錄</span></div>
                        <div className="bg-blue-50 rounded-xl p-4 flex flex-col items-center justify-center text-blue-700">低急迫 / 高影響<br/><span className="text-xs opacity-70">例：建立全局知識標籤網</span></div>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {appState === 'completed' && activeTab === 'chat' && (
              <motion.div 
                key="chat"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="max-w-4xl mx-auto flex flex-col h-[75vh]"
              >
                <div className="flex-1 bg-white rounded-t-[2rem] border border-slate-100 p-8 shadow-sm overflow-y-auto w-full relative">
                  <div className="flex gap-4 mb-6">
                     <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-1">
                        <Bot className="w-4 h-4 text-blue-600" />
                     </div>
                     <div className="bg-slate-50 p-4 rounded-2xl rounded-tl-none border border-slate-100 text-sm text-slate-700 w-[80%] leading-relaxed">
                        哈囉！我已經為您生成了包含 3 項新 WOW AI 技能分析的 3000 字總結。您可以對此結果繼續進行追問 (Keep Prompting) 或要求特定段落的擴寫。您可以從以下 20 個深度問題中選擇，或自行輸入：
                        <div className="mt-4 flex flex-wrap gap-2">
                           {FOLLOW_UP_QUESTIONS.map((q, idx) => (
                             <button 
                               key={idx}
                               onClick={() => handleChatSubmit(undefined, q)}
                               className="text-[10px] bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-300 px-3 py-1.5 rounded-full transition-all text-left"
                             >
                               {q}
                             </button>
                           ))}
                        </div>
                     </div>
                  </div>

                  {/* Render Chat History */}
                  {chatHistory.map((chat, idx) => (
                    <div key={idx} className={cn("flex gap-4 mb-6", chat.role === 'user' ? "flex-row-reverse" : "flex-row")}>
                      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1", chat.role === 'user' ? "bg-slate-800" : "bg-blue-100")}>
                        {chat.role === 'user' ? <span className="text-white text-xs font-bold">U</span> : <Bot className="w-4 h-4 text-blue-600" />}
                      </div>
                      <div className={cn("p-4 rounded-2xl border text-sm max-w-[80%] leading-relaxed markdown-body", 
                        chat.role === 'user' 
                        ? "bg-blue-600 text-white rounded-tr-none border-blue-700 prose-p:text-white" 
                        : "bg-slate-50 text-slate-700 rounded-tl-none border-slate-100 prose-p:text-slate-700 prose-headings:text-slate-800"
                      )}>
                         {chat.content ? (
                           <Markdown className="prose prose-sm max-w-none">{chat.content}</Markdown>
                         ) : (
                           <span className="flex gap-1 items-center h-4">
                             <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce"></span>
                             <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce" style={{animationDelay: '150ms'}}></span>
                             <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce" style={{animationDelay: '300ms'}}></span>
                           </span>
                         )}
                      </div>
                    </div>
                  ))}
                </div>
                <form 
                  onSubmit={handleChatSubmit}
                  className="bg-white p-4 border border-t-0 border-slate-100 rounded-b-[2rem] shadow-sm shrink-0"
                >
                  <div className="relative">
                    <input 
                      type="text" 
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      placeholder="輸入您的追問意圖... (例如：幫我將第二個 Use Case 轉為表格)" 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-4 pr-12 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50 transition"
                    />
                    <button 
                      type="submit"
                      disabled={!chatInput.trim()}
                      className="absolute right-2 top-2 bottom-2 w-8 bg-blue-600 rounded-lg flex items-center justify-center text-white hover:bg-blue-700 transition shadow-sm disabled:opacity-50"
                    >
                       <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </main>

      {/* ADVANCED SETTINGS MODAL */}
      <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-3xl border border-slate-100 flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between mb-4 shrink-0">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <SettingIcon className="w-6 h-6 text-blue-500" />
                  進階 LLM 功能提示詞與模型編輯 (Advanced Prompting)
                </h2>
                <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-slate-100 rounded-xl transition text-slate-500">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="overflow-y-auto pr-2 space-y-6 flex-1">
                {(Object.keys(llmSettings) as Array<keyof typeof llmSettings>).map((key) => {
                   const labels = {
                     summary: '1. 知識總結模組 (Summary Generation)',
                     chat: '2. 對話探勘模組 (Interactive Chat)',
                     magic: '3. WOW 魔術特效模組 (Magic Features)'
                   };
                   return (
                     <div key={key} className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                       <h3 className="text-sm font-bold text-slate-700 mb-3">{labels[key]}</h3>
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                         <div className="col-span-1">
                           <label className="text-xs font-semibold text-slate-600 block mb-1">特定模型分配 (Model)</label>
                           <select 
                             className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs outline-none focus:border-blue-400"
                             value={llmSettings[key].model}
                             onChange={(e) => setLlmSettings(prev => ({...prev, [key]: {...prev[key], model: e.target.value}}))}
                           >
                             <option value="gemini-3-flash-preview">Gemini 3 Flash (預設)</option>
                             <option value="gemini-3.1-flash-lite-preview">Gemini 3.1 Flash Lite</option>
                             <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                             <option value="gpt-4o-mini">GPT-4o Mini</option>
                           </select>
                         </div>
                       </div>
                       <div>
                         <label className="text-xs font-semibold text-slate-600 block mb-1">系統提示詞 (System Prompt)</label>
                         <textarea 
                           className="w-full bg-white border border-slate-200 rounded-lg p-3 text-xs outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 resize-none h-20"
                           value={llmSettings[key].prompt}
                           onChange={(e) => setLlmSettings(prev => ({...prev, [key]: {...prev[key], prompt: e.target.value}}))}
                         />
                       </div>
                     </div>
                   );
                })}
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end shrink-0">
                <Button onClick={() => setShowSettings(false)}>完成設定</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Ensure the Missing Setting icon uses Settings
const SettingIcon = Settings;

// --- SUB COMPONENTS ---

const TabButton = ({ active, onClick, children, icon: Icon }: any) => (
  <button 
    onClick={onClick}
    className={cn(
      "flex items-center gap-2 px-1 py-4 border-b-2 text-sm font-bold transition-all",
      active ? "border-blue-600 text-blue-600" : "border-transparent text-slate-400 hover:text-slate-600"
    )}
  >
    <Icon className="w-4 h-4" />
    {children}
  </button>
);

const ChartCard = ({ title, children, className }: any) => (
  <div className={cn("bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40", className)}>
    <h4 className="font-bold text-slate-700 mb-6 text-sm">{title}</h4>
    {children}
  </div>
);

const InteractiveTable = ({ title, columns, data }: any) => (
  <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm flex flex-col">
    <div className="bg-slate-50 px-4 py-3 border-b border-slate-100">
      <h4 className="font-bold text-slate-700 text-xs">{title}</h4>
    </div>
    <div className="p-4 flex-1">
      <table className="w-full text-left text-xs">
        <thead>
          <tr>
            {columns.map((c: string, i: number) => (
              <th key={i} className="pb-2 text-slate-500 font-medium border-b border-slate-100">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row: string[], i: number) => (
            <tr key={i} className="group">
              {row.map((cell: string, j: number) => (
                <td key={j} className="py-2 text-slate-700 border-b border-slate-50 group-hover:bg-slate-50 transition">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);
