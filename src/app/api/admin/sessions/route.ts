import { NextResponse } from "next/server";
import { z } from "zod";

import {
  cleanupExpiredSessions,
  createSession,
  getSessionBySlug,
  listSessions,
} from "@/lib/db/session-service";
import type { VolumeLevel } from "@/lib/db/schema";
import { allVolumeKeys } from "@/lib/training";

const sessionPayloadSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  slug: z
    .string()
    .min(3)
    .max(48)
    .regex(/^[a-z0-9-]+$/, "slugは半角英数字とハイフンのみ利用できます"),
  status: z.enum(["draft", "active", "closed"]).default("draft"),
  allowedVolumes: z
    .array(z.enum(allVolumeKeys as [VolumeLevel, ...VolumeLevel[]]))
    .optional(),
  questionCount: z.number().int().min(1).max(50).optional(),
  allowedCategories: z.array(z.string()).optional(),
  questionMode: z.enum(["random", "fixed"]).optional(),
  fixedQuestionIds: z.array(z.string()).optional(),
  showResultsToParticipant: z.boolean().optional(),
  participantPassword: z.string().optional(),
});

export async function GET() {
  // Lazy cleanup of expired sessions
  await cleanupExpiredSessions().catch(console.error);

  const rows = await listSessions();
  return NextResponse.json({ sessions: rows });
}

export async function POST(request: Request) {
  const json = await request.json();
  const payload = sessionPayloadSchema.safeParse(json);

  if (!payload.success) {
    return NextResponse.json(
      { error: "invalid_payload", details: payload.error.format() },
      { status: 400 },
    );
  }

  const existing = await getSessionBySlug(payload.data.slug);
  if (existing) {
    return NextResponse.json(
      { error: "duplicate", message: "同じslugのセッションが存在します" },
      { status: 409 },
    );
  }

  const session = await createSession(payload.data);
  return NextResponse.json({ session }, { status: 201 });
}
