"use client";

import { useState } from "react";
import { ChevronDown, User, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type ResponseData = {
  order: number;
  answerText: string;
  scorePoint: number;
  scoreAccuracy: number;
  scoreIdea: number;
  totalScore: number;
  evaluationSummary: string | null;
  evaluatedAt: number | null;
  mediumCategory: string;
  imagePath: string;
};

type ParticipantData = {
  id: string;
  publicId: string;
  nickname: string;
  volumeLevel: string;
  questionCount: number;
  completedAt: number | null;
  score100: number;
  responses: ResponseData[];
};

function scoreColor(score: number, max: number) {
  const pct = (score / max) * 100;
  if (pct >= 70) return "bg-emerald-500";
  if (pct >= 50) return "bg-yellow-500";
  return "bg-red-500";
}

function gradeLabel(score100: number) {
  if (score100 >= 90) return { label: "S", color: "text-cyan-400" };
  if (score100 >= 80) return { label: "A", color: "text-emerald-400" };
  if (score100 >= 70) return { label: "B", color: "text-blue-400" };
  if (score100 >= 60) return { label: "C", color: "text-yellow-400" };
  return { label: "D", color: "text-red-400" };
}

export function ParticipantDetails({ participants }: { participants: ParticipantData[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {participants.map((p) => {
        const isOpen = expandedId === p.id;
        const grade = gradeLabel(p.score100);
        const isCompleted = !!p.completedAt;
        const isEvaluated = p.responses.every((r) => r.evaluatedAt !== null);

        return (
          <Card key={p.id} className="border-0 bg-slate-800/60 ring-1 ring-white/10 overflow-hidden">
            {/* Header - clickable */}
            <button
              onClick={() => setExpandedId(isOpen ? null : p.id)}
              className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-slate-700/30"
            >
              <div className="flex size-10 items-center justify-center rounded-full bg-slate-700/60">
                <User className="size-5 text-slate-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white truncate">{p.nickname}</span>
                  <Badge className="bg-slate-700 text-slate-300 text-[10px]">{p.volumeLevel}</Badge>
                  {!isCompleted && (
                    <Badge className="bg-yellow-600/30 text-yellow-300 text-[10px]">回答中</Badge>
                  )}
                  {isCompleted && !isEvaluated && (
                    <Badge className="bg-blue-600/30 text-blue-300 text-[10px]">評価中</Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
                  <span>{p.responses.length}/{p.questionCount}問回答</span>
                  {p.completedAt && (
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" />
                      {new Date(p.completedAt).toLocaleString("ja-JP")}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {isCompleted && isEvaluated && (
                  <div className="text-right">
                    <span className={cn("text-2xl font-bold", grade.color)}>{p.score100}</span>
                    <span className="text-xs text-slate-500">/100</span>
                  </div>
                )}
                <ChevronDown className={cn("size-5 text-slate-400 transition-transform", isOpen && "rotate-180")} />
              </div>
            </button>

            {/* Expanded detail */}
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="border-t border-slate-700/50 px-4 py-4 space-y-4">
                    {p.responses.length === 0 ? (
                      <p className="text-sm text-slate-500">まだ回答がありません。</p>
                    ) : (
                      p.responses.map((r) => (
                        <div key={r.order} className="space-y-3 rounded-lg border border-slate-700/40 bg-slate-900/40 p-4">
                          {/* Question header */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-cyan-400">問題 {r.order + 1}</span>
                              <Badge className="bg-slate-700 text-slate-300 text-[10px]">{r.mediumCategory}</Badge>
                            </div>
                            {r.evaluatedAt && (
                              <span className="text-sm font-bold text-white">{r.totalScore}/30</span>
                            )}
                          </div>

                          {/* Banner image */}
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={r.imagePath}
                            alt={`問題 ${r.order + 1}`}
                            className="w-full max-h-40 object-contain rounded-md bg-slate-800"
                            loading="lazy"
                          />

                          {/* Answer */}
                          <div>
                            <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">回答</p>
                            <p className="rounded-md bg-slate-800/80 px-3 py-2 text-sm text-slate-200 leading-relaxed">
                              {r.answerText}
                            </p>
                          </div>

                          {/* Scores */}
                          {r.evaluatedAt && (
                            <>
                              <div className="grid grid-cols-3 gap-2">
                                {[
                                  { label: "指摘のポイント", score: r.scorePoint },
                                  { label: "正確さ", score: r.scoreAccuracy },
                                  { label: "改善アイデア", score: r.scoreIdea },
                                ].map((s) => (
                                  <div key={s.label} className="space-y-1">
                                    <div className="flex justify-between text-[10px]">
                                      <span className="text-slate-400">{s.label}</span>
                                      <span className="font-bold text-white">{s.score}/10</span>
                                    </div>
                                    <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden">
                                      <div
                                        className={cn("h-full rounded-full transition-all", scoreColor(s.score, 10))}
                                        style={{ width: `${(s.score / 10) * 100}%` }}
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>

                              {/* Evaluation comment */}
                              {r.evaluationSummary && (
                                <div>
                                  <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">AI評価コメント</p>
                                  <p className="rounded-md border border-slate-700/40 bg-slate-800/60 px-3 py-2 text-xs text-slate-300 leading-relaxed">
                                    {r.evaluationSummary}
                                  </p>
                                </div>
                              )}
                            </>
                          )}

                          {!r.evaluatedAt && (
                            <p className="text-xs text-slate-500 italic">評価待ち...</p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        );
      })}
    </div>
  );
}
