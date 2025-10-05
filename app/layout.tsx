// app/layout.tsx
import './globals.css';
import Link from 'next/link';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-50 text-zinc-900">
        <header className="sticky top-0 z-20 border-b bg-white/80 backdrop-blur">
          <div className="mx-auto max-w-6xl flex items-center justify-between px-4 h-14">
            <Link href="/" className="font-semibold">SubHealthAI</Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link href="/dashboard" className="hover:underline">Dashboard</Link>
              <Link href="/weekly" className="hover:underline">Weekly Note</Link>
              <Link href="/ingest" className="hover:underline">Ingest (Demo)</Link>
              <a href="/api/report" className="rounded-md border px-3 py-1.5 hover:bg-gray-50">Download PDF</a>
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-6 grid gap-6 md:grid-cols-[220px,1fr]">
          <aside className="hidden md:block">
            <div className="sticky top-16 space-y-2">
              <Section title="Navigation">
                <NavItem href="/dashboard" label="Overview" />
                <NavItem href="/weekly" label="Weekly Note" />
              </Section>
              <Section title="Actions">
                <a href="/api/report" className="block rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">Export PDF</a>
              </Section>
            </div>
          </aside>
          <section>{children}</section>
        </main>
      </body>
    </html>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-white">
      <div className="border-b px-3 py-2 text-xs font-medium uppercase text-zinc-500">{title}</div>
      <div className="p-2">{children}</div>
    </div>
  );
}
function NavItem({ href, label }: { href: string; label: string }) {
  return <Link href={href} className="block rounded-md px-2 py-1.5 text-sm hover:bg-gray-50">{label}</Link>;
}
