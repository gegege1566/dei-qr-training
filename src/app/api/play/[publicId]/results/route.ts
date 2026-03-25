import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  participants,
  participantQuestions,
  questions,
  responses,
  sessions,
} from "@/lib/db/schema";

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

    if (!participant.completedAt) {
      return Response.json(
        { error: "Not yet completed" },
        { status: 400 },
      );
    }

    // Check if session allows showing results to participant
    const session = await db.query.sessions.findFirst({
      where: (table, { eq: e }) => e(table.id, participant.sessionId),
    });
    const showResultsToParticipant = session?.showResultsToParticipant ?? true;

    // Get all responses with their questions
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
        questionId: questions.id,
        questionNumber: questions.number,
        majorCategory: questions.majorCategory,
        mediumCategory: questions.mediumCategory,
        minorCategory: questions.minorCategory,
        minorSummary: questions.minorSummary,
        bannerInsight: questions.bannerInsight,
        imagePath: questions.imagePath,
      })
      .from(responses)
      .innerJoin(questions, eq(responses.questionId, questions.id))
      .where(eq(responses.participantId, participant.id))
      .orderBy(responses.order);

    const rawTotal = participantResponses.reduce(
      (sum, r) => sum + r.totalScore,
      0,
    );
    const rawMax = participant.questionCount * 30;
    const totalScore = rawMax > 0 ? Math.round((rawTotal / rawMax) * 100) : 0;
    const maxScore = 100;

    const evaluationComplete = participantResponses.every(
      (r) => r.evaluatedAt !== null,
    );

    // Calculate deviation values per medium category
    const mediumCategories = [
      ...new Set(participantResponses.map((r) => r.mediumCategory)),
    ];

    const radarData: { category: string; deviation: number }[] = [];

    for (const category of mediumCategories) {
      // Get all question IDs that belong to this medium category
      const categoryQuestionIds = await db
        .select({ id: questions.id })
        .from(questions)
        .where(eq(questions.mediumCategory, category));

      const qIds = categoryQuestionIds.map((q) => q.id);

      if (qIds.length === 0) {
        radarData.push({ category, deviation: 50 });
        continue;
      }

      // Get all historical responses for questions in this medium category
      const historicalScores = await db
        .select({ totalScore: responses.totalScore })
        .from(responses)
        .where(
          and(
            inArray(responses.questionId, qIds),
            isNotNull(responses.evaluatedAt),
          ),
        );

      // User's score for this category
      const userCategoryResponses = participantResponses.filter(
        (r) => r.mediumCategory === category,
      );
      const userScore =
        userCategoryResponses.reduce((sum, r) => sum + r.totalScore, 0) /
        (userCategoryResponses.length || 1);

      if (historicalScores.length < 2) {
        // Not enough data for standard deviation calculation
        radarData.push({ category, deviation: 50 });
        continue;
      }

      const scores = historicalScores.map((r) => r.totalScore);
      const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
      const variance =
        scores.reduce((sum, s) => sum + (s - mean) ** 2, 0) / scores.length;
      const stddev = Math.sqrt(variance);

      const deviation =
        stddev === 0 ? 50 : Math.round(50 + 10 * ((userScore - mean) / stddev));

      radarData.push({ category, deviation });
    }

    const questionResults = participantResponses.map((r) => ({
      order: r.order,
      question: {
        id: r.questionId,
        number: r.questionNumber,
        majorCategory: r.majorCategory,
        mediumCategory: r.mediumCategory,
        minorCategory: r.minorCategory,
        minorSummary: r.minorSummary,
        bannerInsight: r.bannerInsight,
        imagePath: r.imagePath,
      },
      answerText: r.answerText,
      scorePoint: r.scorePoint,
      scoreAccuracy: r.scoreAccuracy,
      scoreIdea: r.scoreIdea,
      totalScore: r.totalScore,
      evaluationSummary: r.evaluationSummary,
    }));

    return Response.json({
      participant: {
        nickname: participant.nickname,
        volumeLevel: participant.volumeLevel,
        questionCount: participant.questionCount,
        totalScore,
        maxScore,
      },
      questions: questionResults,
      radarData,
      evaluationComplete,
      showResultsToParticipant,
    });
  } catch (error) {
    console.error("GET /api/play/[publicId]/results failed:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return Response.json({ error: message }, { status: 500 });
  }
}
