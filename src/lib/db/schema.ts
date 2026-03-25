import { relations } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const sessionStatusValues = ["draft", "active", "closed"] as const;

const volumeLevelValues = ["S", "M", "L"] as const;

export const questions = sqliteTable(
  "questions",
  {
    id: text("id").primaryKey(),
    number: integer("number").notNull(),
    majorCategory: text("major_category").notNull(),
    mediumCategory: text("medium_category").notNull(),
    minorCategory: text("minor_category").notNull(),
    minorSummary: text("minor_summary"),
    bannerInsight: text("banner_insight"),
    fileName: text("file_name").notNull(),
    imagePath: text("image_path").notNull(),
    createdAt: integer("created_at", { mode: "number" })
      .notNull()
      .$defaultFn(() => Date.now()),
  },
  (table) => ({
    mediumIdx: index("questions_medium_idx").on(table.mediumCategory),
    fileNameIdx: uniqueIndex("questions_file_name_idx").on(table.fileName),
  })
);

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    description: text("description"),
    status: text("status", { enum: sessionStatusValues })
      .notNull()
      .default("draft"),
    allowedVolumes: text("allowed_volumes")
      .notNull()
      .default('["S","M","L"]'),
    questionCount: integer("question_count").notNull().default(5),
    allowedCategories: text("allowed_categories"), // JSON array of medium categories, null = all
    questionMode: text("question_mode", { enum: ["random", "fixed"] }).notNull().default("random"),
    fixedQuestionIds: text("fixed_question_ids"), // JSON array of question IDs when mode=fixed
    showResultsToParticipant: integer("show_results_to_participant", { mode: "boolean" }).notNull().default(true),
    participantPassword: text("participant_password"),
    adminToken: text("admin_token").notNull(),
    createdAt: integer("created_at", { mode: "number" })
      .notNull()
      .$defaultFn(() => Date.now()),
    updatedAt: integer("updated_at", { mode: "number" })
      .notNull()
      .$defaultFn(() => Date.now()),
  },
  (table) => ({
    slugIdx: uniqueIndex("sessions_slug_idx").on(table.slug),
  })
);

export const participants = sqliteTable(
  "participants",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    publicId: text("public_id").notNull().unique(),
    nickname: text("nickname").notNull(),
    volumeLevel: text("volume_level", { enum: volumeLevelValues }).notNull(),
    questionCount: integer("question_count").notNull(),
    currentIndex: integer("current_index").notNull().default(0),
    completedAt: integer("completed_at", { mode: "number" }),
    createdAt: integer("created_at", { mode: "number" })
      .notNull()
      .$defaultFn(() => Date.now()),
  },
  (table) => ({
    sessionIdx: index("participants_session_idx").on(table.sessionId),
    publicIdIdx: uniqueIndex("participants_public_idx").on(table.publicId),
  })
);

export const participantQuestions = sqliteTable(
  "participant_questions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    participantId: text("participant_id")
      .notNull()
      .references(() => participants.id, { onDelete: "cascade" }),
    questionId: text("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    order: integer("question_order").notNull(),
    createdAt: integer("created_at", { mode: "number" })
      .notNull()
      .$defaultFn(() => Date.now()),
  },
  (table) => ({
    participantIdx: index("participant_questions_participant_idx").on(
      table.participantId,
    ),
    questionIdx: index("participant_questions_question_idx").on(
      table.questionId,
    ),
    participantOrderUnique: uniqueIndex(
      "participant_questions_unique_order_idx",
    ).on(table.participantId, table.order),
  })
);

export const responses = sqliteTable(
  "responses",
  {
    id: text("id").primaryKey(),
    participantId: text("participant_id")
      .references(() => participants.id, { onDelete: "set null" }),
    questionId: text("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    order: integer("question_order").notNull(),
    answerText: text("answer_text").notNull(),
    scorePoint: integer("score_point").notNull().default(0),
    scoreAccuracy: integer("score_accuracy").notNull().default(0),
    scoreIdea: integer("score_idea").notNull().default(0),
    totalScore: integer("total_score").notNull().default(0),
    evaluationSummary: text("evaluation_summary"),
    evaluationJson: text("evaluation_json"),
    llmModel: text("llm_model"),
    evaluatedAt: integer("evaluated_at", { mode: "number" }),
    createdAt: integer("created_at", { mode: "number" })
      .notNull()
      .$defaultFn(() => Date.now()),
  },
  (table) => ({
    participantIdx: index("responses_participant_idx").on(table.participantId),
    questionIdx: index("responses_question_idx").on(table.questionId),
    participantOrderUnique: uniqueIndex("responses_participant_order_idx").on(
      table.participantId,
      table.order,
    ),
  })
);

export const participantRelations = relations(participants, ({ many }) => ({
  questions: many(participantQuestions),
  responses: many(responses),
}));

export const participantQuestionRelations = relations(participantQuestions, ({ one }) => ({
  question: one(questions, {
    fields: [participantQuestions.questionId],
    references: [questions.id],
  }),
}));

export const questionRelations = relations(questions, ({ many }) => ({
  participantQuestions: many(participantQuestions),
  responses: many(responses),
}));

export const sessionRelations = relations(sessions, ({ many }) => ({
  participants: many(participants),
}));

export const responseRelations = relations(responses, ({ one }) => ({
  participant: one(participants, {
    fields: [responses.participantId],
    references: [participants.id],
  }),
  question: one(questions, {
    fields: [responses.questionId],
    references: [questions.id],
  }),
}));

export type Question = typeof questions.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Participant = typeof participants.$inferSelect;
export type ParticipantQuestion = typeof participantQuestions.$inferSelect;
export type Response = typeof responses.$inferSelect;
export type SessionStatus = (typeof sessionStatusValues)[number];
export type VolumeLevel = (typeof volumeLevelValues)[number];
