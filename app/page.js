/** @format */
'use client';

import remarkGfm from 'remark-gfm';
import { useMemo, useState } from 'react';
import Select from 'react-select';
import Editor from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import { ClipLoader } from 'react-spinners';
import { Send, FileCode2, Wrench, Upload, Copy } from 'lucide-react';
import hljs from 'highlight.js/lib/common';
import { toast, ToastContainer } from 'react-toastify';
import copy from 'copy-to-clipboard';
import 'react-toastify/dist/ReactToastify.css';
import handleReview from './components/ControlReview';

export default function CodeReviewer() {
  const [language, setLanguage] = useState('javascript');
  const [code, setCode] = useState('// Paste your code here');
  const [review, setReview] = useState('');
  const [loading, setLoading] = useState(false);
  const [fixedCode, setFixedCode] = useState('');
  const [codeScore, setCodeScore] = useState(null);

  // ✅ Only popular languages
  const languageOptions = [
    { value: 'javascript', label: 'JavaScript' },
    { value: 'python', label: 'Python' },
    { value: 'java', label: 'Java' },
    { value: 'c', label: 'C' },
    { value: 'cpp', label: 'C++' },
    { value: 'csharp', label: 'C#' },
    { value: 'go', label: 'Go' },
    { value: 'php', label: 'PHP' },
    { value: 'sql', label: 'SQL' },
  ];

  // ✅ HLJS aliases for matching
  const HLJS_ALIAS_MAP = useMemo(
    () => ({
      javascript: new Set(['javascript', 'js', 'node']),
      python: new Set(['python', 'py']),
      java: new Set(['java']),
      c: new Set(['c', 'h']),
      cpp: new Set(['cpp', 'c++', 'hpp', 'cc', 'hxx']),
      csharp: new Set(['csharp', 'cs', 'c#']),
      php: new Set(['php']),
      go: new Set(['go', 'golang']),
      sql: new Set([
        'sql',
        'postgresql',
        'pgsql',
        'postgres',
        'mysql',
        'plsql',
        'tsql',
      ]),
    }),
    []
  );

  const normalizeHljsId = (id) => (id ? id.toLowerCase() : '');

  const detectLanguage = (snippet) => {
    const text = snippet?.trim() ?? '';
    if (!text) return { lang: '', relevance: 0 };
    try {
      const res = hljs.highlightAuto(text);
      return {
        lang: normalizeHljsId(res.language),
        relevance: res.relevance ?? 0,
      };
    } catch {
      return { lang: '', relevance: 0 };
    }
  };

  const isMatch = (selected, detectedId) => {
    const aliases = HLJS_ALIAS_MAP[selected];
    if (!aliases) return false;
    return aliases.has(detectedId);
  };

  const getScoreLabel = (score) => {
    if (score < 50) return '❌ Dangerous (Unusable code, cannot run)';
    if (score < 60) return '⚠️ Poor (Runs, but breaks coding rules)';
    if (score < 70) return '👌 Good (Basic quality, some issues)';
    if (score < 80) return '👍 Very Good (Mostly clean, minor issues)';
    return '🌟 Excellent (Production-level code)';
  };

  // ✅ Normalize score based on review content
  const normalizeScore = (reviewText, rawScore) => {
    const lower = reviewText.toLowerCase();

    if (lower.includes('dangerous')) return 30;
    if (lower.includes('poor')) return 55;
    if (lower.includes('good') && !lower.includes('very')) return 65;
    if (lower.includes('very good')) return 75;
    if (lower.includes('excellent') || lower.includes('perfect')) return 100;

    return Math.min(100, Math.max(0, rawScore));
  };

  // ✅ Inject normalized score into review text
  const injectScoreInReview = (text, normalizedScore) => {
    if (text.includes('# 2️⃣ Code Score')) {
      return text.replace(
        /# 2️⃣ Code Score([\s\S]*?)(\d{1,3}\s*\/?\s*100)?/,
        `# 2️⃣ Code Score\n${normalizedScore}/100`
      );
    }
    return text + `\n\n# 2️⃣ Code Score\n${normalizedScore}/100`;
  };

  const applyFix = () => {
    if (fixedCode) {
      setCode(fixedCode);
      toast.success('✅ Code fixed and updated in the editor!');
    } else {
      toast.error('❌ No fixed code found in the review.');
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result?.toString() || '';
      setCode(text);

      const { lang } = detectLanguage(text);
      if (lang) {
        setLanguage(lang);
        toast.info(`📄 Loaded ${file.name} (${lang})`);
      } else {
        toast.info(`📄 Loaded ${file.name}`);
      }
    };
    reader.readAsText(file);
  };

  const handleCopyCode = () => {
    if (!code) {
      toast.error('⚠️ Nothing to copy.');
      return;
    }
    copy(code);
    toast.success('📋 Code copied!');
  };

  const handleCopyReview = () => {
    if (!review) {
      toast.error('⚠️ Nothing to copy.');
      return;
    }
    copy(review);
    toast.success('📋 Review copied!');
  };

  return (
    <div className="min-h-screen bg-black p-6 flex flex-col items-center">
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-2 text-blue-500">
        <FileCode2 className="w-8 h-8" /> AI Code Reviewer
      </h1>

      <ToastContainer position="top-right" autoClose={4000} theme="dark" />

      {/* File Upload + Language Selector */}
      <div className="w-full max-w-3xl mb-4 flex items-center gap-3">
        <Select
          options={languageOptions}
          value={languageOptions.find((opt) => opt.value === language)}
          onChange={(opt) => setLanguage(opt.value)}
          className="flex-1"
          styles={{
            control: (base) => ({
              ...base,
              backgroundColor: '#1f2937', // dark background
              borderColor: '#374151', // dark border
              color: 'white',
              minHeight: '38px',
            }),
            menu: (base) => ({
              ...base,
              backgroundColor: '#111827', // dark menu background
              color: 'white',
              zIndex: 9999, // make sure it overlays editor
              boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            }),
            menuList: (base) => ({
              ...base,
              backgroundColor: '#111827', // keep dark
              padding: 0,
              maxHeight: '150px',
              overflowY: 'auto',
              scrollbarWidth: 'none', // hide scrollbar for Firefox
              msOverflowStyle: 'none', // hide scrollbar for IE 10+
              '&::-webkit-scrollbar': { display: 'none' }, // hide for Chrome/Safari
            }),
            option: (base, state) => ({
              ...base,
              backgroundColor: state.isFocused ? '#2563eb' : '#111827',
              color: state.isFocused ? 'white' : 'white',
              cursor: 'pointer',
            }),
            singleValue: (base) => ({
              ...base,
              color: 'white',
            }),
            placeholder: (base) => ({
              ...base,
              color: 'gray',
            }),
          }}
        />

        <label className="cursor-pointer bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded flex items-center gap-2">
          <Upload size={16} /> Upload File
          <input
            type="file"
            accept=".js,.jsx,.ts,.tsx,.py,.java,.cpp,.c,.cs,.php,.go,.sql,.txt"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </div>

      {/* Code Editor + Copy Button */}
      <div className="w-full max-w-5xl h-[400px] border rounded-xl overflow-hidden shadow relative">
        <Editor
          height="100%"
          language={language}
          value={code}
          theme="vs-dark"
          onChange={(value) => setCode(value ?? '')}
          options={{ minimap: { enabled: false } }}
        />
        <button
          onClick={handleCopyCode}
          className="absolute top-2 right-2 bg-blue-600 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-500 flex items-center gap-1 z-50"
        >
          <Copy size={14} /> Copy
        </button>
      </div>

      {/* Review Button */}
      <button
        onClick={() =>
          handleReview({
            code,
            language,
            setLoading,
            setReview,
            setFixedCode,
            setCodeScore,
            detectLanguage,
            isMatch,
            normalizeScore,
            injectScoreInReview,
          })
        }
        disabled={loading}
        className="mt-4 flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-xl shadow hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? <ClipLoader size={18} /> : <Send size={18} />}
        {loading ? 'Analyzing...' : 'Review Code'}
      </button>

      {/* Apply Fix */}
      {review && fixedCode && (
        <button
          onClick={applyFix}
          className="mt-3 flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-xl shadow hover:bg-green-700"
        >
          <Wrench size={18} /> Apply Fix
        </button>
      )}

      {/* Code Score */}
      {codeScore !== null && (
        <div className="mt-4 text-lg font-semibold text-white">
          Code Score: {codeScore}/100 → {getScoreLabel(codeScore)}
        </div>
      )}

      {/* Review Output + Copy Button */}
      {review && (
        <div className="w-full max-w-5xl mt-6 p-6 bg-neutral-900 text-white rounded-xl shadow-md relative">
          <button
            onClick={handleCopyReview}
            className="absolute top-2 right-2 bg-blue-600 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-500 flex items-center gap-1"
          >
            <Copy size={14} /> Copy
          </button>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
          >
            {review}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
}
