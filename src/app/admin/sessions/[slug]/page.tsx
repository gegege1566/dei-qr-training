import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Users, CheckCircle, MessageSquare, Download, Clock, AlertTriangle, Trophy, ChevronDown } from "lucide-react";

import { getSessionBySlug, getSessionRemainingMs } from "@/lib/db/session-service";
import { getSessionStats, getSessionLeaderboard, getSessionParticipantDetails } from "@/lib/db/stats-service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SessionQRCard } from "./session-qr-card";
import { AdminUrlCard } from "./admin-url-card";
import { ParticipantDetails } from "./participant-details";

export const dynamic = "force-dynamic";

type SessionDetailPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ token?: string }>;
};

export default async function SessionDetailPage({ params, searchParams }: SessionDetailPageProps) {
  const { slug } = await params;
  const { token } = await searchParams;
  const session = await getSessionBySlug(slug);

  if (!session) {
    notFound();
  }

  // Token authentication
  if (!token || token !== session.adminToken) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-6 px-4 py-20 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-red-500/10">
          <AlertTriangle className="size-8 text-red-400" />
        </div>
        <h1 className="text-xl font-bold text-white">アクセスが拒否されました</h1>
        <p className="text-sm text-slate-400">
          このセッションの結果を閲覧するには、作成時に発行された管理URLが必要です。
        </p>
        <Link href="/admin" className="mt-2 text-sm text-cyan-400 hover:underline">
          セッション作成に戻る
        </Link>
      </div>
    );
  }

  const remainingMs = getSessionRemainingMs(session.createdAt);
  const remainingHours = Math.floor(remainingMs / (60 * 60 * 1000));
  const remainingMinutes = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));
  const isExpiringSoon = remainingMs > 0 && remainingMs < 2 * 60 * 60 * 1000;
  const isExpired = remainingMs <= 0;

  const [stats, leaderboard, participantDetails] = await Promise.all([
    getSessionStats(session.id),
    getSessionLeaderboard(session.id, 10),
    getSessionParticipantDetails(session.id),
  ]);

  const adminUrl = `/admin/sessions/${session.slug}?token=${session.adminToken}`;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10">
      {/* Back link */}
      <Link
        href="/admin"
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-cyan-400"
      >
        <ArrowLeft className="size-3.5" />
        新しいセッションを作成
      </Link>

      {/* Expiry Warning */}
      {isExpired ? (
        <div className="flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
          <AlertTriangle className="size-5 shrink-0 text-red-400" />
          <div>
            <p className="text-sm font-medium text-red-300">このセッションは有効期限切れです</p>
            <p className="text-xs text-red-400/70">次回のクリーンアップで自動削除されます。回答データは偏差値計算用に保持されます。</p>
          </div>
        </div>
      ) : (
        <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${isExpiringSoon ? "border-yellow-500/30 bg-yellow-500/10" : "border-slate-700/60 bg-slate-800/40"}`}>
          <Clock className={`size-5 shrink-0 ${isExpiringSoon ? "text-yellow-400" : "text-slate-400"}`} />
          <div>
            <p className={`text-sm font-medium ${isExpiringSoon ? "text-yellow-300" : "text-slate-300"}`}>
              残り {remainingHours}時間 {remainingMinutes}分 で自動削除されます
            </p>
            <p className="text-xs text-slate-500">回答データは偏差値計算用に保持されます。</p>
          </div>
        </div>
      )}

      {/* Session Info */}
      <Card className="border-0 bg-slate-800/60 ring-1 ring-white/10">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-[0.3em] text-cyan-400">Session</p>
              <CardTitle className="text-2xl text-white">{session.title}</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {session.description && (
            <p className="text-sm text-slate-400">{session.description}</p>
          )}
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500">
            <span>slug: <span className="font-mono text-slate-300">{session.slug}</span></span>
            <span>出題数: <span className="text-slate-300">{session.questionCount}問</span></span>
            <span>出題方式: <span className="text-slate-300">{session.questionMode === "fixed" ? "全員同一" : "ランダム"}</span></span>
            <span>結果表示: <span className="text-slate-300">{session.showResultsToParticipant ? "受講者に表示" : "管理者のみ"}</span></span>
            <span>パスワード: <span className="text-slate-300">{session.participantPassword ? "あり" : "なし"}</span></span>
          </div>
        </CardContent>
      </Card>

      {/* Admin URL */}
      <AdminUrlCard adminUrl={adminUrl} />

      {/* QR Code */}
      <SessionQRCard slug={session.slug} />

      {/* Stats Row */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { icon: Users, label: "参加登録", value: stats.participantCount, hint: "セッション参加者数" },
          { icon: CheckCircle, label: "完了者", value: stats.completedCount, hint: "全問回答済み" },
          { icon: MessageSquare, label: "累計回答", value: stats.responseCount, hint: "回答総数" },
        ].map((metric) => (
          <Card key={metric.label} className="border-0 bg-slate-800/60 ring-1 ring-white/10">
            <CardContent className="flex flex-col gap-1 py-5">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-full bg-cyan-500/15">
                  <metric.icon className="size-4 text-cyan-400" />
                </div>
                <span className="text-sm text-slate-400">{metric.label}</span>
              </div>
              <div className="mt-1 text-3xl font-bold text-white">{metric.value.toLocaleString()}</div>
              <p className="text-xs text-slate-500">{metric.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Leaderboard */}
      {leaderboard.length > 0 && (
        <Card className="border-0 bg-slate-800/60 ring-1 ring-white/10">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Trophy className="size-5 text-cyan-400" />
              <CardTitle className="text-xl text-white">ランキング</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px] text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="py-2 pr-2">順位</th>
                    <th className="py-2 pr-2">ニックネーム</th>
                    <th className="py-2 pr-2">平均スコア</th>
                    <th className="py-2 pr-2">ボリューム</th>
                    <th className="py-2">完了時刻</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((row, index) => (
                    <tr key={row.participantId} className="border-t border-slate-700/50 text-slate-300">
                      <td className="py-3 pr-2">
                        <span className={index < 3 ? "font-bold text-cyan-400" : "font-semibold"}>
                          {index + 1}
                        </span>
                      </td>
                      <td className="py-3 pr-2">{row.nickname}</td>
                      <td className="py-3 pr-2 font-semibold text-white">{row.avgScore.toFixed(1)}</td>
                      <td className="py-3 pr-2">{row.volumeLevel}</td>
                      <td className="py-3 text-xs text-slate-500">
                        {row.completedAt ? new Date(row.completedAt).toLocaleString("ja-JP") : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Per-participant detailed results */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">参加者別 回答詳細</h2>
          <span className="text-sm text-slate-500">{participantDetails.length}人</span>
        </div>

        {participantDetails.length === 0 ? (
          <Card className="border-0 bg-slate-800/60 ring-1 ring-white/10">
            <CardContent className="py-12 text-center text-slate-500">
              まだ参加者がいません。QRコードを共有して受講者を招待してください。
            </CardContent>
          </Card>
        ) : (
          <ParticipantDetails participants={participantDetails} />
        )}
      </div>

      {/* Report Download */}
      <div className="flex gap-3">
        <a
          href={`/api/admin/sessions/${session.slug}/report`}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:border-cyan-400/40 hover:text-cyan-400"
        >
          <Download className="size-4" />
          セッションレポート (PDF)
        </a>
      </div>
    </div>
  );
}
