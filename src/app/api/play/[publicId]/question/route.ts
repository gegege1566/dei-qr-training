import { eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { participants } from "@/lib/db/schema";
import { getNextQuestion } from "@/lib/db/response-service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ publicId: string }> },
) {
  try {
    const { publicId } = await params;

    const participant = await db.query.participants.findFirst({
      where: (table, { eq }) => eq(table.publicId, publicId),
    });

    if (!participant) {
      return Response.json(
        { error: "Participant not found" },
        { status: 404 },
      );
    }

    if (participant.completedAt) {
      return Response.json({ finished: true });
    }

    const next = await getNextQuestion(participant.id);

    if (!next) {
      return Response.json({ finished: true });
    }

    return Response.json({
      questionOrder: next.order,
      totalQuestions: participant.questionCount,
      question: {
        id: next.question.id,
        number: next.question.number,
        majorCategory: next.question.majorCategory,
        mediumCategory: next.question.mediumCategory,
        minorCategory: next.question.minorCategory,
        minorSummary: next.question.minorSummary,
        bannerInsight: next.question.bannerInsight,
        imagePath: next.question.imagePath,
      },
      finished: false,
    });
  } catch (error) {
    console.error("GET /api/play/[publicId]/question failed:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return Response.json({ error: message }, { status: 500 });
  }
}
