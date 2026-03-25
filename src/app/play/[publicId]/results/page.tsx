"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import {
  motion,
  useMotionValue,
  useTransform,
  animate,
  useInView,
} from "framer-motion";
import { Brain, Sparkles, Copy, RotateCcw, Check } from "lucide-react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type QuestionResult = {
  order: number;
  question: {
    id: string;
    number: number;
    majorCategory: string;
    mediumCategory: string;
    minorCategory: string;
    minorSummary: string | null;
    bannerInsight: string | null;
    imagePath: string;
  };
  answerText: string;
  scorePoint: number;
  scoreAccuracy: number;
  scoreIdea: number;
  totalScore: number;
  evaluationSummary: string | null;
};

type RadarDatum = {
  category: string;
  deviation: number;
};

type ResultsResponse = {
  participant: {
    nickname: string;
    volumeLevel: string;
    questionCount: number;
    totalScore: number;
    maxScore: number;
  };
  questions: QuestionResult[];
  radarData: RadarDatum[];
  evaluationComplete: boolean;
  showResultsToParticipant: boolean;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function getGrade(pct: number): { label: string; color: string } {
  if (pct >= 90) return { label: "S", color: "text-cyan-300" };
  if (pct >= 80) return { label: "A", color: "text-cyan-400" };
  if (pct >= 70) return { label: "B", color: "text-green-400" };
  if (pct >= 60) return { label: "C", color: "text-yellow-400" };
  return { label: "D", color: "text-red-400" };
}

function scoreBarColor(score: number): string {
  if (score >= 8) return "bg-green-400";
  if (score >= 5) return "bg-yellow-400";
  return "bg-red-400";
}

function scoreTextColor(score: number): string {
  if (score >= 8) return "text-green-400";
  if (score >= 5) return "text-yellow-400";
  return "text-red-400";
}

function pctColor(pct: number): string {
  if (pct > 70) return "stroke-cyan-400";
  if (pct >= 50) return "stroke-yellow-400";
  return "stroke-red-400";
}

// ---------------------------------------------------------------------------
// Animated counter
// ---------------------------------------------------------------------------

function AnimatedCounter({
  value,
  duration = 1.5,
}: {
  value: number;
  duration?: number;
}) {
  const motionVal = useMotionValue(0);
  const rounded = useTransform(motionVal, (v) => Math.round(v));
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const controls = animate(motionVal, value, {
      duration,
      ease: "easeOut",
    });
    const unsub = rounded.on("change", (v) => setDisplay(v));
    return () => {
      controls.stop();
      unsub();
    };
  }, [value, duration, motionVal, rounded]);

  return <>{display}</>;
}

// ---------------------------------------------------------------------------
// Score ring (SVG arc)
// ---------------------------------------------------------------------------

function ScoreRing({
  percentage,
  size = 200,
  strokeWidth = 12,
}: {
  percentage: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <svg width={size} height={size} className="-rotate-90">
      {/* Background ring */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        className="text-slate-700"
        strokeWidth={strokeWidth}
      />
      {/* Progress ring */}
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        className={pctColor(percentage)}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: circumference * (1 - percentage / 100) }}
        transition={{ duration: 1.8, ease: "easeOut", delay: 0.3 }}
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Score bar for individual criteria
// ---------------------------------------------------------------------------

function ScoreBar({
  label,
  score,
  max = 10,
}: {
  label: string;
  score: number;
  max?: number;
}) {
  const pct = (score / max) * 100;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-300">{label}</span>
        <span className={`font-mono font-semibold ${scoreTextColor(score)}`}>
          {score}/{max}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-700 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${scoreBarColor(score)}`}
          initial={{ width: 0 }}
          whileInView={{ width: `${pct}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Question card
// ---------------------------------------------------------------------------

function QuestionCard({
  result,
  index,
}: {
  result: QuestionResult;
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.08 }}
    >
      <Card className="bg-slate-800/80 border-slate-700 text-white overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <CardTitle className="text-base text-white">
              問題 {result.order + 1}
            </CardTitle>
            <Badge
              variant="secondary"
              className="bg-cyan-900/60 text-cyan-300 border-cyan-700/50"
            >
              {result.question.mediumCategory}
            </Badge>
          </div>
        </CardHeader>

        {/* Banner image */}
        <div className="px-4">
          <div className="relative w-full overflow-hidden rounded-lg bg-slate-900">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={result.question.imagePath}
              alt={`問題 ${result.order + 1} バナー`}
              className="w-full h-auto object-contain"
              loading="lazy"
            />
          </div>
        </div>

        <CardContent className="space-y-4 pt-3">
          {/* User answer */}
          <div>
            <p className="text-xs font-medium text-slate-400 mb-1.5">
              あなたの回答:
            </p>
            <blockquote className="border-l-2 border-cyan-500/50 pl-3 text-sm text-slate-200 italic leading-relaxed">
              {result.answerText}
            </blockquote>
          </div>

          <Separator className="bg-slate-700" />

          {/* Score bars */}
          <div className="space-y-2.5">
            <ScoreBar label="指摘のポイント" score={result.scorePoint} />
            <ScoreBar label="正確さ" score={result.scoreAccuracy} />
            <ScoreBar label="改善アイデア" score={result.scoreIdea} />
          </div>

          {/* Total for this question */}
          <div className="flex items-center justify-between rounded-lg bg-slate-900/60 px-3 py-2">
            <span className="text-sm font-medium text-slate-300">
              この問題の合計
            </span>
            <span className="font-mono text-lg font-bold text-white">
              {result.totalScore}
              <span className="text-slate-500 text-sm font-normal">/30</span>
            </span>
          </div>

          {/* AI evaluation comment */}
          {result.evaluationSummary && (
            <div>
              <p className="text-xs font-medium text-slate-400 mb-1.5">
                AI評価コメント:
              </p>
              <div className="rounded-lg bg-slate-900/60 border border-slate-700/50 p-3 text-sm text-slate-200 leading-relaxed">
                {result.evaluationSummary}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Custom radar tick for long Japanese labels
// ---------------------------------------------------------------------------

function RadarTickLabel({
  x,
  y,
  payload,
}: {
  x?: number;
  y?: number;
  payload?: { value: string };
}) {
  if (!payload) return null;
  const label = payload.value;
  const cx = x ?? 0;
  const cy = y ?? 0;

  // Split long labels into lines of ~8 chars
  const lines: string[] = [];
  for (let i = 0; i < label.length; i += 8) {
    lines.push(label.slice(i, i + 8));
  }

  return (
    <text
      x={cx}
      y={cy}
      textAnchor="middle"
      dominantBaseline="central"
      className="fill-slate-300 text-[10px]"
    >
      {lines.map((line, i) => (
        <tspan key={i} x={cx} dy={i === 0 ? 0 : 13}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

// ---------------------------------------------------------------------------
// Loading state
// ---------------------------------------------------------------------------

function LoadingState({ evaluatedCount, totalCount }: { evaluatedCount: number; totalCount: number }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 min-h-[80vh]">
      <motion.div
        className="relative"
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="relative flex items-center justify-center">
          <motion.div
            className="absolute"
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          >
            <Sparkles className="size-16 text-cyan-400/30" />
          </motion.div>
          <Brain className="size-12 text-cyan-400" />
        </div>
      </motion.div>

      <motion.p
        className="text-lg font-medium text-slate-200"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        AIが回答を評価中です...
      </motion.p>

      {totalCount > 0 && (
        <p className="text-sm text-slate-400">
          {evaluatedCount}/{totalCount} 問を評価済み
        </p>
      )}

      {/* Spinner bar */}
      <div className="w-48 h-1.5 rounded-full bg-slate-800 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-cyan-500"
          animate={{ x: ["-100%", "200%"] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          style={{ width: "40%" }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function ResultsPage() {
  const { publicId } = useParams<{ publicId: string }>();
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const { data, error } = useSWR<ResultsResponse>(
    publicId ? `/api/play/${publicId}/results` : null,
    fetcher,
    {
      refreshInterval: (latestData) =>
        latestData?.evaluationComplete ? 0 : 3000,
      revalidateOnFocus: false,
    },
  );

  // Derived values
  const evaluatedCount = useMemo(() => {
    if (!data?.questions) return 0;
    return data.questions.filter((q) => q.evaluationSummary !== null).length;
  }, [data?.questions]);

  const percentage = useMemo(() => {
    if (!data?.participant) return 0;
    const { totalScore, maxScore } = data.participant;
    if (maxScore === 0) return 0;
    return Math.round((totalScore / maxScore) * 100);
  }, [data?.participant]);

  const grade = useMemo(() => getGrade(percentage), [percentage]);

  const handleCopyScore = useCallback(async () => {
    if (!data?.participant) return;
    const text = `DEI研修トレーニング結果: ${data.participant.totalScore}/${data.participant.maxScore}点 (${percentage}%) - 評価: ${grade.label}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  }, [data?.participant, percentage, grade.label]);

  // Error state
  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 min-h-[80vh]">
        <p className="text-slate-400">結果を読み込めませんでした。</p>
        <Button
          variant="outline"
          className="border-slate-600 text-slate-300"
          onClick={() => router.push("/")}
        >
          トップに戻る
        </Button>
      </div>
    );
  }

  // Loading / polling state
  if (!data || !data.evaluationComplete) {
    return (
      <LoadingState
        evaluatedCount={evaluatedCount}
        totalCount={data?.participant?.questionCount ?? 0}
      />
    );
  }

  const { participant, questions: questionResults, radarData } = data;

  // If results are hidden for this session's participants
  if (data.showResultsToParticipant === false) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-6 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="flex size-20 items-center justify-center rounded-full bg-cyan-400/10">
            <Check className="size-10 text-cyan-400" />
          </div>
          <h2 className="text-2xl font-bold text-white">回答が完了しました</h2>
          <p className="text-sm text-slate-400 max-w-xs">
            お疲れさまでした。結果は管理者から後日共有されます。
          </p>
          <Button
            onClick={() => router.push("/")}
            className="mt-4 bg-gradient-to-r from-cyan-500 to-blue-600 px-8 py-3 text-white"
          >
            トップに戻る
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg px-4 pb-12 pt-6 space-y-8">
      {/* ── Score Hero ── */}
      <motion.section
        className="flex flex-col items-center gap-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="relative flex items-center justify-center">
          <ScoreRing percentage={percentage} size={192} strokeWidth={10} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono text-4xl font-bold text-white leading-none">
              <AnimatedCounter value={participant.totalScore} />
            </span>
            <span className="text-sm text-slate-400 mt-0.5">
              / {participant.maxScore}
            </span>
            <span className="text-xs text-slate-500 mt-1">
              {percentage}%
            </span>
          </div>
        </div>

        <motion.div
          className={`text-5xl font-black ${grade.color}`}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.5 }}
        >
          {grade.label}
        </motion.div>

        <p className="text-sm text-slate-400">
          {participant.nickname} さんの結果
        </p>
      </motion.section>

      {/* ── Radar Chart ── */}
      {radarData.length >= 3 && (
        <motion.section
          className="space-y-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
        >
          <h2 className="text-base font-semibold text-white text-center">
            中分類別 偏差値チャート
          </h2>

          <Card className="bg-slate-800/80 border-slate-700">
            <CardContent className="p-2">
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart
                  data={radarData}
                  cx="50%"
                  cy="50%"
                  outerRadius="70%"
                >
                  <PolarGrid stroke="#475569" />
                  <PolarAngleAxis
                    dataKey="category"
                    tick={(props: Record<string, unknown>) => (
                      <RadarTickLabel
                        x={props.x as number}
                        y={props.y as number}
                        payload={props.payload as { value: string }}
                      />
                    )}
                  />
                  <PolarRadiusAxis
                    angle={90}
                    domain={[0, 80]}
                    tick={false}
                    axisLine={false}
                  />
                  {/* Reference line at deviation 50 */}
                  <Radar
                    name="平均"
                    dataKey={() => 50}
                    stroke="#64748b"
                    strokeDasharray="4 4"
                    fill="none"
                    strokeWidth={1}
                  />
                  <Radar
                    name="偏差値"
                    dataKey="deviation"
                    stroke="#f472b6"
                    fill="#f472b6"
                    fillOpacity={0.25}
                    strokeWidth={2.5}
                  />
                </RadarChart>
              </ResponsiveContainer>
              <p className="text-center text-xs text-slate-500 pb-1">
                破線 = 偏差値50（平均）
              </p>
            </CardContent>
          </Card>
        </motion.section>
      )}

      {/* ── Question-by-Question Breakdown ── */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold text-white text-center">
          回答詳細
        </h2>

        {questionResults.map((result, idx) => (
          <QuestionCard key={result.question.id} result={result} index={idx} />
        ))}
      </section>

      {/* ── Bottom Actions ── */}
      <motion.section
        className="flex flex-col gap-3 pt-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.5 }}
      >
        <Button
          size="lg"
          className="w-full h-12 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-base"
          onClick={() => router.push("/")}
        >
          <RotateCcw className="size-4 mr-2" />
          もう一度チャレンジ
        </Button>

        <Button
          variant="outline"
          size="lg"
          className="w-full h-12 border-slate-600 text-slate-300 hover:bg-slate-800 text-base"
          onClick={handleCopyScore}
        >
          {copied ? (
            <>
              <Check className="size-4 mr-2 text-green-400" />
              コピーしました!
            </>
          ) : (
            <>
              <Copy className="size-4 mr-2" />
              結果をシェア
            </>
          )}
        </Button>
      </motion.section>
    </div>
  );
}
