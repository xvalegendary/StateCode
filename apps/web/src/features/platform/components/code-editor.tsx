"use client";

import { KeyboardEvent, UIEvent, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  editorIoHint,
  getEditorLanguage,
  getLanguageSuggestions
} from "@/features/platform/data/language-associations";
import { cn } from "@/lib/utils";

type CodeEditorProps = {
  code: string;
  language: string;
  onCodeChange: (code: string) => void;
};

type CaretPosition = {
  top: number;
  left: number;
};

function getCurrentToken(code: string, caretIndex: number) {
  const match = code.slice(0, caretIndex).match(/[A-Za-z0-9_:.<>!]+$/);
  return match?.[0] ?? "";
}

function splitCode(value: string) {
  return value.split(/("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\/\/.*|#.*|\b\d+(?:\.\d+)?\b|\b[A-Za-z_][A-Za-z0-9_]*\b)/g);
}

function renderHighlightedLine(line: string, language: string) {
  const metadata = getEditorLanguage(language);
  const keywords = new Set(metadata.keywords.flatMap((keyword) => keyword.split(/\s+/)));
  const functions = new Set(metadata.functions.map((item) => item.replace(/\(.*/, "")));

  return splitCode(line).map((part, index) => {
    if (!part) {
      return null;
    }

    const className = (() => {
      if (/^(\/\/|#)/.test(part)) return "text-muted-foreground";
      if (/^["'`]/.test(part)) return "text-emerald-500";
      if (/^\d/.test(part)) return "text-amber-500";
      if (keywords.has(part)) return "text-sky-500";
      if (functions.has(part) || metadata.functions.some((fn) => fn.startsWith(part))) {
        return "text-fuchsia-500";
      }
      return "text-foreground";
    })();

    return (
      <span key={`${part}-${index}`} className={className}>
        {part}
      </span>
    );
  });
}

function getLineBeforeCaret(code: string, caretIndex: number) {
  const lineStart = code.lastIndexOf("\n", caretIndex - 1) + 1;
  return code.slice(lineStart, caretIndex);
}

function getIndentForNewLine(code: string, caretIndex: number, language: string) {
  const line = getLineBeforeCaret(code, caretIndex);
  const baseIndent = line.match(/^\s*/)?.[0] ?? "";
  const trimmed = line.trimEnd();
  const blockOpener = language === "Python 3.12"
    ? trimmed.endsWith(":")
    : /[{([=]$/.test(trimmed);

  return blockOpener ? `${baseIndent}    ` : baseIndent;
}

export function CodeEditor({ code, language, onCodeChange }: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const highlightRef = useRef<HTMLPreElement | null>(null);
  const lineRef = useRef<HTMLDivElement | null>(null);
  const [caretIndex, setCaretIndex] = useState(0);
  const [caretPosition, setCaretPosition] = useState<CaretPosition>({ top: 56, left: 64 });
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const metadata = getEditorLanguage(language);
  const currentToken = getCurrentToken(code, caretIndex);
  const suggestions = useMemo(
    () => (currentToken ? getLanguageSuggestions(language, currentToken) : []),
    [currentToken, language]
  );
  const lines = code.split("\n");

  const updateCaret = () => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    const nextCaret = textarea.selectionStart;
    const beforeCaret = code.slice(0, nextCaret);
    const beforeLines = beforeCaret.split("\n");
    const lineIndex = beforeLines.length - 1;
    const columnIndex = beforeLines[beforeLines.length - 1]?.length ?? 0;
    const styles = window.getComputedStyle(textarea);
    const lineHeight = Number.parseFloat(styles.lineHeight) || 24;
    const paddingTop = Number.parseFloat(styles.paddingTop) || 16;
    const paddingLeft = Number.parseFloat(styles.paddingLeft) || 16;
    const fontSize = Number.parseFloat(styles.fontSize) || 14;
    const charWidth = fontSize * 0.62;

    setCaretIndex(nextCaret);
    setCaretPosition({
      top: paddingTop + lineIndex * lineHeight - textarea.scrollTop + lineHeight + 4,
      left: Math.min(
        paddingLeft + columnIndex * charWidth - textarea.scrollLeft,
        textarea.clientWidth - 260
      )
    });
    setSuggestionsOpen(Boolean(getCurrentToken(code, nextCaret)));
  };

  const syncScroll = (event: UIEvent<HTMLTextAreaElement>) => {
    if (highlightRef.current) {
      highlightRef.current.scrollTop = event.currentTarget.scrollTop;
      highlightRef.current.scrollLeft = event.currentTarget.scrollLeft;
    }
    if (lineRef.current) {
      lineRef.current.scrollTop = event.currentTarget.scrollTop;
    }
    updateCaret();
  };

  const insertSuggestion = (suggestion: string) => {
    const textarea = textareaRef.current;
    const token = getCurrentToken(code, caretIndex);
    const start = Math.max(0, caretIndex - token.length);
    const nextCode = `${code.slice(0, start)}${suggestion}${code.slice(caretIndex)}`;
    const nextCaret = start + suggestion.length;

    onCodeChange(nextCode);
    setCaretIndex(nextCaret);
    setSuggestionsOpen(false);

    window.requestAnimationFrame(() => {
      textarea?.focus();
      textarea?.setSelectionRange(nextCaret, nextCaret);
      updateCaret();
    });
  };

  const handleEditorKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!suggestionsOpen || suggestions.length === 0) {
      if (event.key === "Tab") {
        event.preventDefault();
        insertPlainText("    ");
      }

      if (event.key === "Enter") {
        event.preventDefault();
        insertPlainText(`\n${getIndentForNewLine(code, caretIndex, language)}`);
      }

      return;
    }

    if (event.key === "Tab" || event.key === "Enter") {
      event.preventDefault();
      insertSuggestion(suggestions[0]);
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setSuggestionsOpen(false);
    }
  };

  const insertPlainText = (value: string) => {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? caretIndex;
    const end = textarea?.selectionEnd ?? caretIndex;
    const nextCode = `${code.slice(0, start)}${value}${code.slice(end)}`;
    const nextCaret = start + value.length;

    onCodeChange(nextCode);
    setCaretIndex(nextCaret);

    window.requestAnimationFrame(() => {
      textarea?.focus();
      textarea?.setSelectionRange(nextCaret, nextCaret);
      updateCaret();
    });
  };

  return (
    <div className="flex min-h-[760px] flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
        <div>
          <div className="text-sm font-medium">Code editor</div>
          <div className="text-xs text-muted-foreground">
            {metadata.extension} | {metadata.entrypoint}
          </div>
        </div>
        <Badge variant="outline">{language}</Badge>
      </div>

      <div className="grid flex-1 grid-rows-[1fr_auto]">
        <div className="relative min-h-[520px] overflow-hidden bg-background">
          <div
            ref={lineRef}
            className="absolute left-0 top-0 z-10 hidden h-full w-12 overflow-hidden border-r bg-muted/35 py-4 text-right font-mono text-xs leading-6 text-muted-foreground md:block"
          >
            {lines.map((_, index) => (
              <div key={index} className="pr-3">
                {index + 1}
              </div>
            ))}
          </div>
          <pre
            ref={highlightRef}
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-0 overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-sm leading-6",
              "md:pl-16"
            )}
          >
            {lines.map((line, index) => (
              <span key={index}>
                {renderHighlightedLine(line, language)}
                {index < lines.length - 1 ? "\n" : null}
              </span>
            ))}
          </pre>
          <textarea
            ref={textareaRef}
            value={code}
            onChange={(event) => {
              onCodeChange(event.target.value);
              window.requestAnimationFrame(updateCaret);
            }}
            onClick={updateCaret}
            onKeyUp={updateCaret}
            onKeyDown={handleEditorKeyDown}
            onFocus={updateCaret}
            onBlur={() => {
              window.setTimeout(() => setSuggestionsOpen(false), 120);
            }}
            onScroll={syncScroll}
            spellCheck={false}
            className={cn(
              "absolute inset-0 z-20 h-full w-full resize-none overflow-auto bg-transparent p-4 font-mono text-sm leading-6 text-transparent caret-foreground outline-none selection:bg-primary/25",
              "md:pl-16"
            )}
          />
          {suggestionsOpen && currentToken && suggestions.length > 0 ? (
            <div
              className="absolute z-30 w-72 border bg-popover text-popover-foreground shadow-xl"
              style={{
                top: Math.max(12, caretPosition.top),
                left: Math.max(12, caretPosition.left)
              }}
            >
              <div className="border-b px-3 py-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                {currentToken ? `Suggestions for ${currentToken}` : `${language} suggestions`}
              </div>
              <div className="max-h-64 overflow-auto p-1">
                {suggestions.slice(0, 8).map((suggestion, index) => (
                  <button
                    key={`${suggestion}-${index}`}
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      insertSuggestion(suggestion);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 px-3 py-2 text-left font-mono text-xs transition-colors hover:bg-muted",
                      index === 0 && "bg-muted"
                    )}
                  >
                    <span className="truncate">{suggestion}</span>
                    {index === 0 ? (
                      <span className="shrink-0 text-[10px] text-muted-foreground">Tab</span>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="border-t p-4">
          <div className="space-y-2">
            <div className="space-y-2">
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Syntax profile
              </div>
              <div className="text-sm">
                Comments use <code>{metadata.comment}</code>. Entry point:{" "}
                <code>{metadata.entrypoint}</code>.
              </div>
              <div className="text-xs text-muted-foreground">{editorIoHint}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
