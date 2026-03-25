import crypto from "node:crypto";

import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { questions, participantQuestions, participants, responses } from "@/lib/db/schema";

export type RecordResponseArgs = {
  participantId: string;
  questionId: string;
  order: number;
  answerText: string;
};

export type NextQuestionResult = {
  order: number;
  participant: typeof participants.$inferSelect;
  question: typeof questions.$inferSelect;
};

export const recordResponse = async ({
  participantId,
  questionId,
  order,
  answerText,
}: RecordResponseArgs) => {
  const timestamp = Date.now();

  const participant = await db.query.participants.findFirst({
    where: (table, { eq }) => eq(table.id, participantId),
    columns: {
      questionCount: true,
    },
  });

  if (!participant) {
    throw new Error("Participant not found");
  }

  await db
    .delete(responses)
    .where(
      and(
        eq(responses.participantId, participantId),
        eq(responses.order, order),
      ),
    );

  const responseId = crypto.randomUUID();

  await db.insert(responses).values({
    id: responseId,
    participantId,
    questionId,
    order,
    answerText,
    createdAt: timestamp,
  });

  const isCompleted = order + 1 >= participant.questionCount;

  await db
    .update(participants)
    .set({
      currentIndex: order + 1,
      completedAt: isCompleted ? timestamp : null,
    })
    .where(eq(participants.id, participantId));

  const question = await db.query.questions.findFirst({
    where: (table, { eq }) => eq(table.id, questionId),
    columns: {
      bannerInsight: true,
      minorSummary: true,
    },
  });

  return {
    responseId,
    participant: {
      id: participantId,
      questionCount: participant.questionCount,
      completed: isCompleted,
    },
    question,
  };
};

export const getNextQuestion = async (
  participantId: string,
): Promise<NextQuestionResult | null> => {
  const participant = await db.query.participants.findFirst({
    where: (table, { eq }) => eq(table.id, participantId),
  });

  if (!participant) {
    return null;
  }

  const nextOrder = participant.currentIndex;
  const question = await db.query.participantQuestions.findFirst({
    where: (table, { and, eq }) =>
      and(eq(table.participantId, participantId), eq(table.order, nextOrder)),
    with: {
      question: true,
    },
  });

  if (!question || !question.question) {
    return null;
  }

  return {
    order: nextOrder,
    participant,
    question: question.question,
  };
};
