'use client'
import { useState } from 'react'

export default function IngestPage() {
  const [file, setFile] = useState<File | null>(null)
  const [email, setEmail] = useState('demo@subhealth.ai')
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) { setMsg('Choose a CSV file.'); return }
    setBusy(true); setMsg(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('email', email)
      const r = await fetch('/api/ingest', { method: 'POST', body: fd })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'ingest failed')

      // rollup the same day(s) quickly (assume file mostly for a single day)
      await fetch('/api/rollup', { method: 'POST' })

      setMsg(`Ingested ${j.ingested} rows. Rolled up to metrics.`)
    } catch (e: any) {
      setMsg(e.message || 'Error')
    } finally { setBusy(false) }
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">CSV Ingest (Demo)</h1>
      <form onSubmit={submit} className="space-y-3 rounded-xl border bg-white p-4">
        <div className="text-sm">
          <label className="block font-medium mb-1">User Email (for ownership)</label>
          <input
            className="w-full rounded-md border px-3 py-2"
            value={email}
            onChange={e=>setEmail(e.target.value)}
            placeholder="demo@subhealth.ai"
          />
        </div>
        <div className="text-sm">
          <label className="block font-medium mb-1">CSV file</label>
          <input type="file" accept=".csv,text/csv" onChange={e=>setFile(e.target.files?.[0]||null)} />
          <p className="mt-1 text-xs text-gray-500">Format: day,metric,value,source</p>
        </div>
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
        >
          {busy ? 'Uploading…' : 'Upload & Rollup'}
        </button>
        {msg && <p className="text-sm text-gray-700">{msg}</p>}
      </form>

      <p className="text-xs text-gray-500">
        ⚠️ Demo pipeline: CSV → events_raw → rollup → metrics → charts/flags. Not for PHI.
      </p>
    </div>
  )
}
