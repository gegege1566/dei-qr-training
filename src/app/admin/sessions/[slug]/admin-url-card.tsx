"use client";

import { useState } from "react";
import { Copy, Check, KeyRound } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function AdminUrlCard({ adminUrl }: { adminUrl: string }) {
  const [copied, setCopied] = useState(false);

  const fullUrl = typeof window !== "undefined"
    ? `${window.location.origin}${adminUrl}`
    : adminUrl;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="border-0 bg-amber-500/10 ring-1 ring-amber-500/30">
      <CardContent className="flex flex-col gap-3 py-4">
        <div className="flex items-center gap-2">
          <KeyRound className="size-4 text-amber-400" />
          <p className="text-sm font-semibold text-amber-300">管理URL（このURLを保存してください）</p>
        </div>
        <p className="text-xs text-amber-400/70">
          このURLを知っている人だけがセッションの結果を閲覧できます。ブックマークするか、安全な場所に保存してください。
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 overflow-x-auto rounded-md bg-slate-900/80 px-3 py-2 text-xs text-slate-300">
            {fullUrl}
          </code>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="shrink-0 border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
