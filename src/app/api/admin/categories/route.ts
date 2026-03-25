import { db } from "@/lib/db/client";
import { questions } from "@/lib/db/schema";

export async function GET() {
  const allQuestions = await db.select({
    majorCategory: questions.majorCategory,
    mediumCategory: questions.mediumCategory,
  }).from(questions);

  const categoryMap = new Map<string, Set<string>>();
  for (const q of allQuestions) {
    if (!categoryMap.has(q.majorCategory)) {
      categoryMap.set(q.majorCategory, new Set());
    }
    categoryMap.get(q.majorCategory)!.add(q.mediumCategory);
  }

  const categories = Array.from(categoryMap.entries()).map(([major, mediums]) => ({
    majorCategory: major,
    mediumCategories: Array.from(mediums).sort(),
  }));

  return Response.json({ categories });
}
