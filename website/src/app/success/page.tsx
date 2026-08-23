import { redirect } from "next/navigation";

export default async function SuccessPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id: sessionId } = await searchParams;
  redirect(sessionId ? `/account?purchase=success&session_id=${encodeURIComponent(sessionId)}` : "/account");
}
