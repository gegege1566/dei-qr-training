import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { questions, responses, type Question } from "@/lib/db/schema";
import { callGroq, type ChatMessage } from "@/lib/evaluation/providers/groq";
import { callOpenRouter } from "@/lib/evaluation/providers/openrouter";
import { callGoogle } from "@/lib/evaluation/providers/google";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EvaluationProvider =
  | "mock"
  | "groq"
  | "openrouter"
  | "google"
  | "local";

export type EvaluationResult = {
  scorePoint: number;
  scoreAccuracy: number;
  scoreIdea: number;
  totalScore: number;
  evaluationSummary: string;
  evaluationJson: Record<string, unknown>;
  model: string;
  evaluatedAt: number;
};

type LlmScores = {
  scorePoint: number;
  scoreAccuracy: number;
  scoreIdea: number;
  summary: string;
};

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `あなたはDEI（多様性・公平性・包括性）研修の評価者であり、学びを深めるメンターです。
回答者がバナー広告のDEI的な問題点を指摘した回答を、以下の3つの視点で採点してください。

1. 指摘のポイント (scorePoint: 0-10): バナーのDEI的問題点を的確に捉えているか
2. 指摘の内容の正確さ (scoreAccuracy: 0-10): 指摘内容が事実に基づき正確であるか
3. 改善に向けたアイデア (scoreIdea: 0-10): 具体的で建設的な改善提案があるか

## 採点基準（厳しめに評価すること）
- 8-10点: 専門家レベルの深い洞察。具体的な問題の構造理解と社会的影響の分析がある
- 5-7点: 問題点を正しく認識しているが、具体性や深さが不足
- 3-4点: 一般的・抽象的な指摘にとどまり、このバナー固有の問題への言及が弱い
- 0-2点: 的外れ、または回答が不十分
漠然とした回答や表面的な指摘には高得点を与えないでください。

## summaryの書き方（重要）
summaryは回答者に直接語りかける二人称（「あなた」）で書いてください。「受講者」「回答者」などの三人称は使わないでください。
単なる採点理由ではなく、学びにつながるフィードバックにしてください。以下の要素を必ず含めてください：

- **このバナーの具体的なDEI問題点**を、提供されたバナー情報（カテゴリ・概要・問題点の解説）に基づいて具体的に説明する
- あなたの回答で**良かった点**を認める（部分的でも正しければ評価する）
- あなたが**見落としている視点**や**さらに深掘りできるポイント**を、教育的な観点で補足する
- 実社会でこの問題がどう影響するかなど、**気づきにつながる一言**を添える

4〜6文程度で、前向きで励ましのあるトーンで書いてください。

回答はJSON形式で返してください:
{"scorePoint": <0-10>, "scoreAccuracy": <0-10>, "scoreIdea": <0-10>, "summary": "<日本語での評価コメント>"}`;

// ---------------------------------------------------------------------------
// Provider dispatcher
// ---------------------------------------------------------------------------

function getProvider(): EvaluationProvider {
  return ((process.env.EVAL_PROVIDER ?? "mock").trim()) as EvaluationProvider;
}

async function callLlm(messages: ChatMessage[]): Promise<{ text: string; model: string }> {
  const provider = getProvider();
  switch (provider) {
    case "groq":
      return callGroq(messages);
    case "openrouter":
      return callOpenRouter(messages);
    case "google":
      return callGoogle(messages);
    case "mock":
    case "local":
      return { text: "", model: "mock" };
    default:
      return { text: "", model: "mock" };
  }
}

// ---------------------------------------------------------------------------
// JSON extraction helper
// ---------------------------------------------------------------------------

function extractJson(text: string): string {
  // Strip markdown code blocks first
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const cleaned = codeBlockMatch ? codeBlockMatch[1].trim() : text;

  // Find the JSON object
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  return jsonMatch ? jsonMatch[0] : cleaned;
}

// ---------------------------------------------------------------------------
// Mock evaluator
// ---------------------------------------------------------------------------

const clamp = (value: number, min = 0, max = 10) =>
  Math.min(Math.max(value, min), max);

function mockEvaluate(answerText: string): EvaluationResult {
  const hash = crypto.createHash("md5").update(answerText).digest("hex");
  const seed1 = parseInt(hash.slice(0, 2), 16) / 255;
  const seed2 = parseInt(hash.slice(2, 4), 16) / 255;
  const seed3 = parseInt(hash.slice(4, 6), 16) / 255;
  const lengthBonus = Math.min(answerText.length / 50, 1);

  const scorePoint = Math.round(clamp(3 + seed1 * 5 + lengthBonus * 2));
  const scoreAccuracy = Math.round(clamp(3 + seed2 * 5 + lengthBonus * 2));
  const scoreIdea = Math.round(clamp(2 + seed3 * 5 + lengthBonus * 3));
  const totalScore = scorePoint + scoreAccuracy + scoreIdea;

  return {
    scorePoint,
    scoreAccuracy,
    scoreIdea,
    totalScore,
    evaluationSummary:
      "モック採点: 回答量とハッシュ値を元に自動採点しました。実際のLLM評価に差し替える想定です。",
    evaluationJson: { mock: true },
    model: "mock",
    evaluatedAt: Date.now(),
  };
}

// ---------------------------------------------------------------------------
// Core: evaluateAnswer
// ---------------------------------------------------------------------------

export async function evaluateAnswer(
  question: Pick<Question, "majorCategory" | "mediumCategory" | "minorCategory" | "minorSummary" | "bannerInsight">,
  answerText: string,
): Promise<EvaluationResult> {
  const provider = getProvider();

  if (provider === "mock" || provider === "local") {
    return mockEvaluate(answerText);
  }

  const userPrompt = `## バナー情報
- 大カテゴリ: ${question.majorCategory}
- 中カテゴリ: ${question.mediumCategory}
- 小カテゴリ: ${question.minorCategory}
- 小カテゴリ概要: ${question.minorSummary ?? "(未設定)"}
- バナーの問題点（参考情報）: ${question.bannerInsight ?? "(未設定)"}

## 受講者の回答
${answerText}

上記の回答を評価し、JSON形式で結果を返してください。`;

  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ];

  // Retry up to 3 times on parse failure
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const { text, model } = await callLlm(messages);
      const jsonStr = extractJson(text);
      const parsed = JSON.parse(jsonStr) as LlmScores;

      const scorePoint = Math.round(clamp(Number(parsed.scorePoint) || 0));
      const scoreAccuracy = Math.round(clamp(Number(parsed.scoreAccuracy) || 0));
      const scoreIdea = Math.round(clamp(Number(parsed.scoreIdea) || 0));
      const totalScore = scorePoint + scoreAccuracy + scoreIdea;

      return {
        scorePoint,
        scoreAccuracy,
        scoreIdea,
        totalScore,
        evaluationSummary: parsed.summary ?? "",
        evaluationJson: parsed as unknown as Record<string, unknown>,
        model,
        evaluatedAt: Date.now(),
      };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[evaluation] attempt ${attempt + 1}/3 failed: ${lastError.message}`);
    }
  }

  throw new Error(`evaluateAnswer failed after 3 attempts: ${lastError?.message}`);
}

// ---------------------------------------------------------------------------
// Batch: evaluateParticipant
// ---------------------------------------------------------------------------

export type ParticipantEvaluationResult = {
  responseId: string;
  status: "fulfilled" | "rejected";
  result?: EvaluationResult;
  error?: string;
};

export async function evaluateParticipant(
  participantId: string,
): Promise<ParticipantEvaluationResult[]> {
  // Fetch all responses for the participant, with their question data
  const participantResponses = await db
    .select({
      response: responses,
      question: questions,
    })
    .from(responses)
    .innerJoin(questions, eq(responses.questionId, questions.id))
    .where(eq(responses.participantId, participantId));

  if (participantResponses.length === 0) {
    return [];
  }

  // Evaluate each response in parallel
  const settled = await Promise.allSettled(
    participantResponses.map(async ({ response, question }) => {
      const result = await evaluateAnswer(question, response.answerText);

      // Update the response record in DB
      await db
        .update(responses)
        .set({
          scorePoint: result.scorePoint,
          scoreAccuracy: result.scoreAccuracy,
          scoreIdea: result.scoreIdea,
          totalScore: result.totalScore,
          evaluationSummary: result.evaluationSummary,
          evaluationJson: JSON.stringify(result.evaluationJson),
          llmModel: result.model,
          evaluatedAt: result.evaluatedAt,
        })
        .where(eq(responses.id, response.id));

      return { responseId: response.id, result };
    }),
  );

  // Map results
  return settled.map((outcome, idx) => {
    const responseId = participantResponses[idx].response.id;
    if (outcome.status === "fulfilled") {
      return {
        responseId,
        status: "fulfilled" as const,
        result: outcome.value.result,
      };
    }
    return {
      responseId,
      status: "rejected" as const,
      error: outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason),
    };
  });
}
