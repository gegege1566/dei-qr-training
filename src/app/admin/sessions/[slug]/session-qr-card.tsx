"use client";

import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Check } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type SessionQRCardProps = {
  slug: string;
};

export function SessionQRCard({ slug }: SessionQRCardProps) {
  const [entryUrl, setEntryUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setEntryUrl(`${window.location.origin}/session/${slug}`);
  }, [slug]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(entryUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!entryUrl) return null;

  return (
    <Card className="border-0 bg-slate-800/60 ring-1 ring-white/10">
      <CardHeader>
        <CardTitle className="text-white">QRコード</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <div className="rounded-xl bg-white p-4">
          <QRCodeSVG value={entryUrl} size={180} level="M" includeMargin />
        </div>
        <p className="text-center text-sm text-slate-400">
          受講者はこのQRを読み込むか、以下のURLにアクセスします。
        </p>
        <div className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-center font-mono text-sm text-slate-300">
          {entryUrl}
        </div>
        <Button
          onClick={handleCopy}
          className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white"
        >
          {copied ? (
            <span className="flex items-center gap-1.5">
              <Check className="size-4" />
              コピー済み
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <Copy className="size-4" />
              リンクをコピー
            </span>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
