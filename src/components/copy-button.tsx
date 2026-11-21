"use client";
import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CopyButton({ value, label = "Copy", className }: { value: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = value;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }
  return (
    <Button variant="secondary" size="sm" onClick={copy} className={className} aria-live="polite">
      {copied ? <Check className="size-4 text-enamel" aria-hidden /> : <Copy className="size-4" aria-hidden />}
      {copied ? "Copied" : label}
    </Button>
  );
}

/** The install snippet as a code block with a copy action. */
export function SnippetBlock({ snippet }: { snippet: string }) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-panel)] border border-line-strong bg-ink text-white">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
        <span className="text-xs text-white/70">Paste before the closing body tag</span>
        <CopyButton value={snippet} label="Copy snippet" className="!border-white/20 !bg-transparent !text-white hover:!bg-white/10" />
      </div>
      <pre className="scrollbar-thin overflow-x-auto px-4 py-4 font-mono text-[13px] leading-relaxed">
        <code>{snippet}</code>
      </pre>
    </div>
  );
}
