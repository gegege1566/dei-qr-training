import { lt } from "drizzle-orm";
import { nanoid } from "nanoid";

import { db } from "@/lib/db/client";
import { deserializeVolumes, serializeVolumes } from "@/lib/db/utils";
import type { SessionStatus, VolumeLevel } from "@/lib/db/schema";
import { participants, sessions } from "@/lib/db/schema";

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export type CreateSessionArgs = {
  title: string;
  description?: string;
  slug: string;
  status?: SessionStatus;
  allowedVolumes?: VolumeLevel[];
  questionCount?: number;
  allowedCategories?: string[];
  questionMode?: "random" | "fixed";
  fixedQuestionIds?: string[];
  showResultsToParticipant?: boolean;
  participantPassword?: string;
};

export const createSession = async ({
  title,
  description,
  slug,
  status = "draft",
  allowedVolumes,
  questionCount = 5,
  allowedCategories,
  questionMode = "random",
  fixedQuestionIds,
  showResultsToParticipant = true,
  participantPassword,
}: CreateSessionArgs) => {
  const now = Date.now();
  const adminToken = nanoid(24);
  const payload = {
    id: nanoid(16),
    title,
    description: description ?? null,
    slug,
    status,
    participantPassword: participantPassword ?? null,
    allowedVolumes: serializeVolumes(allowedVolumes ?? []),
    questionCount,
    allowedCategories: allowedCategories ? JSON.stringify(allowedCategories) : null,
    questionMode,
    fixedQuestionIds: fixedQuestionIds ? JSON.stringify(fixedQuestionIds) : null,
    showResultsToParticipant,
    adminToken,
    createdAt: now,
    updatedAt: now,
  } satisfies typeof sessions.$inferInsert;

  await db.insert(sessions).values(payload);
  return payload;
};

export const listSessions = async () => {
  const rows = await db.select().from(sessions).orderBy(sessions.createdAt);
  return rows.map((row) => ({
    ...row,
    allowedVolumes: deserializeVolumes(row.allowedVolumes),
  }));
};

export const getSessionBySlug = async (slug: string) => {
  const row = await db.query.sessions.findFirst({
    where: (table, { eq }) => eq(table.slug, slug),
  });

  if (!row) {
    return null;
  }

  return {
    ...row,
    allowedVolumes: deserializeVolumes(row.allowedVolumes),
  };
};

/** Delete sessions older than 24 hours. Responses are preserved (SET NULL on participantId). */
export const cleanupExpiredSessions = async () => {
  const cutoff = Date.now() - SESSION_TTL_MS;

  // Get expired session IDs
  const expired = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(lt(sessions.createdAt, cutoff));

  if (expired.length === 0) return 0;

  const ids = expired.map((s) => s.id);

  // Delete participants (responses stay via SET NULL)
  for (const sessionId of ids) {
    await db.delete(participants).where(lt(participants.createdAt, cutoff));
  }

  // Delete sessions
  await db.delete(sessions).where(lt(sessions.createdAt, cutoff));

  return expired.length;
};

/** Returns remaining time in ms, or 0 if expired */
export const getSessionRemainingMs = (createdAt: number) => {
  const expiresAt = createdAt + SESSION_TTL_MS;
  return Math.max(0, expiresAt - Date.now());
};
