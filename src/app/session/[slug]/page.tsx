"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Loader2, Lock } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SessionInfo = {
  title: string;
  description?: string;
  status: string;
  requiresPassword: boolean;
};

const volumes = [
  { id: "S", questions: 3, time: "約3分" },
  { id: "M", questions: 5, time: "約5分" },
  { id: "L", questions: 8, time: "約10分" },
] as const;

type VolumeId = (typeof volumes)[number]["id"];

export default function SessionJoinPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();

  const [info, setInfo] = useState<SessionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [selectedVolume, setSelectedVolume] = useState<VolumeId>("M");
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    fetch(`/api/session/${slug}/info`)
      .then((res) => {
        if (!res.ok) throw new Error("セッションが見つかりません");
        return res.json();
      })
      .then((data) => setInfo(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug]);

  const handleJoin = async () => {
    if (!info) return;
    setJoining(true);

    try {
      const res = await fetch(`/api/session/${slug}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          volume: selectedVolume,
          password: info.requiresPassword ? password : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "参加に失敗しました");
      }

      const data = await res.json();
      router.push(`/play/${data.publicId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "エラーが発生しました");
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (error || !info) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-xl font-bold text-white">セッションが見つかりません</h1>
        <p className="text-sm text-slate-400">{error || "URLを確認してください"}</p>
      </div>
    );
  }

  if (info.status !== "active") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-xl font-bold text-white">このセッションは現在参加できません</h1>
        <p className="text-sm text-slate-400">管理者にお問い合わせください</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <p className="text-xs uppercase tracking-[0.3em] text-cyan-400">研修セッション</p>
        <h1 className="mt-2 text-2xl font-bold text-white">{info.title}</h1>
        {info.description && (
          <p className="mt-2 text-sm text-slate-400">{info.description}</p>
        )}
      </motion.div>

      {/* Password */}
      {info.requiresPassword && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-0 bg-slate-800/60 ring-1 ring-white/10">
            <CardContent className="space-y-2 pt-5">
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <Lock className="size-4 text-cyan-400" />
                パスワード
              </div>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="パスワードを入力"
                className="border-slate-700 bg-slate-900/60 text-white placeholder:text-slate-500"
              />
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Volume Selection */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-3 gap-3"
      >
        {volumes.map((v) => (
          <button
            key={v.id}
            onClick={() => setSelectedVolume(v.id)}
            className={cn(
              "flex flex-col items-center gap-1 rounded-xl border p-4 transition-all",
              selectedVolume === v.id
                ? "border-cyan-400 bg-cyan-400/10 ring-1 ring-cyan-400/30"
                : "border-slate-700 bg-slate-800/60 hover:border-slate-600"
            )}
          >
            <span className="text-2xl font-bold text-white">{v.id}</span>
            <span className="text-xs text-slate-400">{v.questions}問</span>
            <span className="text-xs text-slate-500">{v.time}</span>
          </button>
        ))}
      </motion.div>

      {/* Join Button */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Button
          onClick={handleJoin}
          disabled={joining || (info.requiresPassword && !password)}
          className="h-12 w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-base font-semibold text-white shadow-md shadow-cyan-500/20 disabled:opacity-40"
        >
          {joining ? (
            <span className="flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" />
              参加中...
            </span>
          ) : (
            "セッションに参加する"
          )}
        </Button>
      </motion.div>
    </div>
  );
}
