import jsPDF from "jspdf";

import type { Session } from "@/lib/db/schema";

export type SessionSummaryInput = {
  session: Pick<Session, "title" | "slug">;
  stats: {
    participantCount: number;
    completedCount: number;
    responseCount: number;
  };
  leaderboard: Array<{
    nickname: string;
    publicId: string;
    avgScore: number;
    volumeLevel: string;
  }>;
};

export const buildSessionSummaryReport = ({
  session,
  stats,
  leaderboard,
}: SessionSummaryInput) => {
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text(`Session: ${session.title}`, 20, 20);
  doc.setFontSize(11);
  doc.text(`Slug: ${session.slug}`, 20, 28);

  doc.setFontSize(12);
  doc.text("Stats", 20, 40);
  doc.setFontSize(10);
  doc.text(
    `Participants: ${stats.participantCount} / Completed: ${stats.completedCount} / Responses: ${stats.responseCount}`,
    20,
    48,
  );

  doc.setFontSize(12);
  doc.text("Leaderboard", 20, 60);

  let cursorY = 68;
  leaderboard.forEach((row, idx) => {
    if (cursorY > 270) {
      doc.addPage();
      cursorY = 20;
    }

    doc.setFontSize(11);
    doc.text(
      `${idx + 1}. ${row.nickname} (${row.publicId}) - ${row.avgScore.toFixed(1)} pts [${row.volumeLevel}]`,
      20,
      cursorY,
    );
    cursorY += 8;
  });

  return doc.output("arraybuffer");
};
