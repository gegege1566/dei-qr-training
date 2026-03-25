import { z } from "zod";

import { getSessionBySlug } from "@/lib/db/session-service";
import { createParticipantWithQuestionSet } from "@/lib/db/participant-service";

const joinSchema = z.object({
  password: z.string().optional(),
  volume: z.enum(["S", "M", "L"]),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const body = joinSchema.safeParse(await request.json());

    if (!body.success) {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }

    const session = await getSessionBySlug(slug);
    if (!session) {
      return Response.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.status !== "active") {
      return Response.json({ error: "このセッションは現在参加できません" }, { status: 403 });
    }

    // Password check
    if (session.participantPassword) {
      if (!body.data.password || body.data.password !== session.participantPassword) {
        return Response.json({ error: "パスワードが正しくありません" }, { status: 401 });
      }
    }

    const result = await createParticipantWithQuestionSet({
      sessionId: session.id,
      volumeLevel: body.data.volume,
    });

    return Response.json({
      participantId: result.participant.id,
      publicId: result.participant.publicId,
      nickname: result.participant.nickname,
      questionCount: result.participant.questionCount,
    });
  } catch (error) {
    console.error("POST /api/session/[slug]/join failed:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return Response.json({ error: message }, { status: 500 });
  }
}
