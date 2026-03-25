import { z } from "zod";

import { db } from "@/lib/db/client";
import { createSession } from "@/lib/db/session-service";
import { createParticipantWithQuestionSet } from "@/lib/db/participant-service";

const PERSONAL_SESSION_SLUG = "personal";

const bodySchema = z.object({
  volume: z.enum(["S", "M", "L"]),
});

async function getOrCreatePersonalSession(): Promise<string> {
  const existing = await db.query.sessions.findFirst({
    where: (table, { eq }) => eq(table.slug, PERSONAL_SESSION_SLUG),
  });

  if (existing) {
    return existing.id;
  }

  const created = await createSession({
    title: "個人プレイ",
    slug: PERSONAL_SESSION_SLUG,
    status: "active",
    description: "個人利用モード用の固定セッション",
  });

  return created.id;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Invalid request body", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { volume } = parsed.data;
    const sessionId = await getOrCreatePersonalSession();

    const result = await createParticipantWithQuestionSet({
      sessionId,
      volumeLevel: volume,
    });

    return Response.json({
      participantId: result.participant.id,
      publicId: result.participant.publicId,
      nickname: result.participant.nickname,
      questionCount: result.participant.questionCount,
    });
  } catch (error) {
    console.error("POST /api/play/start failed:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return Response.json({ error: message }, { status: 500 });
  }
}
