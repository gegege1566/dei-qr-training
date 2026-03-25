import { and, count, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { participants, responses } from "@/lib/db/schema";

export const getSessionStats = async (sessionId: string) => {
  const [{ participantCount }] = await db
    .select({ participantCount: count() })
    .from(participants)
    .where(eq(participants.sessionId, sessionId));

  const [{ completedCount }] = await db
    .select({ completedCount: count() })
    .from(participants)
    .where(and(eq(participants.sessionId, sessionId), isNotNull(participants.completedAt)));

  const participantIds = await db
    .select({ id: participants.id })
    .from(participants)
    .where(eq(participants.sessionId, sessionId));

  const participantIdList = participantIds.map((p) => p.id);

  const responseCount = participantIdList.length
    ? (
        await db
          .select({ responseCount: count() })
          .from(responses)
          .where(inArray(responses.participantId, participantIdList))
      )[0].responseCount
    : 0;

  return {
    participantCount,
    completedCount,
    responseCount,
  };
};

export const getSessionLeaderboard = async (sessionId: string, limit = 10) => {
  const avgScore = sql<number>`COALESCE(AVG(${responses.totalScore}), 0)`;

  const rows = await db
    .select({
      participantId: participants.id,
      nickname: participants.nickname,
      volumeLevel: participants.volumeLevel,
      publicId: participants.publicId,
      avgScore,
      completedAt: participants.completedAt,
    })
    .from(participants)
    .leftJoin(responses, eq(responses.participantId, participants.id))
    .where(eq(participants.sessionId, sessionId))
    .groupBy(
      participants.id,
      participants.nickname,
      participants.volumeLevel,
      participants.publicId,
      participants.completedAt,
    )
    .orderBy(desc(avgScore))
    .limit(limit);

  return rows;
};
