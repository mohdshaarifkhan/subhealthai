'use client'
import { useState } from 'react'

export default function GenerateWeeklyButton() {
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function run() {
    setLoading(true); setMsg(null)
    try {
      const r = await fetch('/api/weekly-note', { method: 'POST' })
      const j = await r.json()
      if (!r.ok || !j.ok) throw new Error(j.error || 'failed')
      setMsg('Weekly note generated.')
      window.location.reload() // ← important so UI shows the new note
    } catch (e:any) { setMsg(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={run}
        disabled={loading}
        className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50"
      >
        {loading ? 'Generating…' : 'Generate Weekly Note'}
      </button>
      {msg && <span className="text-sm text-gray-600">{msg}</span>}
    </div>
  )
}
