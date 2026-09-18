import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Button, Badge } from '@/shared/ui';
import {
  FileCode2,
  Copy,
  Check,
  Database,
  X,
  Maximize2,
  Minimize2,
  ChevronRight,
  WrapText,
  Search,
  ZoomIn,
  ZoomOut,
  Code2,
  Terminal,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { GitFileContent } from '../hooks/useGit';

interface CodeViewerPaneProps {
  file: GitFileContent | null;
  isLoading?: boolean;
  onClose?: () => void;
}

// Lightweight syntax highlighter for VS Code look & feel
function highlightSyntax(code: string, language: string) {
  if (!code) return '';

  const escapeHtml = (str: string) =>
    str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

  // Tokens regex for TS/JS/JSON/SQL
  const tokenRegex =
    /(\/\/[^\n]*|\/\*[\s\S]*?\*\/|#\s*[^\n]*)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|(\b(?:import|export|from|default|const|let|var|function|return|if|else|for|while|switch|case|break|try|catch|finally|async|await|class|interface|type|extends|implements|new|this|typeof|instanceof|void|null|undefined|true|false|boolean|string|number|any|SELECT|FROM|WHERE|INSERT|INTO|UPDATE|DELETE|JOIN|CREATE|TABLE|ALTER|DROP|PRIMARY|KEY|FOREIGN|REFERENCES|NOT|NULL|DEFAULT|INTEGER|TEXT|BOOLEAN|VARCHAR)\b)|(\b\d+(?:\.\d+)?\b)|(\b[A-Z][a-zA-Z0-9_]*\b)|(\b[a-zA-Z_$][a-zA-Z0-9_$]*(?=\s*\())/g;

  let lastIndex = 0;
  let html = '';
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(code)) !== null) {
    const textBefore = code.slice(lastIndex, match.index);
    html += escapeHtml(textBefore);

    const [fullMatch, comment, stringLiteral, keyword, numberLiteral, typeName, functionName] =
      match;

    if (comment) {
      html += `<span class="text-[#6a9955] italic">${escapeHtml(comment)}</span>`;
    } else if (stringLiteral) {
      html += `<span class="text-[#ce9178]">${escapeHtml(stringLiteral)}</span>`;
    } else if (keyword) {
      html += `<span class="text-[#569cd6] font-medium">${escapeHtml(keyword)}</span>`;
    } else if (numberLiteral) {
      html += `<span class="text-[#b5cea8]">${escapeHtml(numberLiteral)}</span>`;
    } else if (typeName) {
      html += `<span class="text-[#4ec9b0]">${escapeHtml(typeName)}</span>`;
    } else if (functionName) {
      html += `<span class="text-[#dcdcaa]">${escapeHtml(functionName)}</span>`;
    } else {
      html += escapeHtml(fullMatch);
    }

    lastIndex = tokenRegex.lastIndex;
  }

  html += escapeHtml(code.slice(lastIndex));
  return html;
}

function getLanguageName(extension: string): string {
  const ext = extension.toLowerCase();
  if (ext === '.ts') return 'TypeScript';
  if (ext === '.tsx') return 'TypeScript React';
  if (ext === '.js') return 'JavaScript';
  if (ext === '.jsx') return 'JavaScript React';
  if (ext === '.json') return 'JSON';
  if (ext === '.sql' || ext === '.sqlite') return 'SQL';
  if (ext === '.md') return 'Markdown';
  if (ext === '.css') return 'CSS';
  if (ext === '.html') return 'HTML';
  return 'Plain Text';
}

export const CodeViewerPane: React.FC<CodeViewerPaneProps> = ({
  file,
  isLoading = false,
  onClose
}) => {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isWordWrap, setIsWordWrap] = useState(true); // Default ON to avoid horizontal scroll
  const [fontSize, setFontSize] = useState<number>(12.5);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeLine, setActiveLine] = useState<number | null>(null);

  const codeContainerRef = useRef<HTMLDivElement>(null);

  const lines = useMemo(() => (file?.content ? file.content.split('\n') : []), [file?.content]);
  const language = useMemo(() => (file?.extension ? getLanguageName(file.extension) : 'Text'), [file?.extension]);
  const pathParts = useMemo(() => (file?.path ? file.path.replace(/\\/g, '/').split('/') : []), [file?.path]);

  // Search match computation
  const searchMatches = useMemo(() => {
    if (!searchQuery.trim() || !lines.length) return [];
    const matches: number[] = [];
    const q = searchQuery.toLowerCase();
    lines.forEach((line: string, idx: number) => {
      if (line.toLowerCase().includes(q)) {
        matches.push(idx + 1);
      }
    });
    return matches;
  }, [searchQuery, lines]);

  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  const handleNextMatch = () => {
    if (searchMatches.length === 0) return;
    setCurrentMatchIndex((prev) => (prev + 1) % searchMatches.length);
  };

  const handlePrevMatch = () => {
    if (searchMatches.length === 0) return;
    setCurrentMatchIndex((prev) => (prev - 1 + searchMatches.length) % searchMatches.length);
  };

  const handleCopy = () => {
    if (!file) return;
    navigator.clipboard.writeText(file.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[380px] bg-[#1e1e1e] text-center gap-3">
        <div className="size-7 border-2 border-[#569cd6] border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-muted-foreground font-mono">Loading from git object store...</span>
      </div>
    );
  }

  if (!file) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[380px] bg-[#1e1e1e] text-center p-8 gap-3">
        <div className="size-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-muted-foreground shadow-inner">
          <Code2 className="size-6 text-[#569cd6]" />
        </div>
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold text-foreground">Select a file to inspect code</h3>
          <p className="text-xs text-muted-foreground max-w-[280px] leading-relaxed">
            Click any file in the Explorer on the left to view its source code and database metadata at this commit.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col bg-[#1e1e1e] text-[#d4d4d4] h-full overflow-hidden select-text ${
        isExpanded ? 'fixed inset-4 z-50 rounded-2xl border border-border/80 shadow-2xl' : ''
      }`}
    >
      {/* VS Code Tab Bar / Top Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#252526] border-b border-[#333333] flex-wrap gap-2 shrink-0">
        {/* Active Tab & Breadcrumbs */}
        <div className="flex items-center gap-1.5 text-xs font-mono min-w-0">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#1e1e1e] border-t-2 border-[#007acc] text-foreground rounded-t-md font-medium shadow-xs">
            {file.isDbRelated ? (
              <Database className="size-3.5 text-emerald-400 shrink-0" />
            ) : (
              <FileCode2 className="size-3.5 text-[#569cd6] shrink-0" />
            )}
            <span className="truncate max-w-[180px]" title={file.path}>
              {pathParts[pathParts.length - 1]}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1 text-[11px] text-muted-foreground/70 pl-2">
            {pathParts.map((part: string, idx: number) => (
              <React.Fragment key={idx}>
                {idx > 0 && <ChevronRight className="size-3 opacity-40 shrink-0" />}
                <span className="truncate max-w-[100px]">{part}</span>
              </React.Fragment>
            ))}
          </div>

          {file.isDbRelated && (
            <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[9px] px-1.5 py-0 font-sans ml-1">
              Schema/DB
            </Badge>
          )}
        </div>

        {/* VS Code Editor Action Icons */}
        <div className="flex items-center gap-1 shrink-0">
          {/* In-File Search Toggle */}
          <button
            type="button"
            onClick={() => setSearchOpen(!searchOpen)}
            className={`p-1.5 rounded transition-colors cursor-pointer ${
              searchOpen ? 'bg-[#007acc] text-white' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
            }`}
            title="Find (Ctrl+F)"
          >
            <Search className="size-3.5" />
          </button>

          {/* Word Wrap Toggle (Alt+Z) */}
          <button
            type="button"
            onClick={() => setIsWordWrap(!isWordWrap)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-mono transition-colors cursor-pointer ${
              isWordWrap
                ? 'bg-[#007acc]/20 text-[#569cd6] border border-[#007acc]/30'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
            }`}
            title="Toggle Word Wrap (Soft wrap lines without horizontal scroll)"
          >
            <WrapText className="size-3.5" />
            <span>Wrap</span>
          </button>

          {/* Zoom controls */}
          <button
            type="button"
            onClick={() => setFontSize((f) => Math.max(10, f - 1))}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-white/5 rounded cursor-pointer"
            title="Decrease Font Size"
          >
            <ZoomOut className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setFontSize((f) => Math.min(20, f + 1))}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-white/5 rounded cursor-pointer"
            title="Increase Font Size"
          >
            <ZoomIn className="size-3.5" />
          </button>

          {/* Copy Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-6 px-2 text-xs gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground hover:bg-white/5"
            title="Copy file contents"
          >
            {copied ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </Button>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-white/5 rounded cursor-pointer"
            title={isExpanded ? 'Exit full screen' : 'Expand full screen'}
          >
            {isExpanded ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
          </button>

          {onClose && !isExpanded && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-white/5 rounded cursor-pointer"
              title="Close editor"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* VS Code Search Widget */}
      {searchOpen && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-[#2d2d2d] border-b border-[#3c3c3c] text-xs font-mono shadow-md animate-in slide-in-from-top-1 duration-150">
          <div className="flex items-center gap-2 flex-1 max-w-sm">
            <Search className="size-3.5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Find in file..."
              className="w-full bg-[#3c3c3c] text-white px-2 py-0.5 rounded border border-[#555555] focus:outline-none focus:border-[#007acc] text-xs font-mono"
              autoFocus
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">
              {searchMatches.length > 0 ? `${currentMatchIndex + 1} of ${searchMatches.length}` : 'No matches'}
            </span>
            <button
              type="button"
              onClick={handlePrevMatch}
              disabled={searchMatches.length === 0}
              className="p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground disabled:opacity-40 cursor-pointer"
              title="Previous Match"
            >
              <ArrowUp className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={handleNextMatch}
              disabled={searchMatches.length === 0}
              className="p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground disabled:opacity-40 cursor-pointer"
              title="Next Match"
            >
              <ArrowDown className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setSearchOpen(false)}
              className="p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground cursor-pointer"
              title="Close Search"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* VS Code Editor Body */}
      <div
        ref={codeContainerRef}
        className="flex-1 overflow-auto bg-[#1e1e1e] text-[#d4d4d4] font-mono leading-relaxed selection:bg-[#264f78]"
        style={{ fontSize: `${fontSize}px` }}
      >
        <div className="py-2 min-w-full">
          {lines.map((line: string, idx: number) => {
            const lineNum = idx + 1;
            const isActive = activeLine === lineNum;
            const isMatched = searchMatches.includes(lineNum);
            const isCurrentMatch = isMatched && searchMatches[currentMatchIndex] === lineNum;

            return (
              <div
                key={idx}
                onClick={() => setActiveLine(lineNum)}
                className={`flex transition-colors group ${
                  isCurrentMatch
                    ? 'bg-[#515c6a]/40 border-l-2 border-[#ffcc00]'
                    : isMatched
                    ? 'bg-[#3b444f]/30'
                    : isActive
                    ? 'bg-white/[0.04]'
                    : 'hover:bg-white/[0.02]'
                }`}
              >
                {/* VS Code Line Number Gutter */}
                <div
                  className={`select-none text-right pr-4 pl-2 shrink-0 font-mono text-[11px] cursor-pointer w-12 border-r border-[#333333]/50 ${
                    isActive ? 'text-[#c6c6c6] font-bold' : 'text-[#858585]/60 group-hover:text-[#858585]'
                  }`}
                  style={{ fontSize: `${Math.max(10, fontSize - 1.5)}px` }}
                >
                  {lineNum}
                </div>

                {/* Line Code Content (Soft Wrapped or No Wrap) */}
                <div
                  className={`pl-4 pr-3 flex-1 font-mono ${
                    isWordWrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre overflow-x-auto'
                  }`}
                  dangerouslySetInnerHTML={{
                    __html: highlightSyntax(line, language) || '&nbsp;'
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* VS Code Bottom Status Bar */}
      <div className="flex items-center justify-between px-3 py-1 bg-[#007acc] text-white text-[11px] font-mono select-none shrink-0">
        <div className="flex items-center gap-3">
          <span>Ln {activeLine ?? 1}, Col 1</span>
          <span>{file.lineCount} lines</span>
          <span>{Math.round((file.sizeBytes / 1024) * 10) / 10} KB</span>
        </div>

        <div className="flex items-center gap-3">
          <span>{isWordWrap ? 'Wrap: On' : 'Wrap: Off'}</span>
          <span>UTF-8</span>
          <span className="font-semibold">{language}</span>
          <span>ref: {file.ref}</span>
        </div>
      </div>
    </div>
  );
};
