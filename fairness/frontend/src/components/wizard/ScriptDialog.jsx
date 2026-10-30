import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Check, Download, FileCode2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { generateScript } from "@/lib/fairbench";

// Minimal syntax highlighter for Python
function highlight(code) {
  const lines = code.split("\n");
  return lines.map((line, i) => {
    let html = line
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Comments
    html = html.replace(/(#.*)$/, '<span class="text-slate-500">$1</span>');
    // Strings
    html = html.replace(/(".*?"|'.*?')/g, '<span class="text-teal-300">$1</span>');
    // Numbers
    html = html.replace(/\b(\d+\.?\d*)\b/g, '<span class="text-amber-300">$1</span>');
    // Keywords
    html = html.replace(
      /\b(import|from|for|in|if|else|elif|def|return|as|not|and|or|is|None|True|False|class|with|while|print)\b/g,
      '<span class="text-purple-300">$1</span>'
    );
    // Function names after def
    html = html.replace(/def (\w+)/g, 'def <span class="text-blue-300">$1</span>');

    return (
      <div key={i} className="flex hover:bg-slate-800/40">
        <span className="select-none text-slate-600 font-mono text-xs pr-4 pl-4 text-right w-12 flex-shrink-0">{i + 1}</span>
        <span className="font-mono text-xs text-slate-100 whitespace-pre pr-4" dangerouslySetInnerHTML={{ __html: html || " " }} />
      </div>
    );
  });
}

export default function ScriptDialog({ open, onOpenChange, config }) {
  const [copied, setCopied] = useState(false);
  const code = generateScript(config);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success("Script copied to clipboard");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Unable to copy");
    }
  };

  const download = () => {
    const blob = new Blob([code], { type: "text/x-python;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const basename = (config.name || "manila-experiment").trim().replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "") || "manila-experiment";
    link.href = url;
    link.download = `${basename}.py`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Runnable experiment script downloaded");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="script-dialog" className="max-w-4xl bg-white p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-200">
          <DialogTitle className="flex items-center gap-2 font-sans">
            <FileCode2 className="w-5 h-5 text-slate-700" strokeWidth={1.5} />
            Generated experiment script
          </DialogTitle>
          <p className="text-sm text-slate-500 mt-1">A runnable reproduction script that uses the same validation, preprocessing, fairness, and training engine as this application.</p>
        </DialogHeader>

        <div className="bg-slate-900 max-h-[60vh] overflow-y-auto overflow-x-auto code-scroll py-3">
          {highlight(code)}
        </div>

        <div className="flex items-center justify-between p-4 border-t border-slate-200 bg-slate-50">
          <div className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
            {code.split("\n").length} lines · uses scikit-learn and Fairlearn
          </div>
          <div className="flex gap-2">
            <Button data-testid="copy-script-btn" onClick={copy} variant="outline" size="sm" className="border-slate-300">
              {copied ? <><Check className="w-3.5 h-3.5 mr-1.5" strokeWidth={2} /> Copied</> : <><Copy className="w-3.5 h-3.5 mr-1.5" strokeWidth={1.5} /> Copy script</>}
            </Button>
            <Button data-testid="download-script-from-preview-btn" onClick={download} size="sm" className="bg-slate-900 text-white">
              <Download className="w-3.5 h-3.5 mr-1.5" strokeWidth={1.5} /> Download .py
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
