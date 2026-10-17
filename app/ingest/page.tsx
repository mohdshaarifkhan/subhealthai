'use client'
import { useState } from 'react'

export default function IngestPage() {
  const [file, setFile] = useState<File | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) { setMsg('Choose a .zip or .csv file.'); return }
    setBusy(true); setMsg(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const r = await fetch('/api/ingest', { method: 'POST', body: fd })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'ingest failed')

      const p = j.pipeline
      setMsg(`Stored ${j.ingest.inserted} new of ${j.ingest.received} observations. ${p.features} daily features, ${p.dayFrom ?? '—'} → ${p.dayTo ?? '—'}. Latest day: ${p.latest?.status ?? 'n/a'}.`)
    } catch (e: any) {
      setMsg(e.message || 'Error')
    } finally { setBusy(false) }
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Upload wearable data</h1>
      <form onSubmit={submit} className="space-y-3 rounded-xl border bg-white p-4">
        <div className="text-sm">
          <label className="block font-medium mb-1">Samsung Health export (.zip) or CSV</label>
          <input type="file" accept=".zip,.csv,text/csv,application/zip" onChange={e=>setFile(e.target.files?.[0]||null)} />
          <p className="mt-1 text-xs text-gray-500">Saved to your signed-in account. CSV format: day,metric,value,source. Max 4 MB; larger exports use the ingest CLI.</p>
        </div>
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
        >
          {busy ? 'Processing…' : 'Upload & analyse'}
        </button>
        {msg && <p className="text-sm text-gray-700">{msg}</p>}
      </form>

      <p className="text-xs text-gray-500">
        Pipeline: export → events_raw → daily_features → drift run. Non-diagnostic research prototype.
      </p>
    </div>
  )
}
