import { NextResponse } from "next/server";

import { db } from "@/lib/db/client";
import { buildParticipantReport } from "@/lib/pdf/reports";

type RouteContext = {
  params: Promise<{ participantId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { participantId } = await context.params;

  const participant = await db.query.participants.findFirst({
    where: (table, { eq }) => eq(table.id, participantId),
    columns: {
      id: true,
      nickname: true,
      publicId: true,
      volumeLevel: true,
      createdAt: true,
    },
  });

  if (!participant) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const responses = await db.query.responses.findMany({
    where: (table, { eq }) => eq(table.participantId, participant.id),
    orderBy: (table, { asc }) => asc(table.order),
    columns: {
      order: true,
      answerText: true,
      totalScore: true,
      evaluationSummary: true,
    },
    with: {
      question: {
        columns: {
          number: true,
        },
      },
    },
  });

  const pdfArrayBuffer = buildParticipantReport({
    participant,
    responses: responses.map((response) => ({
      order: response.order,
      answerText: response.answerText,
      totalScore: response.totalScore,
      evaluationSummary: response.evaluationSummary,
      questionNumber: response.question.number,
    })),
  });

  return new NextResponse(Buffer.from(pdfArrayBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="participant-${participant.publicId}.pdf"`,
    },
  });
}
