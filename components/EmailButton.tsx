'use client'
import { useState } from 'react'

export default function EmailButton() {
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function send() {
    setLoading(true); setMsg(null)
    try {
      const res = await fetch('/api/email', { method: 'POST' })
      const j = await res.json()
      if (!res.ok || !j.ok) throw new Error(j.error || 'send failed')
      setMsg(`Sent to ${j.to}`)
    } catch (e: any) { setMsg(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={send}
        disabled={loading}
        className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50"
      >
        {loading ? 'Sending…' : 'Email PDF to Clinician'}
      </button>
      {msg && <span className="text-sm text-gray-600">{msg}</span>}
    </div>
  )
}
