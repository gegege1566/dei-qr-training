import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

import { db } from "@/lib/db/client";
import { participantQuestions, participants, questions } from "@/lib/db/schema";
import type { VolumeLevel } from "@/lib/db/schema";
import { NICKNAME_POOL } from "@/lib/nicknames";
import { getQuestionCountForVolume } from "@/lib/training";

export type CreateParticipantArgs = {
  sessionId: string;
  nickname?: string;
  volumeLevel: VolumeLevel;
};

const pickRandom = <T>(items: T[]): T => {
  return items[Math.floor(Math.random() * items.length)];
};

export const suggestNickname = async (sessionId: string) => {
  const existing = await db
    .select({ nickname: participants.nickname })
    .from(participants)
    .where(eq(participants.sessionId, sessionId));

  const used = new Set(existing.map((row) => row.nickname));
  const unused = NICKNAME_POOL.filter((name) => !used.has(name));

  if (unused.length > 0) {
    return pickRandom(unused);
  }

  return `参加者${existing.length + 1}`;
};

const resolveNickname = async (sessionId: string, input?: string | null) => {
  const trimmed = (input ?? "").trim();
  if (!trimmed) {
    return await suggestNickname(sessionId);
  }

  const existing = await db
    .select({ nickname: participants.nickname })
    .from(participants)
    .where(eq(participants.sessionId, sessionId));
  const used = new Set(existing.map((row) => row.nickname));

  if (!used.has(trimmed)) {
    return trimmed;
  }

  return await suggestNickname(sessionId);
};

export const createParticipantWithQuestionSet = async ({
  sessionId,
  nickname,
  volumeLevel,
}: CreateParticipantArgs) => {
  const desiredCount = getQuestionCountForVolume(volumeLevel);

  const allQuestions = await db.select().from(questions);
  const groupedByMedium = allQuestions.reduce<Record<string, typeof allQuestions>>(
    (acc, question) => {
      acc[question.mediumCategory] = acc[question.mediumCategory] || [];
      acc[question.mediumCategory].push(question);
      return acc;
    },
    {},
  );

  const mediumKeys = Object.keys(groupedByMedium);
  if (mediumKeys.length === 0) {
    throw new Error("No questions available");
  }

  const selectedQuestions: typeof allQuestions = [];
  const availablePools = new Map(
    mediumKeys.map((key) => [key, [...groupedByMedium[key]]]),
  );

  for (let i = 0; i < desiredCount; i += 1) {
    const mediums = Array.from(availablePools.keys());
    if (!mediums.length) {
      break;
    }
    const medium = pickRandom(mediums);
    const pool = availablePools.get(medium)!;
    const question = pickRandom(pool);
    selectedQuestions.push(question);
    if (pool.length <= 1) {
      availablePools.delete(medium);
    } else {
      availablePools.set(
        medium,
        pool.filter((item) => item.id !== question.id),
      );
    }
  }

  if (selectedQuestions.length < desiredCount) {
    throw new Error("Not enough questions to satisfy the requested volume level");
  }

  const resolvedNickname = await resolveNickname(sessionId, nickname);

  const participantRecord = {
    id: nanoid(18),
    sessionId,
    publicId: nanoid(10),
    nickname: resolvedNickname,
    volumeLevel,
    questionCount: desiredCount,
    currentIndex: 0,
    createdAt: Date.now(),
  } satisfies typeof participants.$inferInsert;

  await db.insert(participants).values(participantRecord);

  await db.insert(participantQuestions).values(
    selectedQuestions.map((question, index) => ({
      participantId: participantRecord.id,
      questionId: question.id,
      order: index,
      createdAt: Date.now(),
    })),
  );

  return {
    participant: participantRecord,
    questions: selectedQuestions.map((question, index) => ({
      order: index,
      id: question.id,
      number: question.number,
      imagePath: question.imagePath,
      bannerInsight: question.bannerInsight,
    })),
  };
};
