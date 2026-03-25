"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Eye, MessageSquare, BarChart3, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const volumes = [
  { id: "S", label: "S", questions: 3, time: "約3分", description: "サクッと体験" },
  { id: "M", label: "M", questions: 5, time: "約5分", description: "しっかり学ぶ" },
  { id: "L", label: "L", questions: 8, time: "約10分", description: "じっくり取り組む" },
] as const;

type VolumeId = (typeof volumes)[number]["id"];

const steps = [
  {
    icon: Eye,
    title: "バナーを観察",
    description: "表示されるバナー広告をDEIの視点で注意深く観察します",
  },
  {
    icon: MessageSquare,
    title: "問題点を指摘",
    description: "気づいた問題点をテキストで入力します",
  },
  {
    icon: BarChart3,
    title: "AIが評価",
    description: "AIがあなたの回答を分析し、詳細なフィードバックを提供します",
  },
];

const container = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

export default function Home() {
  const [selectedVolume, setSelectedVolume] = useState<VolumeId | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [nickname, setNickname] = useState("");
  const router = useRouter();

  async function handleStart() {
    if (!selectedVolume) return;
    setIsStarting(true);

    try {
      const res = await fetch("/api/play/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ volume: selectedVolume, nickname: nickname.trim() || undefined }),
      });

      if (!res.ok) {
        throw new Error("セッションの開始に失敗しました");
      }

      const data = await res.json();
      router.push(`/play/${data.publicId}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "エラーが発生しました"
      );
      setIsStarting(false);
    }
  }

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden px-4 pt-16 pb-12 sm:pt-24 sm:pb-16">
        {/* Background glow */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-[400px] w-[600px] rounded-full bg-cyan-500/10 blur-3xl" />
        </div>

        <motion.div
          className="relative mx-auto max-w-2xl text-center"
          initial="hidden"
          animate="show"
          variants={container}
        >
          <motion.h1
            className="text-4xl font-bold tracking-tight sm:text-5xl"
            variants={fadeUp}
          >
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              DEIの視点を磨こう
            </span>
          </motion.h1>

          <motion.p
            className="mt-4 text-base leading-relaxed text-slate-400 sm:text-lg"
            variants={fadeUp}
          >
            バナー広告のDEI問題点を見つけて、AIが評価します
          </motion.p>
        </motion.div>
      </section>

      {/* Nickname */}
      <section className="px-4 pb-6">
        <motion.div
          className="mx-auto max-w-md"
          initial="hidden"
          animate="show"
          variants={container}
        >
          <motion.p
            className="mb-3 text-center text-sm font-medium text-slate-400"
            variants={fadeUp}
          >
            ニックネーム
          </motion.p>
          <motion.div variants={fadeUp} className="flex gap-2">
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="空欄ならランダムで付きます"
              className="flex-1 rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/40"
            />
            <button
              type="button"
              onClick={() => {
                const pool = ["閃光のクリエイター", "蒼天のナビゲーター", "深緑のストラテジスト", "黄金のイノベーター", "紅蓮のアナリスト", "白銀のメンター", "碧空のチャレンジャー", "暁のファシリテーター"];
                setNickname(pool[Math.floor(Math.random() * pool.length)]);
              }}
              className="shrink-0 rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2.5 text-xs text-cyan-400 transition-colors hover:border-cyan-500/40 hover:bg-slate-700/60"
            >
              おまかせ
            </button>
          </motion.div>
        </motion.div>
      </section>

      {/* Volume Selection */}
      <section className="px-4 pb-8">
        <motion.div
          className="mx-auto max-w-md"
          initial="hidden"
          animate="show"
          variants={container}
        >
          <motion.p
            className="mb-4 text-center text-sm font-medium text-slate-400"
            variants={fadeUp}
          >
            出題ボリュームを選択
          </motion.p>

          <div className="grid grid-cols-3 gap-3">
            {volumes.map((vol) => (
              <motion.div key={vol.id} variants={fadeUp}>
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setSelectedVolume(vol.id)}
                  className="w-full text-left"
                >
                  <Card
                    className={cn(
                      "cursor-pointer border-0 bg-slate-800/60 ring-1 ring-white/10 transition-all",
                      selectedVolume === vol.id
                        ? "ring-2 ring-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.15)]"
                        : "hover:ring-white/20"
                    )}
                  >
                    <CardContent className="flex flex-col items-center gap-1 py-2 text-center">
                      <span
                        className={cn(
                          "text-2xl font-bold sm:text-3xl",
                          selectedVolume === vol.id
                            ? "text-cyan-400"
                            : "text-white"
                        )}
                      >
                        {vol.label}
                      </span>
                      <span className="text-sm font-medium text-slate-300">
                        {vol.questions}問
                      </span>
                      <span className="text-xs text-slate-500">{vol.time}</span>
                      <span className="mt-1 text-xs text-slate-500 hidden sm:block">
                        {vol.description}
                      </span>
                    </CardContent>
                  </Card>
                </motion.button>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Start Button */}
      <section className="px-4 pb-16">
        <div className="mx-auto max-w-md">
          <motion.button
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-xl px-6 py-4 text-base font-semibold text-white shadow-lg transition-all",
              selectedVolume
                ? "bg-gradient-to-r from-cyan-500 to-blue-600 hover:shadow-cyan-500/25 hover:shadow-xl"
                : "cursor-not-allowed bg-slate-700 text-slate-400"
            )}
            whileTap={selectedVolume ? { scale: 0.97 } : undefined}
            onClick={handleStart}
            disabled={!selectedVolume || isStarting}
          >
            {isStarting ? (
              <>
                <span className="inline-block size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                準備中...
              </>
            ) : (
              <>
                スタート
                <ArrowRight className="size-4" />
              </>
            )}
          </motion.button>
        </div>
      </section>

      {/* How It Works */}
      <section id="howto" className="scroll-mt-16 px-4 pb-20">
        <div className="mx-auto max-w-2xl">
          <motion.h2
            className="mb-8 text-center text-xl font-bold text-white sm:text-2xl"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5 }}
          >
            使い方
          </motion.h2>

          <motion.div
            className="grid gap-4 sm:grid-cols-3"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-40px" }}
            variants={container}
          >
            {steps.map((step, i) => (
              <motion.div key={step.title} variants={fadeUp}>
                <Card className="h-full border-0 bg-slate-800/40 ring-1 ring-white/10">
                  <CardContent className="flex flex-col items-center gap-3 py-6 text-center">
                    <div className="flex size-12 items-center justify-center rounded-full bg-cyan-500/15">
                      <step.icon className="size-5 text-cyan-400" />
                    </div>
                    <span className="text-xs font-medium text-cyan-400">
                      STEP {i + 1}
                    </span>
                    <h3 className="text-base font-semibold text-white">
                      {step.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-slate-400">
                      {step.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-6">
        <p className="text-center text-xs text-slate-600">
          &copy; {new Date().getFullYear()} DEI Training
        </p>
      </footer>
    </div>
  );
}
