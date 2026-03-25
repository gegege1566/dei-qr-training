import { getSessionBySlug } from "@/lib/db/session-service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const session = await getSessionBySlug(slug);

  if (!session) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  return Response.json({
    title: session.title,
    description: session.description,
    status: session.status,
    requiresPassword: !!session.participantPassword,
  });
}
