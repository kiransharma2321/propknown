import Link from "next/link";

export const metadata = { title: "Unsubscribed — PropKnown", robots: { index: false, follow: false } };

export default function UnsubscribedPage({ searchParams }: { searchParams: { error?: string } }) {
  const failed = searchParams.error === "1";
  return (
    <div className="pt-32 pb-20 bg-white min-h-screen">
      <div className="max-w-md mx-auto px-6 text-center">
        <h1 className="heading-h2 mb-3">{failed ? "That link didn't work" : "You're unsubscribed"}</h1>
        <p className="text-gray-500 text-sm leading-relaxed mb-6">
          {failed
            ? "This unsubscribe link is invalid or incomplete. Reply to any PropKnown email with \"unsubscribe\" and we'll remove you by hand."
            : "You won't receive any more marketing emails from PropKnown. If you request a report again, we'll still send you that report."}
        </p>
        <Link href="/" className="btn-secondary">Back to PropKnown</Link>
      </div>
    </div>
  );
}
