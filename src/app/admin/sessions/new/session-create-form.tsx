"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState, useTransition } from "react";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS = [
  { value: "draft", label: "下書き" },
  { value: "active", label: "公開中" },
  { value: "closed", label: "終了" },
] as const;

type CategoryGroup = {
  majorCategory: string;
  mediumCategories: string[];
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[ぁ-ん]/g, "")
    .replace(/[ァ-ヶ]/g, "")
    .replace(/[一-龥]/g, "")
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

export function SessionCreateForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");

  // New fields
  const [questionCount, setQuestionCount] = useState(5);
  const [questionMode, setQuestionMode] = useState<"random" | "fixed">("random");
  const [showResults, setShowResults] = useState(true);
  const [categories, setCategories] = useState<CategoryGroup[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [allCategoriesSelected, setAllCategoriesSelected] = useState(true);
  const [expandedMajors, setExpandedMajors] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/admin/categories")
      .then((res) => res.json())
      .then((data) => {
        setCategories(data.categories);
        const all = new Set<string>();
        for (const group of data.categories) {
          for (const mc of group.mediumCategories) {
            all.add(mc);
          }
        }
        setSelectedCategories(all);
      });
  }, []);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    const generated = slugify(value);
    if (generated) setSlug(generated);
  };

  const toggleAllCategories = (checked: boolean) => {
    setAllCategoriesSelected(checked);
    if (checked) {
      const all = new Set<string>();
      for (const group of categories) {
        for (const mc of group.mediumCategories) all.add(mc);
      }
      setSelectedCategories(all);
    } else {
      setSelectedCategories(new Set());
    }
  };

  const toggleMajor = (major: string) => {
    setExpandedMajors((prev) => {
      const next = new Set(prev);
      if (next.has(major)) next.delete(major);
      else next.add(major);
      return next;
    });
  };

  const toggleMajorAll = (group: CategoryGroup, checked: boolean) => {
    setAllCategoriesSelected(false);
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      for (const mc of group.mediumCategories) {
        if (checked) next.add(mc);
        else next.delete(mc);
      }
      return next;
    });
  };

  const toggleCategory = (mc: string) => {
    setAllCategoriesSelected(false);
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(mc)) next.delete(mc);
      else next.add(mc);
      return next;
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const payload = {
        title: formData.get("title")?.toString().trim(),
        description: formData.get("description")?.toString().trim(),
        slug: formData.get("slug")?.toString().trim(),
        status: formData.get("status")?.toString() ?? "draft",
        allowedVolumes: formData.getAll("volumes").map((v) => v.toString()),
        questionCount,
        allowedCategories: allCategoriesSelected ? undefined : Array.from(selectedCategories),
        questionMode,
        showResultsToParticipant: showResults,
        participantPassword: formData.get("participantPassword")?.toString().trim() || undefined,
      };

      const res = await fetch("/api/admin/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const json = await res.json();
        setError(json.message ?? json.error ?? "セッション作成に失敗しました");
        return;
      }

      const json = await res.json();
      router.push(`/admin/sessions/${json.session.slug}?token=${json.session.adminToken}`);
      router.refresh();
    });
  };

  const totalMediums = categories.reduce((sum, g) => sum + g.mediumCategories.length, 0);

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="space-y-6"
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
    >
      {/* Basic Info */}
      <motion.div variants={fadeUp}>
        <Card className="border-0 bg-slate-800/60 ring-1 ring-white/10">
          <CardHeader>
            <CardTitle className="text-white">基本情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-slate-300">タイトル</Label>
              <Input
                id="title" name="title" required
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="例: 2025 Q1 DEI トレーニング"
                className="border-slate-700 bg-slate-900/60 text-white placeholder:text-slate-500"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="slug" className="text-slate-300">slug（URL用）</Label>
              <Input
                id="slug" name="slug" required pattern="[a-z0-9-]+"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="q1-dei-training"
                className="border-slate-700 bg-slate-900/60 font-mono text-white placeholder:text-slate-500"
              />
              <p className="text-xs text-slate-500">半角英数字とハイフンのみ。受講者の参加URLに使われます。</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-slate-300">説明文（任意）</Label>
              <textarea
                id="description" name="description" rows={3}
                placeholder="社内全体DEIリテラシー向上のための演習..."
                className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-2.5 py-2 text-sm text-white placeholder:text-slate-500 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Question Settings */}
      <motion.div variants={fadeUp}>
        <Card className="border-0 bg-slate-800/60 ring-1 ring-white/10">
          <CardHeader>
            <CardTitle className="text-white">出題設定</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Question Count */}
            <div className="space-y-1.5">
              <Label className="text-slate-300">出題数</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="number" min={1} max={50}
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
                  className="w-24 border-slate-700 bg-slate-900/60 text-white"
                />
                <span className="text-sm text-slate-400">問</span>
              </div>
            </div>

            {/* Question Mode */}
            <div className="space-y-2">
              <Label className="text-slate-300">出題方式</Label>
              <div className="flex flex-col gap-2">
                <label className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 transition-colors",
                  questionMode === "random"
                    ? "border-cyan-400/60 bg-cyan-400/5"
                    : "border-slate-700 bg-slate-900/40 hover:border-slate-600"
                )}>
                  <input
                    type="radio" name="questionMode" value="random"
                    checked={questionMode === "random"}
                    onChange={() => setQuestionMode("random")}
                    className="mt-0.5 accent-cyan-400"
                  />
                  <div>
                    <p className="text-sm font-medium text-white">ランダム出題</p>
                    <p className="text-xs text-slate-400">各受講者に異なる問題をランダムに出題します</p>
                  </div>
                </label>
                <label className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 transition-colors",
                  questionMode === "fixed"
                    ? "border-cyan-400/60 bg-cyan-400/5"
                    : "border-slate-700 bg-slate-900/40 hover:border-slate-600"
                )}>
                  <input
                    type="radio" name="questionMode" value="fixed"
                    checked={questionMode === "fixed"}
                    onChange={() => setQuestionMode("fixed")}
                    className="mt-0.5 accent-cyan-400"
                  />
                  <div>
                    <p className="text-sm font-medium text-white">全員同一問題</p>
                    <p className="text-xs text-slate-400">セッション開始時に固定された問題を全員に出題します</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Category Selection */}
            <div className="space-y-2">
              <Label className="text-slate-300">
                出題カテゴリ
                <span className="ml-2 text-xs text-slate-500">
                  ({allCategoriesSelected ? totalMediums : selectedCategories.size} / {totalMediums} 選択中)
                </span>
              </Label>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/40 px-3 py-2 text-sm text-slate-300 transition-colors hover:border-cyan-400/40 has-[:checked]:border-cyan-400 has-[:checked]:text-cyan-400">
                <input
                  type="checkbox"
                  checked={allCategoriesSelected}
                  onChange={(e) => toggleAllCategories(e.target.checked)}
                  className="accent-cyan-400"
                />
                すべてのカテゴリ
              </label>

              {!allCategoriesSelected && (
                <div className="space-y-1 rounded-lg border border-slate-700/60 bg-slate-900/30 p-2 max-h-64 overflow-y-auto">
                  {categories.map((group) => {
                    const allChecked = group.mediumCategories.every((mc) => selectedCategories.has(mc));
                    const someChecked = group.mediumCategories.some((mc) => selectedCategories.has(mc));
                    const expanded = expandedMajors.has(group.majorCategory);

                    return (
                      <div key={group.majorCategory}>
                        <div className="flex items-center gap-2 px-2 py-1.5">
                          <input
                            type="checkbox"
                            checked={allChecked}
                            ref={(el) => { if (el) el.indeterminate = someChecked && !allChecked; }}
                            onChange={(e) => toggleMajorAll(group, e.target.checked)}
                            className="accent-cyan-400"
                          />
                          <button
                            type="button"
                            className="flex flex-1 items-center gap-1 text-left text-xs font-medium text-slate-200"
                            onClick={() => toggleMajor(group.majorCategory)}
                          >
                            <ChevronDown className={cn("size-3.5 text-slate-400 transition-transform", expanded && "rotate-180")} />
                            {group.majorCategory}
                            <span className="text-slate-500">({group.mediumCategories.length})</span>
                          </button>
                        </div>
                        {expanded && (
                          <div className="ml-6 space-y-0.5 pb-1">
                            {group.mediumCategories.map((mc) => (
                              <label key={mc} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs text-slate-300 hover:bg-slate-800/60">
                                <input
                                  type="checkbox"
                                  checked={selectedCategories.has(mc)}
                                  onChange={() => toggleCategory(mc)}
                                  className="accent-cyan-400"
                                />
                                {mc}
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Results & Access */}
      <motion.div variants={fadeUp}>
        <Card className="border-0 bg-slate-800/60 ring-1 ring-white/10">
          <CardHeader>
            <CardTitle className="text-white">結果表示・公開設定</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Show results to participant */}
            <div className="space-y-2">
              <Label className="text-slate-300">回答後の結果表示</Label>
              <div className="flex flex-col gap-2">
                <label className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 transition-colors",
                  showResults
                    ? "border-cyan-400/60 bg-cyan-400/5"
                    : "border-slate-700 bg-slate-900/40 hover:border-slate-600"
                )}>
                  <input
                    type="radio" name="showResults" value="true"
                    checked={showResults}
                    onChange={() => setShowResults(true)}
                    className="mt-0.5 accent-cyan-400"
                  />
                  <div>
                    <p className="text-sm font-medium text-white">受講者に結果を表示</p>
                    <p className="text-xs text-slate-400">回答完了後、受講者自身にスコアと評価を表示します</p>
                  </div>
                </label>
                <label className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 transition-colors",
                  !showResults
                    ? "border-cyan-400/60 bg-cyan-400/5"
                    : "border-slate-700 bg-slate-900/40 hover:border-slate-600"
                )}>
                  <input
                    type="radio" name="showResults" value="false"
                    checked={!showResults}
                    onChange={() => setShowResults(false)}
                    className="mt-0.5 accent-cyan-400"
                  />
                  <div>
                    <p className="text-sm font-medium text-white">管理者のみ閲覧可能</p>
                    <p className="text-xs text-slate-400">受講者には結果を表示せず、管理者だけが確認できます</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Participant Password */}
            <div className="space-y-1.5">
              <Label htmlFor="participantPassword" className="text-slate-300">受講者パスワード（任意）</Label>
              <Input
                id="participantPassword" name="participantPassword"
                type="text"
                placeholder="設定すると、受講者はパスワード入力後に回答を開始できます"
                className="border-slate-700 bg-slate-900/60 text-white placeholder:text-slate-500"
              />
              <p className="text-xs text-slate-500">空欄の場合、パスワードなしでアクセスできます。</p>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <Label htmlFor="status" className="text-slate-300">状態</Label>
              <select
                id="status" name="status" defaultValue="draft"
                className="h-8 w-full rounded-lg border border-slate-700 bg-slate-900/60 px-2.5 text-sm text-white focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Volumes (kept for compatibility) */}
            <input type="hidden" name="volumes" value="S" />
            <input type="hidden" name="volumes" value="M" />
            <input type="hidden" name="volumes" value="L" />


          </CardContent>
        </Card>
      </motion.div>

      {/* Error & Submit */}
      <motion.div variants={fadeUp} className="space-y-3">
        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
            {error}
          </div>
        )}
        <Button
          type="submit"
          disabled={isPending || (!allCategoriesSelected && selectedCategories.size === 0)}
          className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 py-5 text-base font-semibold text-white hover:shadow-cyan-500/25 hover:shadow-lg disabled:opacity-50"
        >
          {isPending ? (
            <span className="flex items-center gap-2">
              <span className="inline-block size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              作成中...
            </span>
          ) : (
            "セッションを作成"
          )}
        </Button>
      </motion.div>
    </motion.form>
  );
}
