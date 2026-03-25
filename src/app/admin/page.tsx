import Link from "next/link";
import { Plus, Users, Calendar } from "lucide-react";

import { listSessions } from "@/lib/db/session-service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdminPageShell } from "./admin-page-shell";

export const dynamic = "force-dynamic";

const statusConfig = {
  draft: { label: "下書き", className: "bg-slate-600 text-slate-200" },
  active: { label: "公開中", className: "bg-emerald-600/80 text-emerald-100" },
  closed: { label: "終了", className: "bg-red-600/80 text-red-100" },
} as const;

export default async function AdminHomePage() {
  const sessions = await listSessions();

  return (
    <AdminPageShell>
      <div className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-10">
        {/* Header */}
        <header className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-cyan-400">
            Admin
          </p>
          <h1 className="text-3xl font-bold text-white">研修モード</h1>
          <p className="text-sm text-slate-400">
            セッションを管理し、受講者の進捗を確認します
          </p>
        </header>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">セッション一覧</h2>
          <Link
            href="/admin/sessions/new"
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg transition-all hover:shadow-cyan-500/25 hover:shadow-xl"
          >
            <Plus className="size-4" />
            新しいセッション
          </Link>
        </div>

        {/* Session List */}
        {sessions.length === 0 ? (
          <Card className="border-0 bg-slate-800/60 ring-1 ring-white/10">
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-slate-700/60">
                <Calendar className="size-6 text-slate-400" />
              </div>
              <p className="text-sm text-slate-400">
                まだセッションがありません。
              </p>
              <Link
                href="/admin/sessions/new"
                className="text-sm font-medium text-cyan-400 hover:underline"
              >
                最初のセッションを作成する
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {sessions.map((session) => {
              const status = statusConfig[session.status as keyof typeof statusConfig] ?? statusConfig.draft;
              return (
                <Link key={session.id} href={`/admin/sessions/${session.slug}`}>
                  <Card className="h-full cursor-pointer border-0 bg-slate-800/60 ring-1 ring-white/10 transition-all hover:ring-cyan-400/40 hover:shadow-[0_0_20px_rgba(34,211,238,0.08)]">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-white">
                          {session.title}
                        </CardTitle>
                        <Badge className={status.className}>
                          {status.label}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-2">
                      {session.description && (
                        <p className="line-clamp-2 text-xs text-slate-400">
                          {session.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Users className="size-3" />
                          {session.allowedVolumes.join("/")}
                        </span>
                        <span className="font-mono">/{session.slug}</span>
                        <span>
                          {new Date(session.createdAt).toLocaleDateString("ja-JP")}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </AdminPageShell>
  );
}
