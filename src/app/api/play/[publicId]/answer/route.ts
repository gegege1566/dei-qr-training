import { z } from "zod";

import { db } from "@/lib/db/client";
import { recordResponse } from "@/lib/db/response-service";

const bodySchema = z.object({
  questionId: z.string().min(1),
  answerText: z.string().min(1),
});

export async function POST(
  request: Request,
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
      return Response.json(
        { error: "Already completed" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Invalid request body", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { questionId, answerText } = parsed.data;

    const result = await recordResponse({
      participantId: participant.id,
      questionId,
      order: participant.currentIndex,
      answerText,
    });

    const isLast = result.participant.completed;

    return Response.json({
      next: !isLast,
      currentIndex: participant.currentIndex + 1,
      totalQuestions: participant.questionCount,
    });
  } catch (error) {
    console.error("POST /api/play/[publicId]/answer failed:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return Response.json({ error: message }, { status: 500 });
  }
}
