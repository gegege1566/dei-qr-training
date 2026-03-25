import { db } from "@/lib/db/client";
import { evaluateParticipant } from "@/lib/evaluation/engine";

export async function POST(
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

    // Run evaluation directly (not queued) so errors are visible
    const results = await evaluateParticipant(participant.id);

    const failed = results.filter((r) => r.status === "rejected");
    if (failed.length > 0) {
      console.error("Some evaluations failed:", failed);
    }

    return Response.json({
      status: "completed",
      total: results.length,
      succeeded: results.filter((r) => r.status === "fulfilled").length,
      failed: failed.length,
      errors: failed.map((r) => r.error),
    });
  } catch (error) {
    console.error("POST /api/play/[publicId]/evaluate failed:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return Response.json({ error: message }, { status: 500 });
  }
}
