import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  BookOpen,
  Brain,
  Clock,
  ChevronRight,
  ChevronLeft,
  Check,
  AlertCircle,
  RefreshCw,
  Bookmark,
  Trash2,
  Download,
  Upload,
  Copy,
  ExternalLink,
  HelpCircle,
  GraduationCap,
  ChevronDown,
  AlignLeft,
  Info,
  Menu,
  X,
  Search,
  CheckCircle2,
  FileText
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { StudySuite, SavedGuide, OutlineItem } from "./types";
import { demoStudyGuide } from "./data";

export default function App() {
  // Input Stage State
  const [url, setUrl] = useState<string>("");
  const [inputText, setInputText] = useState<string>("");
  const [studyStyle, setStudyStyle] = useState<string>("standard");
  const [detailLevel, setDetailLevel] = useState<string>("comprehensive");

  // Loaders & Workflow State
  const [isScraping, setIsScraping] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active Output View
  const [activeTab, setActiveTab] = useState<"guide" | "cards" | "quiz" | "feynman">("guide");
  const [currentSuite, setCurrentSuite] = useState<StudySuite>(demoStudyGuide);
  const [activeId, setActiveId] = useState<string>("demo");

  // Library / Local History
  const [savedGuides, setSavedGuides] = useState<SavedGuide[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  // Active recall stats
  const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);
  const [isCardFlipped, setIsCardFlipped] = useState<boolean>(false);
  const [cardsLearned, setCardsLearned] = useState<{ [key: number]: boolean }>({});

  // Scored Quiz State
  const [quizAnswers, setQuizAnswers] = useState<{ [key: string]: number }>({});
  const [quizSubmitted, setQuizSubmitted] = useState<boolean>(false);

  // Outline display options
  const [vocabSearch, setVocabSearch] = useState<string>("");
  const [collapsedOutlineSections, setCollapsedOutlineSections] = useState<{ [key: string]: boolean }>({});
  const [notification, setNotification] = useState<string | null>(null);

  // Tooltips / Help state
  const [showFeynmanHelp, setShowFeynmanHelp] = useState<boolean>(false);

  // Loading quotes pool
  const loadingTips = [
    "Distilling complex webpage content into bite-sized highlights...",
    "Scanning headers and paragraphs to formulate logical outline steps...",
    "Drafting active recall flashcards with customized conceptual hints...",
    "Synthesizing multiple-choice mock questions to challenge your retention...",
    "Translating complex jargon into simple, real-world metaphors (Feynman technique)..."
  ];

  // Drag and drop events
  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false);

  // Load Saved Library from LocalStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("web_study_notes_guides");
      if (stored) {
        const parsed = JSON.parse(stored) as SavedGuide[];
        setSavedGuides(parsed);
      }
    } catch (e) {
      console.error("Failed to load local study guides", e);
    }
  }, []);

  // Set up random tip cycle during generations
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isGenerating) {
      let index = 0;
      setStatusMessage(loadingTips[0]);
      interval = setInterval(() => {
        index = (index + 1) % loadingTips.length;
        setStatusMessage(loadingTips[index]);
      }, 3500);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  // Toast notification timing
  const triggerToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // 1. Scrape Webpage URL Action
  const handleScrape = async () => {
    if (!url) {
      setErrorMessage("Please enter a valid webpage URL.");
      return;
    }
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      setErrorMessage("URLs must start with http:// or https://");
      return;
    }

    setIsScraping(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to parse the page content.");
      }

      setInputText(data.content);
      triggerToast(`Successfully loaded text from "${data.title}"! Ready to generate study suite.`);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to fetch webpage safely. Standard anti-bot systems might have blocked our automated browser. Please manually copy and paste the main text content below!");
    } finally {
      setIsScraping(false);
    }
  };

  // 2. Generate Full Educational Study Suite from active input text
  const handleGenerateSuite = async () => {
    if (!inputText || inputText.trim().length < 50) {
      setErrorMessage("Input text is too brief to generate study materials. Please write or scrape at least a few paragraphs of content.");
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);
    setQuizAnswers({});
    setQuizSubmitted(false);
    setCurrentCardIndex(0);
    setIsCardFlipped(false);
    setCardsLearned({});

    try {
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: inputText,
          style: studyStyle,
          level: detailLevel,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate study guides. Check console.");
      }

      const generatedSuite: StudySuite = data;
      setCurrentSuite(generatedSuite);
      setActiveTab("guide");
      setActiveId(""); // state that it's generated but not yet permanently in library until clicked "save"

      triggerToast("Study suite successfully synthesized! Try the Flashcards & Practice Quiz now.");
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred during synthesis. Verify that your server is active.");
    } finally {
      setIsGenerating(false);
    }
  };

  // 3. Save Active Study Guide to localStorage Library
  const handleSaveToLibrary = () => {
    if (!currentSuite) return;

    // Avoid duplicates if already saved with active ID
    if (activeId && activeId !== "demo" && savedGuides.some((g) => g.id === activeId)) {
      triggerToast("This study guide is already securely saved in your browser storage.");
      return;
    }

    const newId = "guide_" + Date.now();
    const newGuide: SavedGuide = {
      id: newId,
      timestamp: new Date().toLocaleString(),
      url: url || undefined,
      textSnippet: inputText.substring(0, 120),
      style: studyStyle,
      level: detailLevel,
      data: currentSuite,
    };

    const updated = [newGuide, ...savedGuides];
    setSavedGuides(updated);
    localStorage.setItem("web_study_notes_guides", JSON.stringify(updated));
    setActiveId(newId);
    triggerToast(`"${currentSuite.title}" saved to local Study Library!`);
  };

  // 4. Load Guide from Historical Library
  const handleLoadGuide = (guide: SavedGuide) => {
    setCurrentSuite(guide.data);
    setInputText(guide.data.description);
    setUrl(guide.url || "");
    setStudyStyle(guide.style);
    setDetailLevel(guide.level);
    setActiveId(guide.id);

    // Reset components to fresh state
    setQuizAnswers({});
    setQuizSubmitted(false);
    setCurrentCardIndex(0);
    setIsCardFlipped(false);
    setCardsLearned({});
    setActiveTab("guide");
    setIsSidebarOpen(false);

    triggerToast(`Loaded study guide: "${guide.data.title}"`);
  };

  // 5. Delete specific guide from Library
  const handleDeleteGuide = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = savedGuides.filter((g) => g.id !== id);
    setSavedGuides(filtered);
    localStorage.setItem("web_study_notes_guides", JSON.stringify(filtered));

    if (activeId === id) {
      setActiveId("demo");
      setCurrentSuite(demoStudyGuide);
    }
    triggerToast("Study guide removed from historical archives.");
  };

  // 6. Handle File Client-side Drop and Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        // Strip HTML tag wrapper context if file was .html
        if (file.name.endsWith(".html") || file.name.endsWith(".htm")) {
          const stripped = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
          setInputText(stripped);
        } else {
          setInputText(text);
        }
        triggerToast(`Loaded ${file.name} context! Ready to summarize.`);
      }
    };
    reader.readAsText(file);
  };

  // File Drag & Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(true);
  };

  const handleDragLeave = () => {
    setIsDraggingFile(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          if (file.name.endsWith(".html") || file.name.endsWith(".htm")) {
            const stripped = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
            setInputText(stripped);
          } else {
            setInputText(text);
          }
          triggerToast(`Dropped & loaded "${file.name}"!`);
        }
      };
      reader.readAsText(file);
    }
  };

  // 7. Dynamic Markdown Exporter
  const handleExportMarkdown = () => {
    const s = currentSuite;
    if (!s) return;

    let content = `# Study Sheet: ${s.title}\n\n`;
    content += `> ${s.description}\n\n`;

    content += `## 💡 Key Study Takeaways\n`;
    s.keyTakeaways.forEach((k) => {
      content += `- ${k}\n`;
    });
    content += `\n`;

    content += `## 📚 Vocabulary Glossaries & Core Terminology\n`;
    s.terminology.forEach((t) => {
      content += `### ${t.term}\n- **Definition**: ${t.definition}\n- **Context**: *${t.context}*\n\n`;
    });

    content += `## 📖 Multi-tier Study Outline\n`;
    s.outline.forEach((o) => {
      content += `### ${o.heading}\n`;
      o.keyPoints.forEach((p) => {
        content += `- ${p}\n`;
      });
      if (o.subtopics) {
        o.subtopics.forEach((sub) => {
          content += `  - **${sub.heading}**\n`;
          sub.keyPoints.forEach((subPt) => {
            content += `    - ${subPt}\n`;
          });
        });
      }
      content += `\n`;
    });

    content += `## 💡 Feynman Simplicity Analogy\n> ${s.feynmanExplanation}\n\n`;

    content += `## 🃏 Practice Active Recall Cards\n`;
    s.flashcards.forEach((card, idx) => {
      content += `${idx + 1}. **Question**: ${card.question}\n   **Answer**: ${card.answer}\n\n`;
    });

    content += `## 📝 Standard Mock Exam Quiz\n`;
    s.quiz.forEach((q, idx) => {
      content += `${idx + 1}. **Q**: ${q.question}\n`;
      q.options.forEach((opt, oIdx) => {
        content += `   [${oIdx === q.correctAnswerIndex ? "X" : " "}] ${opt}\n`;
      });
      content += `   *Explanation*: ${q.explanation}\n\n`;
    });

    const blob = new Blob([content], { type: "text/markdown;charset=utf-8;" });
    const localUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = localUrl;
    link.setAttribute("download", `${s.title.toLowerCase().replace(/[^a-z0-9]+/g, "_")}_study_suite.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast("Downloaded markdown study guide securely!");
  };

  // Vocab filtering helper
  const filteredVocab = currentSuite.terminology.filter((t) =>
    t.term.toLowerCase().includes(vocabSearch.toLowerCase()) ||
    t.definition.toLowerCase().includes(vocabSearch.toLowerCase())
  );

  // Search local Library saved guides
  const filteredLibrary = savedGuides.filter(
    (g) =>
      g.data.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.data.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Outline collapser toggle
  const toggleSection = (heading: string) => {
    setCollapsedOutlineSections((prev) => ({
      ...prev,
      [heading]: !prev[heading],
    }));
  };

  // Flashcards state helpers
  const toggleLearned = (index: number) => {
    setCardsLearned((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const totalCards = currentSuite.flashcards.length;
  const countLearned = Object.values(cardsLearned).filter(Boolean).length;
  const scorePercent = totalCards > 0 ? Math.round((countLearned / totalCards) * 100) : 0;

  // Multiple Choice Quiz Evaluators
  const selectQuizOption = (questionId: string, optionIndex: number) => {
    if (quizSubmitted) return; // locked after completion
    setQuizAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex,
    }));
  };

  const handleGradeQuiz = () => {
    setQuizSubmitted(true);
    triggerToast("Your practice exam was successfully graded! Review your answers below.");
  };

  const getQuizGradeStatus = () => {
    let rightAnswers = 0;
    currentSuite.quiz.forEach((q) => {
      if (quizAnswers[q.id] === q.correctAnswerIndex) {
        rightAnswers++;
      }
    });

    const percentage = Math.round((rightAnswers / currentSuite.quiz.length) * 100);
    let title = "Needs Review";
    let color = "text-amber-600";
    if (percentage >= 90) { type: "excellent"; title = "A+ Academic Genius!"; color = "text-emerald-600"; }
    else if (percentage >= 70) { type: "great"; title = "Excellent Passing Grade!"; color = "text-indigo-600"; }

    return { rightAnswers, percentage, title, color };
  };

  return (
    <div className="min-h-screen bg-[#0c0d10] font-sans text-[#e2e2e2] antialiased flex flex-col selection:bg-[#c5a47e]/20">
      
      {/* Toast Alert bar */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-[#0a0b0d] text-[#e2e2e2] text-sm px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-white/10"
          >
            <CheckCircle2 className="w-5 h-5 text-[#c5a47e] shrink-0" />
            <span className="font-medium">{notification}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Header navigation block */}
      <header className="sticky top-0 z-40 bg-[#0f1115] border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 hover:bg-white/5 rounded-lg text-white/80 transition"
            title="Browse Study Guide Library"
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#c5a47e] text-[#0c0d10] rounded-lg">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-serif italic text-lg md:text-xl text-white/90 leading-tight tracking-wide">
                Exam Prep & Web Study Guide
              </h1>
              <p className="text-[10px] uppercase tracking-widest text-[#c5a47e] font-mono font-medium">Power study tools with Gemini-3.5-Flash</p>
            </div>
          </div>
        </div>

        {/* Global Library Shortcut details */}
        <div className="flex items-center gap-3">
          <span className="hidden md:flex items-center gap-1.5 text-xs bg-white/5 hover:bg-white/10 transition text-white/80 border border-white/5 font-medium px-3 py-1.5 rounded-full cursor-pointer" onClick={() => setIsSidebarOpen(true)}>
            <Bookmark className="w-3.5 h-3.5 text-[#c5a47e]" />
            <span>Library ({savedGuides.length})</span>
          </span>
          
          <button
            onClick={() => {
              setCurrentSuite(demoStudyGuide);
              setInputText("");
              setUrl("");
              setActiveId("demo");
              triggerToast("Loaded demonstration template! Try entering a URL to start your own.");
            }}
            className="flex items-center gap-1.5 text-xs border border-white/10 hover:bg-white/5 text-white/90 px-3 py-1.5 rounded-full transition font-semibold"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Load Demo</span>
          </button>
        </div>
      </header>

      {/* Slide-out Study Library Side panel */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
             <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black z-50 cursor-pointer"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="fixed inset-y-0 left-0 w-80 bg-[#0a0b0d] shadow-[0_0_50px_rgba(0,0,0,0.8)] z-50 flex flex-col border-r border-white/5"
            >
              <div className="p-5 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bookmark className="w-5 h-5 text-[#c5a47e]" />
                  <h3 className="font-serif italic text-lg text-white/90">Study Archives</h3>
                </div>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-1 text-white/40 hover:text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Saved Library list */}
              <div className="p-4 border-b border-white/5">
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white/30">
                    <Search className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search guides in history..."
                    className="w-full pl-9 pr-4 py-2 bg-[#13151b] border border-white/10 rounded-lg text-sm text-[#e2e2e2] focus:outline-none focus:border-[#c5a47e] placeholder-white/30 transition"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {/* Default static demo guide card */}
                <div
                  onClick={() => {
                    setCurrentSuite(demoStudyGuide);
                    setActiveId("demo");
                    setActiveTab("guide");
                    setIsSidebarOpen(false);
                    triggerToast("Loaded demonstration study guide!");
                  }}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition flex flex-col gap-1.5 ${
                    activeId === "demo"
                      ? "border-[#c5a47e] bg-white/5 shadow-inner"
                      : "border-white/5 hover:bg-white/5 bg-[#16181d]/10"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#c5a47e]">Sample Guide</span>
                    <span className="text-[10px] text-white/30 font-mono">2026-06-22</span>
                  </div>
                  <h4 className="font-serif italic text-white/90 text-sm">{demoStudyGuide.title}</h4>
                  <p className="text-xs text-white/50 line-clamp-2 leading-relaxed">{demoStudyGuide.description}</p>
                </div>

                {filteredLibrary.map((guide) => (
                  <div
                    key={guide.id}
                    onClick={() => handleLoadGuide(guide)}
                    className={`group p-3 rounded-xl border text-left cursor-pointer transition flex flex-col gap-1.5 ${
                      activeId === guide.id
                        ? "border-[#c5a47e] bg-white/5 shadow-inner"
                        : "border-white/5 hover:bg-white/5 bg-[#16181d]/20"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-[9px] text-white/40 font-mono uppercase tracking-wider bg-white/5 px-2 py-0.5 rounded-full capitalize">
                        {guide.level} • {guide.style}
                      </span>
                      <button
                        onClick={(e) => handleDeleteGuide(guide.id, e)}
                        className="p-1 text-white/30 hover:text-red-400 rounded transition opacity-0 group-hover:opacity-100"
                        title="Delete archive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <h4 className="font-serif italic text-white/90 text-sm line-clamp-1">{guide.data.title}</h4>
                    <p className="text-xs text-white/50 line-clamp-2 leading-relaxed">{guide.data.description}</p>
                    <span className="text-[9px] text-white/30 self-end font-mono mt-1">{guide.timestamp}</span>
                  </div>
                ))}

                {filteredLibrary.length === 0 && searchQuery !== "" && (
                  <div className="p-8 text-center text-white/30">
                    <Clock className="w-8 h-8 mx-auto mb-2 opacity-50 text-[#c5a47e]" />
                    <p className="text-xs">No matching archives found for "{searchQuery}"</p>
                  </div>
                )}
              </div>

              <div className="p-4 bg-[#07080a] border-t border-white/5">
                <p className="text-[10px] text-white/40 leading-relaxed text-center font-mono">
                  Your guides are saved offline inside your local browser. Clearing browser storage deletes them.
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Container Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Input controls, loaders, and scraper */}
        <section className="lg:col-span-5 flex flex-col gap-5 h-fit">
          
          <div className="bg-[#0f1115] border border-white/10 rounded-2xl h-fit shadow-xl overflow-hidden p-5 flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
              <AlignLeft className="w-5 h-5 text-[#c5a47e]" />
              <h2 className="font-serif italic text-white/90 text-base">Study Content Input Source</h2>
            </div>

            {/* URL Fetch Scraper */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-white/50 uppercase tracking-wider font-mono">Option 1: Scrape from Webpage URL</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white/30">
                    <ExternalLink className="w-4 h-4 text-[#c5a47e]" />
                  </span>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://en.wikipedia.org/wiki/Spaced_repetition"
                    className="w-full pl-9 pr-3 py-2 bg-[#0c0d10] border border-white/10 rounded-xl text-sm text-white/90 outline-none focus:border-[#c5a47e] transition"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleScrape}
                  disabled={isScraping || !url}
                  className="bg-[#c5a47e]/10 text-[#c5a47e] hover:bg-[#c5a47e]/20 border border-[#c5a47e]/30 disabled:opacity-40 font-semibold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5"
                >
                  {isScraping ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Fetching...</span>
                    </>
                  ) : (
                    <span>Scrape</span>
                  )}
                </button>
              </div>
              <p className="text-[10px] text-white/40 leading-normal">
                Crawls and extracts only main textual definitions, excluding headers/ads.
              </p>
            </div>

            {/* Paste Box or Local file drop */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-white/50 uppercase tracking-wider font-mono">Option 2: Raw Text or HTML Document</label>
                
                {/* Micro clean action */}
                {inputText && (
                  <button
                    onClick={() => setInputText("")}
                    className="text-[10.5px] font-mono font-semibold text-red-400 hover:underline"
                  >
                    Clear Box
                  </button>
                )}
              </div>

              {/* Drag and drop overlay area */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-xl transition-all duration-300 p-1 ${
                  isDraggingFile
                    ? "border-[#c5a47e] bg-[#c5a47e]/5"
                    : "border-white/10 hover:border-white/20 bg-[#0c0d10]/40"
                }`}
              >
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Paste textbook text, article paragraphs, lecture scripts, html text here directly..."
                  rows={9}
                  className="w-full resize-y p-3 bg-transparent text-sm text-white/95 focus:outline-none placeholder-white/20 leading-relaxed border-none rounded-lg"
                />

                {/* Drag file helper bar inside textarea */}
                <div className="p-2 border-t border-white/5 flex justify-between items-center bg-[#111317]/80 rounded-b-lg">
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#c5a47e]" />
                    <span className="text-[10.5px] font-medium text-white/40 font-mono">
                      {inputText ? `${inputText.split(/\s+/).filter(Boolean).length} words parsed` : "Empty canvas"}
                    </span>
                  </div>

                  <label className="cursor-pointer flex items-center gap-1 text-[10.5px] font-semibold text-[#c5a47e] hover:text-[#d6ba99] transition">
                    <Upload className="w-3 h-3" />
                    <span>Upload .txt / .html</span>
                    <input
                      type="file"
                      accept=".txt,.html,.htm,.md"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
              
              <p className="text-[10px] text-white/30 font-mono">
                Tip: Drag and drop files directly onto this textarea. Works great offline.
              </p>
            </div>

            {/* Custom parameters choice */}
            <div className="grid grid-cols-2 gap-3 mt-1.5 pt-2 border-t border-white/5">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-white/40 font-mono">Study Style</label>
                <select
                  value={studyStyle}
                  onChange={(e) => setStudyStyle(e.target.value)}
                  className="bg-[#0c0d10] border border-white/10 rounded-lg py-1.5 px-2.5 text-xs text-white/90 font-medium focus:outline-none focus:border-[#c5a47e] hover:border-white/20 transition"
                >
                  <option value="standard" className="bg-[#0f1115]">Standard Academic</option>
                  <option value="feynman" className="bg-[#0f1115]">Feynman Analogy Heavy</option>
                  <option value="cornell" className="bg-[#0f1115]">Cornell-Style Q&A</option>
                  <option value="exam-prep" className="bg-[#0f1115]">Exam-focused Recall</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-white/40 font-mono">Detail Density</label>
                <select
                  value={detailLevel}
                  onChange={(e) => setDetailLevel(e.target.value)}
                  className="bg-[#0c0d10] border border-[#white]/10 rounded-lg py-1.5 px-2.5 text-xs text-white/90 font-medium focus:outline-none focus:border-[#c5a47e] hover:border-white/20 transition"
                >
                  <option value="comprehensive" className="bg-[#0f1115]">Comprehensive Prep</option>
                  <option value="summary" className="bg-[#0f1115]">Targeted Outline</option>
                  <option value="overview" className="bg-[#0f1115]">Ultra High-Level</option>
                </select>
              </div>
            </div>

            {/* General runtime errors */}
            {errorMessage && (
              <div className="p-3 bg-red-950/20 border border-red-500/30 text-red-300 text-xs rounded-xl flex gap-2 items-start mt-1">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#c5a47e]" />
                <span className="leading-snug">{errorMessage}</span>
              </div>
            )}

            {/* Synthesis trigger CTA */}
            <button
              onClick={handleGenerateSuite}
              disabled={isGenerating || isScraping || !inputText}
              className="w-full bg-[#c5a47e] hover:bg-[#d6ba99] text-[#0c0d10] font-bold tracking-widest text-xs uppercase py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition duration-200 active:scale-[0.98] disabled:opacity-40 shadow-lg shadow-[#c5a47e]/5"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Generating Study Deck...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-[#0c0d10] fill-current" />
                  <span>Synthesize Study Prep</span>
                </>
              )}
            </button>
          </div>

          {/* Quick study tips card */}
          <div className="bg-[#0f1115] border border-white/5 rounded-2xl shadow-inner text-white/80 p-5 flex flex-col gap-3">
            <div className="flex items-center gap-1.5 text-[#c5a47e]">
              <Brain className="w-4 h-4" />
              <h4 className="text-xs font-semibold uppercase tracking-wider font-mono">How to Utilize This Suite</h4>
            </div>
            <ul className="text-[11.5px] leading-relaxed space-y-2 text-white/60">
              <li className="flex items-start gap-1.5">
                <span className="text-[#c5a47e] font-bold">&#8226;</span>
                <span>First, browse the <strong>Outline</strong> and <strong>Terminology</strong> tabs to anchor the core conceptual map in your brain.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-[#c5a47e] font-bold">&#8226;</span>
                <span>Struggle with abstract rules? Toggle the <strong>Feynman Explanation</strong> to grasp a simple metaphor.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-[#c5a47e] font-bold">&#8226;</span>
                <span>Attempt the <strong>Flashcards</strong>. Hint: Always formulate the answer in your mind or say it out loud <em>before</em> clicking to flip.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-[#c5a47e] font-bold">&#8226;</span>
                <span>Confirm comprehension by completing the <strong>Mock Exam</strong>. If you make errors, read the detailed rationales.</span>
              </li>
            </ul>
          </div>
        </section>

        {/* RIGHT COLUMN: The Interactive Learning Dashboard (Visual Output) */}
        <section className="lg:col-span-7 flex flex-col gap-5">
          
          {/* Active generation rotating loader screen */}
          {isGenerating ? (
            <div className="bg-[#0f1115] border border-white/10 rounded-2xl p-12 min-h-[460px] flex flex-col justify-center items-center text-center gap-6 shadow-xl shadow-black/30">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-white/5 border-t-[#c5a47e] animate-spin" />
                <Sparkles className="w-6 h-6 text-[#c5a47e] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-bounce" />
              </div>
              <div className="space-y-2 max-w-sm">
                <h3 className="font-serif italic text-white/90 text-lg">Gemini is synthesizing...</h3>
                <p className="text-xs text-[#c5a47e] font-semibold animate-pulse font-mono tracking-wide">{statusMessage}</p>
                <p className="text-[11px] text-white/40 leading-normal font-mono">
                  Synthesizing outlines, core glossaries, flashcards, and scored exam-level quizzes. Take a deep breath!
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-[#0f1115] border border-white/10 rounded-2xl shadow-2xl flex flex-col min-h-[480px] overflow-hidden">
              
              {/* Header block with title, metadata, and library persistence actions */}
              <div className="bg-[#13151b] border-b border-white/10 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono tracking-widest font-semibold bg-[#c5a47e]/10 text-[#c5a47e] border border-[#c5a47e]/25 px-2.5 py-0.5 rounded-full uppercase">
                      {activeId === "demo" ? "Preloaded Demo Guide" : activeId ? "Saved in archives" : "Active Draft"}
                    </span>
                  </div>
                  <h2 className="font-serif italic text-2xl text-white/90 leading-tight">
                    {currentSuite.title}
                  </h2>
                  <p className="text-xs text-white/60 line-clamp-1 leading-normal">
                    {currentSuite.description}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  {/* Save draft button if state not currently saved */}
                  {(!activeId || activeId === "") && (
                    <button
                      onClick={handleSaveToLibrary}
                      className="flex items-center gap-1.5 text-xs bg-[#c5a47e] hover:bg-[#d6ba99] text-[#0c0d10] px-3.5 py-2 rounded-lg font-bold uppercase tracking-wider transition"
                    >
                      <Bookmark className="w-3.5 h-3.5" />
                      <span>Save copy</span>
                    </button>
                  )}

                  <button
                    onClick={handleExportMarkdown}
                    className="flex items-center gap-1.5 text-xs bg-[#0c0d10] hover:bg-white/5 border border-white/15 text-white/90 px-3.5 py-2 rounded-lg font-medium transition"
                    title="Export Study Material to Markdown"
                  >
                    <Download className="w-3.5 h-3.5 text-[#c5a47e]" />
                    <span>Download (.md)</span>
                  </button>
                </div>
              </div>

              {/* Tabs Navigation selectors */}
              <div className="flex border-b border-white/10 bg-[#13151b]/40">
                <button
                  onClick={() => setActiveTab("guide")}
                  className={`flex-1 py-3 px-2 font-mono text-[10px] uppercase tracking-wider font-semibold border-b-2 transition flex items-center justify-center gap-1.5 ${
                    activeTab === "guide"
                      ? "border-[#c5a47e] text-[#c5a47e] bg-white/5"
                      : "border-transparent text-white/50 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5 shrink-0" />
                  <span>Study Guide</span>
                </button>
                
                <button
                  onClick={() => setActiveTab("cards")}
                  className={`flex-1 py-3 px-2 font-mono text-[10px] uppercase tracking-wider font-semibold border-b-2 transition flex items-center justify-center gap-1.5 ${
                    activeTab === "cards"
                      ? "border-[#c5a47e] text-[#c5a47e] bg-white/5"
                      : "border-transparent text-white/50 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Brain className="w-3.5 h-3.5 shrink-0" />
                  <span>Flashcards</span>
                </button>

                <button
                  onClick={() => setActiveTab("quiz")}
                  className={`flex-1 py-3 px-2 font-mono text-[10px] uppercase tracking-wider font-semibold border-b-2 transition flex items-center justify-center gap-1.5 ${
                    activeTab === "quiz"
                      ? "border-[#c5a47e] text-[#c5a47e] bg-white/5"
                      : "border-transparent text-white/50 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <GraduationCap className="w-3.5 h-3.5 shrink-0" />
                  <span>Mock Quiz</span>
                </button>

                <button
                  onClick={() => setActiveTab("feynman")}
                  className={`flex-1 py-3 px-2 font-mono text-[10px] uppercase tracking-wider font-semibold border-b-2 transition flex items-center justify-center gap-1.5 ${
                    activeTab === "feynman"
                      ? "border-[#c5a47e] text-[#c5a47e] bg-white/5"
                      : "border-transparent text-white/50 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>Feynman</span>
                </button>
              </div>

              {/* Dynamic Workspace Container */}
              <div className="flex-1 p-6 overflow-y-auto">
                <AnimatePresence mode="wait">
                  
                  {/* TAB 1: Core Study Guide containing outlines and terminologies */}
                  {activeTab === "guide" && (
                    <motion.div
                      key="guide"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-6"
                    >
                      {/* Critical takeaways segment */}
                      <div className="bg-[#13151b] border border-white/10 rounded-xl p-4 space-y-2">
                        <div className="flex items-center gap-1.5">
                          <Check className="w-4 h-4 text-[#c5a47e]" />
                          <h4 className="font-mono font-semibold text-[10px] uppercase tracking-wider text-white/40">Core Memorization Anchors</h4>
                        </div>
                        <ul className="space-y-2 text-xs leading-relaxed text-white/80">
                          {currentSuite.keyTakeaways.map((takeaway, tIdx) => (
                            <li key={tIdx} className="flex gap-2">
                              <span className="text-[#c5a47e] font-bold shrink-0">•</span>
                              <span>{takeaway}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Accordion Outline header and tree */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-1.5">
                            <BookOpen className="w-4 h-4 text-[#c5a47e]" />
                            <h3 className="font-serif italic text-white/90 text-sm">Collapsible Study Outline</h3>
                          </div>
                          
                          {/* Helper collapse resets */}
                          <div className="flex gap-2 text-[10.5px] font-mono">
                            <button
                              onClick={() => {
                                const collapsed: { [key: string]: boolean } = {};
                                currentSuite.outline.forEach((item) => {
                                  collapsed[item.heading] = true;
                                });
                                setCollapsedOutlineSections(collapsed);
                              }}
                              className="text-white/40 hover:text-white transition"
                            >
                              Collapse All
                            </button>
                            <span className="text-white/10">|</span>
                            <button
                              onClick={() => setCollapsedOutlineSections({})}
                              className="text-[#c5a47e] hover:text-[#d6ba99] transition"
                            >
                              Expand All
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2.5">
                          {currentSuite.outline.map((item, idx) => {
                            const isCollapsed = !!collapsedOutlineSections[item.heading];
                            return (
                              <div key={idx} className="border border-white/10 rounded-xl overflow-hidden shadow-md">
                                <button
                                  onClick={() => toggleSection(item.heading)}
                                  className="w-full bg-[#13151b] px-4 py-3 flex items-center justify-between text-left hover:bg-white/5 transition"
                                >
                                  <span className="font-serif text-white/90 text-xs md:text-sm italic">
                                    {item.heading}
                                  </span>
                                  {isCollapsed ? (
                                    <ChevronRight className="w-4 h-4 text-white/40 shrink-0" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4 text-[#c5a47e] shrink-0" />
                                  )}
                                </button>

                                <AnimatePresence initial={false}>
                                  {!isCollapsed && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: "auto", opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.2 }}
                                    >
                                      <div className="p-4 bg-[#0c0d10] border-t border-white/5 space-y-3">
                                        <ul className="list-disc pl-5 text-xs text-white/80 space-y-1.5 leading-relaxed">
                                          {item.keyPoints.map((point, kIdx) => (
                                            <li key={kIdx}>{point}</li>
                                          ))}
                                        </ul>

                                        {/* Subtopics Nested Tree */}
                                        {item.subtopics && item.subtopics.length > 0 && (
                                          <div className="pl-4 border-l border-[#c5a47e]/30 space-y-3 mt-3">
                                            {item.subtopics.map((sub, sIdx) => (
                                              <div key={sIdx} className="space-y-1">
                                                <h5 className="font-serif italic text-[11.5px] text-white/90 flex items-center gap-1.5">
                                                  <span className="w-1.5 h-1.5 rounded-full bg-[#c5a47e]" />
                                                  {sub.heading}
                                                </h5>
                                                <ul className="list-circle pl-5 text-[11px] text-white/60 space-y-1 leading-relaxed">
                                                  {sub.keyPoints.map((subPt, spIdx) => (
                                                    <li key={spIdx}>{subPt}</li>
                                                  ))}
                                                </ul>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Vocabulary Glossary module */}
                      <div className="border border-white/10 rounded-xl p-4 space-y-3 bg-[#13151b]">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2">
                          <div className="flex items-center gap-1.5">
                            <GraduationCap className="w-4 h-4 text-[#c5a47e]" />
                            <h3 className="font-serif italic text-white/90 text-sm">Key Terminology Glossary</h3>
                          </div>

                          <div className="relative">
                            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40" />
                            <input
                              type="text"
                              value={vocabSearch}
                              onChange={(e) => setVocabSearch(e.target.value)}
                              placeholder="Search vocabulary..."
                              className="pl-8 pr-3 py-1 bg-[#0c0d10] border border-white/10 rounded-lg text-xs text-white/80 focus:outline-none focus:border-[#c5a47e] transition"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                          {filteredVocab.map((vocab, vIdx) => (
                            <div key={vIdx} className="bg-[#0f1115] p-3 rounded-xl border border-white/5 flex flex-col gap-1.5 shadow-md">
                              <span className="font-mono text-xs text-[#c5a47e] bg-[#c5a47e]/10 border border-[#c5a47e]/20 px-2 py-0.5 rounded-full w-fit">
                                {vocab.term}
                              </span>
                              <p className="text-xs text-white/80 leading-normal font-medium">
                                {vocab.definition}
                              </p>
                              <p className="text-[10px] text-white/40 italic font-mono mt-auto leading-relaxed border-t border-white/5 pt-1.5">
                                context: {vocab.context}
                              </p>
                            </div>
                          ))}

                          {filteredVocab.length === 0 && (
                            <p className="text-xs text-white/40 p-4 text-center col-span-full">
                              No vocabulary matching search.
                            </p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* TAB 2: Spaced Repetition Interactive Flashcards */}
                  {activeTab === "cards" && (
                    <motion.div
                      key="cards"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-6"
                    >
                      {/* Interactive Progress Tracking */}
                      <div className="bg-[#13151b] border border-white/10 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <h4 className="font-serif italic text-xs text-white/90">Memory Mastery Progress</h4>
                          <p className="text-[11px] text-white/60 leading-normal">
                            Self-grade flashcards to filter and lock core factual points. Push for 100%!
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-3 w-full sm:w-fit bg-[#0c0d10] px-3 py-2 rounded-lg border border-white/10">
                          <div className="text-right">
                            <span className="text-xs font-bold text-white/95 font-mono">{countLearned} / {totalCards}</span>
                            <span className="text-[9px] text-white/40 block font-mono uppercase tracking-wide">Learned</span>
                          </div>
                          
                          {/* Radial / bar progress feedback */}
                          <div className="w-24 bg-white/10 rounded-full h-2 overflow-hidden shrink-0">
                            <div
                              className="bg-[#c5a47e] h-full transition-all duration-300"
                              style={{ width: `${scorePercent}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-[#c5a47e] shrink-0 font-mono">{scorePercent}%</span>
                        </div>
                      </div>

                      {/* Core Flipping Card Physics stage */}
                      {totalCards > 0 && (
                        <div className="max-w-md mx-auto space-y-4">
                          <div className="perspective-1000 w-full h-56 cursor-pointer select-none">
                            <div
                              onClick={() => setIsCardFlipped(!isCardFlipped)}
                              className={`relative w-full h-full duration-500 transform-style-3d transition-card ${
                                isCardFlipped ? "rotate-y-180" : ""
                              }`}
                            >
                              {/* FRONT SIZED PANEL */}
                              <div className="absolute inset-0 w-full h-full backface-hidden bg-[#13151b] border border-white/10 shadow-xl rounded-2xl p-6 flex flex-col justify-between items-center text-center">
                                <span className="text-[10px] font-mono font-semibold text-[#c5a47e] uppercase tracking-widest bg-[#c5a47e]/15 px-2.5 py-0.5 rounded-full">
                                  Flashcard {currentCardIndex + 1} of {totalCards}
                                </span>
                                
                                <p className="font-serif italic text-white/95 text-sm md:text-base leading-snug px-4">
                                  {currentSuite.flashcards[currentCardIndex].question}
                                </p>

                                <div className="space-y-1">
                                  <span className="text-[10px] font-mono font-semibold text-white/40 block uppercase tracking-wider">Click Card to Flip</span>
                                  {currentSuite.flashcards[currentCardIndex].hint && (
                                    <span className="text-[10.5px] text-white/60 flex items-center justify-center gap-1">
                                      <Info className="w-3 h-3 text-[#c5a47e]" />
                                      <span>Hint: {currentSuite.flashcards[currentCardIndex].hint}</span>
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* BACK SIZED PANEL (Reversed) */}
                              <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 bg-[#241f17] border border-[#c5a47e]/30 shadow-2xl rounded-2xl p-6 flex flex-col justify-between items-center text-center text-white">
                                <span className="text-[10px] font-mono font-semibold text-[#c5a47e] uppercase tracking-widest bg-[#c5a47e]/15 px-2.5 py-0.5 rounded-full">
                                  Cognitive Verification
                                </span>
                                
                                <p className="font-sans text-white/95 text-xs md:text-sm leading-relaxed max-h-[140px] overflow-y-auto px-2">
                                  {currentSuite.flashcards[currentCardIndex].answer}
                                </p>

                                <span className="text-[9px] font-mono font-semibold text-white/40 block uppercase tracking-wider">Click again to view question</span>
                              </div>
                            </div>
                          </div>

                          {/* Navigation buttons and grade toggler */}
                          <div className="flex items-center justify-between px-2">
                            {/* Mastery grade switcher */}
                            <button
                              onClick={() => toggleLearned(currentCardIndex)}
                              className={`flex items-center gap-1.5 text-xs font-semibold px-4 py-2 border rounded-xl transition ${
                                cardsLearned[currentCardIndex]
                                  ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-300"
                                  : "bg-[#0c0d10] border-white/15 text-white/70 hover:bg-white/5"
                              }`}
                            >
                              <Check className={`w-4 h-4 ${cardsLearned[currentCardIndex] ? "text-emerald-400" : "text-white/40"}`} />
                              <span>{cardsLearned[currentCardIndex] ? "Learned Concept!" : "Mark as Learned"}</span>
                            </button>

                            {/* Navigation controls */}
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setIsCardFlipped(false);
                                  setTimeout(() => {
                                    setCurrentCardIndex((prev) => (prev > 0 ? prev - 1 : totalCards - 1));
                                  }, 150);
                                }}
                                className="p-2 border border-white/15 rounded-xl hover:bg-white/5 transition bg-[#0c0d10]"
                                title="Previous Flashcard"
                              >
                                <ChevronLeft className="w-4 h-4 text-white/70" />
                              </button>
                              <button
                                onClick={() => {
                                  setIsCardFlipped(false);
                                  setTimeout(() => {
                                    setCurrentCardIndex((prev) => (prev < totalCards - 1 ? prev + 1 : 0));
                                  }, 150);
                                }}
                                className="p-2 border border-white/15 rounded-xl hover:bg-white/5 transition bg-[#0c0d10]"
                                title="Next Flashcard"
                              >
                                <ChevronRight className="w-4 h-4 text-white/70" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* TAB 3: Scored Multiple Choice Mock Exam Quiz */}
                  {activeTab === "quiz" && (
                    <motion.div
                      key="quiz"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-6"
                    >
                      {/* Active Recall mock heading context */}
                      <div className="border-b border-white/5 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="space-y-1">
                          <h3 className="font-serif italic text-white/95 text-base">Targeted Practice Quiz</h3>
                          <p className="text-xs text-white/60">
                            Take this self-correcting practice test as mock preparation for exam day conditions.
                          </p>
                        </div>

                        {quizSubmitted && (
                          <button
                            onClick={() => {
                              setQuizAnswers({});
                              setQuizSubmitted(false);
                              triggerToast("Quiz recycled! Feel free to practice again.");
                            }}
                            className="bg-[#0c0d10] text-[#c5a47e] border border-white/10 hover:bg-white/5 font-mono text-[10px] uppercase px-3, py-1.5 rounded-lg font-semibold transition"
                          >
                            Retake Exam
                          </button>
                        )}
                      </div>

                      {/* Display Grade and feedback results if submitted */}
                      {quizSubmitted && (
                        <div className="bg-[#13151b] border border-white/10 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-white/40">Exam Grading Report</span>
                            <h4 className={`font-serif italic font-bold text-lg md:text-xl ${getQuizGradeStatus().color}`}>
                              {getQuizGradeStatus().title}
                            </h4>
                            <p className="text-xs text-white/50 leading-normal">
                              You successfully answered <strong className="text-[#c5a47e] font-mono">{getQuizGradeStatus().rightAnswers}</strong> out of <strong className="text-white font-mono">{currentSuite.quiz.length}</strong> questions correctly. Take research to study what you missed!
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 bg-[#0c0d10] border border-white/10 py-3.5 px-6 rounded-xl shrink-0 shadow-inner text-center justify-center">
                            <div>
                              <span className="text-2xl font-bold font-mono text-[#c5a47e]">
                                {getQuizGradeStatus().percentage}%
                              </span>
                              <span className="text-[9px] text-white/40 block font-mono font-semibold uppercase tracking-wider">Total Percent Score</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Quiz Question Lists */}
                      <div className="space-y-5">
                        {currentSuite.quiz.map((q, idx) => {
                          const selectedOption = quizAnswers[q.id];
                          const answerIsSelected = selectedOption !== undefined;
                          const isCorrect = selectedOption === q.correctAnswerIndex;

                          return (
                            <div key={q.id} className="border border-white/10 rounded-xl p-5 space-y-3.5 bg-[#13151b] shadow-md">
                              {/* Question title */}
                              <div className="space-y-1.5">
                                <span className="text-[10px] font-mono text-white/40 uppercase font-semibold">Question {idx + 1}</span>
                                <h4 className="font-serif italic text-white/90 text-sm md:text-base leading-snug">
                                  {q.question}
                                </h4>
                              </div>

                              {/* Question choice options array */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                {q.options.map((option, oIdx) => {
                                  const isSelected = selectedOption === oIdx;
                                  const isRealAnswer = q.correctAnswerIndex === oIdx;

                                  let optStyle = "border-white/10 bg-[#0c0d10] hover:bg-white/5 text-white/80 hover:border-white/20";
                                  if (isSelected) {
                                    optStyle = "border-[#c5a47e] bg-[#c5a47e]/10 text-white";
                                  }

                                  // Highlight formatting once graded
                                  if (quizSubmitted) {
                                    if (isRealAnswer) {
                                      optStyle = "border-emerald-500 bg-emerald-950/30 text-emerald-300";
                                    } else if (isSelected && !isRealAnswer) {
                                      optStyle = "border-red-500 bg-red-950/30 text-red-300";
                                    } else {
                                      optStyle = "border-white/5 bg-[#0c0d10]/50 text-white/30";
                                    }
                                  }

                                  return (
                                    <button
                                      key={oIdx}
                                      onClick={() => selectQuizOption(q.id, oIdx)}
                                      disabled={quizSubmitted}
                                      className={`p-3 text-left rounded-xl text-xs font-semibold border transition text-[#d0d0d0] leading-normal select-none flex items-start gap-2.5 ${optStyle}`}
                                    >
                                      {/* Visual radio buttons */}
                                      <span className={`w-4 h-4 rounded-full border shrink-0 flex items-center justify-center text-[10px] font-bold ${
                                        isSelected
                                          ? "border-[#c5a47e] text-[#c5a47e] bg-[#0c0d10]"
                                          : "border-white/10 text-white/40 bg-black/10"
                                      }`}>
                                        {oIdx === 0 ? "A" : oIdx === 1 ? "B" : oIdx === 2 ? "C" : "D"}
                                      </span>
                                      
                                      <span>{option}</span>
                                    </button>
                                  );
                                })}
                              </div>

                              {/* Rationale Explanation block */}
                              {quizSubmitted && answerIsSelected && (
                                <motion.div
                                  initial={{ opacity: 0, y: -5 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className={`p-3.5 rounded-xl border text-xs leading-relaxed flex gap-2 ${
                                    isCorrect ? "bg-emerald-950/20 border-emerald-500/20 text-emerald-300" : "bg-[#241f17] border-[#c5a47e]/20 text-white/80"
                                  }`}
                                >
                                  {isCorrect ? (
                                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                                  ) : (
                                    <HelpCircle className="w-5 h-5 text-[#c5a47e] shrink-0 mt-0.5" />
                                  )}
                                  <div>
                                    <span className="font-serif italic text-white/95 block mb-1">
                                      {isCorrect ? "Correct answer!" : "Answer Explanation - Review Rationale"}
                                    </span>
                                    <p>{q.explanation}</p>
                                  </div>
                                </motion.div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Main submission button */}
                      {!quizSubmitted && (
                        <button
                          onClick={handleGradeQuiz}
                          disabled={Object.keys(quizAnswers).length < currentSuite.quiz.length}
                          className="w-full sm:w-fit bg-[#c5a47e] hover:bg-[#d6ba99] text-[#0c0d10] text-[10px] uppercase font-mono font-bold tracking-widest py-3 px-6 rounded-xl opacity-100 disabled:opacity-50 ml-auto flex items-center justify-center gap-1.5 transition active:scale-[0.98]"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Submit Mock Exam ({Object.keys(quizAnswers).length} of {currentSuite.quiz.length})</span>
                        </button>
                      )}
                    </motion.div>
                  )}

                  {/* TAB 4: The Feynman Simplifier Technique analogy block */}
                  {activeTab === "feynman" && (
                     <motion.div
                       key="feynman"
                       initial={{ opacity: 0, y: 10 }}
                       animate={{ opacity: 1, y: 0 }}
                       exit={{ opacity: 0, y: -10 }}
                       transition={{ duration: 0.2 }}
                       className="space-y-5"
                     >
                       <div className="flex justify-between items-start gap-4">
                         <div className="space-y-1">
                           <h3 className="font-serif italic text-white/90 text-base">Feynman Simplicity Explainer</h3>
                           <p className="text-xs text-white/60">
                             The feynman technique: Translating complex, dry jargon into a beautiful simple analogy.
                           </p>
                         </div>
 
                         {/* Interactive FAQ help */}
                         <button
                           onClick={() => setShowFeynmanHelp(!showFeynmanHelp)}
                           className="p-1 px-3 text-[10px] font-mono font-bold border border-white/10 hover:bg-white/5 bg-[#0c0d10] rounded-lg transition text-[#c5a47e] flex items-center gap-1 shrink-0"
                         >
                           <HelpCircle className="w-3.5 h-3.5" />
                           <span>What is this?</span>
                         </button>
                       </div>

                      <AnimatePresence>
                        {showFeynmanHelp && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="bg-[#0c0d10] border border-white/10 rounded-xl p-4 text-xs text-white/70 leading-relaxed overflow-hidden"
                          >
                            <span className="font-serif italic text-sm text-[#c5a47e] block mb-1">The Richard Feynman Learning Technique:</span>
                            Named after Nobel prize physicist Richard Feynman, this technique asserts that if you cannot explain a concept to an 8-year-old in plain English using a simple story or analogy, you don't fully understand it yourself. This section translates concepts from the webpage content into a simple mental movie model.
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Prime Feynman block styled elegant like an open playbook paper */}
                      <div className="relative border border-white/10 rounded-2xl bg-gradient-to-br from-[#1c1f26] to-[#12141a] p-6 md:p-8 shadow-xl overflow-hidden">
                        
                        {/* Elegant vintage notebook style watermark background */}
                        <div className="absolute top-4 right-4 text-[#c5a47e] shrink-0 pointer-events-none select-none">
                          <Brain className="w-32 h-32 opacity-15" />
                        </div>

                        <div className="space-y-4 relative z-10">
                          <span className="text-[10px] font-mono font-bold text-[#c5a47e] uppercase tracking-wider bg-[#c5a47e]/15 border border-[#c5a47e]/25 px-3 py-1 rounded-full w-fit block">
                            ELI5 (Explain Like I'm 5) Analogy
                          </span>
                          
                          <p className="text-white/90 text-xs md:text-sm font-serif italic tracking-wide leading-loose md:leading-loose">
                            {currentSuite.feynmanExplanation}
                          </p>

                          {/* Quick copy block */}
                          <div className="flex gap-2.5 pt-4 border-t border-white/5">
                            <button
                               onClick={() => {
                                 navigator.clipboard.writeText(currentSuite.feynmanExplanation);
                                 triggerToast("Feynman simplified metaphor copied to clipboard!");
                               }}
                               className="text-[10px] font-mono font-bold uppercase tracking-wider bg-[#0c0d10] text-[#c5a47e] hover:text-white px-4 py-2 rounded-xl border border-white/15 hover:bg-white/5 transition flex items-center gap-1.5"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy Metaphor</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                </AnimatePresence>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Main Footer layout credit lines with no telemetry as requested */}
      <footer className="bg-[#0a0b0d] border-t border-white/5 px-6 py-5 mt-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-white/50">
        <p className="font-serif italic text-white/40 text-xs">Web Page Study Note Generator</p>
        <p className="text-[9.5px] text-white/30 font-mono">
          Double check AI generated study concepts for academic accuracy. Have fun reviewing!
        </p>
      </footer>
    </div>
  );
}
