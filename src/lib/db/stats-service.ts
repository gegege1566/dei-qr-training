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

/** Get all scores grouped by medium category (across ALL responses, not just this session) */
export const getCategoryScoreDistribution = async () => {
  const rows = await db
    .select({
      mediumCategory: questions.mediumCategory,
      totalScore: responses.totalScore,
    })
    .from(responses)
    .innerJoin(questions, eq(responses.questionId, questions.id))
    .where(isNotNull(responses.evaluatedAt));

  // Group scores by category
  const grouped: Record<string, number[]> = {};
  for (const row of rows) {
    if (!grouped[row.mediumCategory]) {
      grouped[row.mediumCategory] = [];
    }
    grouped[row.mediumCategory].push(row.totalScore);
  }

  // Build histogram buckets (0-5, 6-10, 11-15, 16-20, 21-25, 26-30)
  const bucketLabels = ["0-5", "6-10", "11-15", "16-20", "21-25", "26-30"];
  const toBucket = (score: number) => {
    if (score <= 5) return 0;
    if (score <= 10) return 1;
    if (score <= 15) return 2;
    if (score <= 20) return 3;
    if (score <= 25) return 4;
    return 5;
  };

  const categories = Object.entries(grouped)
    .map(([category, scores]) => {
      const buckets = [0, 0, 0, 0, 0, 0];
      for (const s of scores) {
        buckets[toBucket(s)]++;
      }
      const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      return {
        category,
        count: scores.length,
        avg: Math.round(avg * 10) / 10,
        buckets,
      };
    })
    .sort((a, b) => b.count - a.count);

  return { categories, bucketLabels };
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
