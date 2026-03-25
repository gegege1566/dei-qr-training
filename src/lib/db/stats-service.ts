import { and, count, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { participants, questions, responses } from "@/lib/db/schema";

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

/** Get detailed per-participant results with all responses */
export const getSessionParticipantDetails = async (sessionId: string) => {
  const allParticipants = await db
    .select()
    .from(participants)
    .where(eq(participants.sessionId, sessionId))
    .orderBy(desc(participants.completedAt));

  const details = await Promise.all(
    allParticipants.map(async (p) => {
      const participantResponses = await db
        .select({
          order: responses.order,
          answerText: responses.answerText,
          scorePoint: responses.scorePoint,
          scoreAccuracy: responses.scoreAccuracy,
          scoreIdea: responses.scoreIdea,
          totalScore: responses.totalScore,
          evaluationSummary: responses.evaluationSummary,
          evaluatedAt: responses.evaluatedAt,
          questionId: responses.questionId,
          mediumCategory: questions.mediumCategory,
          imagePath: questions.imagePath,
        })
        .from(responses)
        .innerJoin(questions, eq(responses.questionId, questions.id))
        .where(eq(responses.participantId, p.id))
        .orderBy(responses.order);

      const rawTotal = participantResponses.reduce((s, r) => s + r.totalScore, 0);
      const rawMax = p.questionCount * 30;
      const score100 = rawMax > 0 ? Math.round((rawTotal / rawMax) * 100) : 0;

      return {
        id: p.id,
        publicId: p.publicId,
        nickname: p.nickname,
        volumeLevel: p.volumeLevel,
        questionCount: p.questionCount,
        completedAt: p.completedAt,
        score100,
        responses: participantResponses,
      };
    })
  );

  return details;
};
