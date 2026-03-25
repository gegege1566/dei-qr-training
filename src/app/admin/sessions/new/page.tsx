import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { SessionCreateForm } from "./session-create-form";

export default function SessionCreatePage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-cyan-400"
      >
        <ArrowLeft className="size-3.5" />
        セッション一覧に戻る
      </Link>

      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-cyan-400">
          新規作成
        </p>
        <h1 className="text-3xl font-bold text-white">新規セッション作成</h1>
        <p className="text-sm text-slate-400">
          タイトル・slug・対象ボリュームを設定すると、QR発行やリアルタイム集計に進めます。
        </p>
      </header>

      <SessionCreateForm />
    </div>
  );
}
