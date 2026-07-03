import { redirect } from "next/navigation";
import Link from "next/link";
import { ResetForm } from "@/components/auth/ResetForm";

export default async function ResetPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg px-4 text-center">
        <h1 className="font-display text-xl font-semibold">Invalid link</h1>
        <p className="text-sm text-muted">This reset link is missing its token.</p>
        <Link href="/forgot" className="text-sm text-accent hover:underline">
          Request a new link
        </Link>
      </div>
    );
  }
  return <ResetForm token={token} />;
}
