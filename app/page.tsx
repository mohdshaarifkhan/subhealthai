import Link from "next/link";

export default function HomePage() {
  return (
    <main className="grid gap-4 md:grid-cols-2 p-6">
      <section className="rounded-2xl border border-zinc-800 p-4">
        <h2 className="mb-2 text-lg font-semibold">Today's Status</h2>
        <ul className="space-y-1 text-sm">
          <li>• Sleep debt: <span className="font-medium">Flagged</span></li>
          <li>• HRV: <span className="font-medium">Low</span></li>
          <li>• Resting HR: <span className="font-medium">Slightly elevated</span></li>
        </ul>
        <div className="mt-3 flex gap-3">
          <Link
            href="/weekly"
            className="rounded-xl bg-white px-4 py-2 text-black"
          >
            Primary CTA: View Weekly Note
          </Link>
          <Link
            href="/dashboard"
            className="rounded-xl border px-4 py-2"
          >
            Go to Dashboard →
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-800 p-4">
        <h2 className="mb-2 text-lg font-semibold">History</h2>
        <p className="text-sm opacity-80">
          Charts placeholder (sleep, HRV, HR, steps — 7/30/90d).
        </p>
      </section>

      <section className="rounded-2xl border border-zinc-800 p-4 md:col-span-2">
        <h2 className="mb-2 text-lg font-semibold">Export</h2>
        <p className="text-sm opacity-80">
          One-tap PDF/email for clinicians: [coming soon]
        </p>
      </section>
    </main>
  );
}
