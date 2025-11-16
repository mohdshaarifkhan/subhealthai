"use client";

import { useState } from "react";
import { useActiveUser } from "@/utils/useActiveUser";

export default function CopilotPanel() {
  const user = useActiveUser() || "demo";
  const [msgs, setMsgs] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function send() {
    const m = input.trim();
    if (!m) return;
    const nextMsgs = [...msgs, { role: "user", content: m }];
    setMsgs(nextMsgs);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user, version: "phase3-v1-wes", messages: nextMsgs }),
      });
      const data = await res.json();
      const answer = data?.answer || "No reply.";
      const footer = data?.report_url ? `\n\nReport: ${data.report_url}` : "";
      setMsgs(prev => [...prev, { role: "assistant", content: answer + footer }]);
    } catch (e: any) {
      setMsgs(prev => [...prev, { role: "assistant", content: `Copilot failed. ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border p-4">
      <div className="mb-3 text-sm text-gray-500">SubHealthAI Copilot · non-diagnostic</div>
      <div className="max-h-72 space-y-3 overflow-auto">
        {msgs.map((m, i) => (
          <div key={i} className={m.role === "user" ? "text-right" : ""}>
            <div
              className={`inline-block rounded-xl px-3 py-2 ${
                m.role === "user" ? "bg-blue-600 text-white" : "bg-gray-100"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder='Ask: "Why did my risk change?" or "Show last 7d HRV trend"'
          className="w-full rounded-xl border px-3 py-2"
        />
        <button
          onClick={send}
          disabled={loading}
          className="rounded-xl bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {loading ? "Thinking…" : "Send"}
        </button>
      </div>
    </div>
  );
}


