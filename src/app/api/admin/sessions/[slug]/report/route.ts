import { NextResponse } from "next/server";

import { db } from "@/lib/db/client";
import { getSessionLeaderboard, getSessionStats } from "@/lib/db/stats-service";
import { buildSessionSummaryReport } from "@/lib/pdf/session-summary";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params;

  const session = await db.query.sessions.findFirst({
    where: (table, { eq }) => eq(table.slug, slug),
    columns: {
      id: true,
      title: true,
      slug: true,
    },
  });

  if (!session) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const stats = await getSessionStats(session.id);
  const leaderboard = await getSessionLeaderboard(session.id, 20);

  const pdfArrayBuffer = buildSessionSummaryReport({
    session,
    stats,
    leaderboard: leaderboard.map((row) => ({
      nickname: row.nickname,
      publicId: row.publicId,
      avgScore: row.avgScore,
      volumeLevel: row.volumeLevel,
    })),
  });

  return new NextResponse(Buffer.from(pdfArrayBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="session-${session.slug}.pdf"`,
    },
  });
}
