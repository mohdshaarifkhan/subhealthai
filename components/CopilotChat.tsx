"use client";

import { useState } from "react";
import { useActiveUser } from "@/utils/useActiveUser";

export default function CopilotChat() {
  const user = useActiveUser() || "demo";
  const [items, setItems] = useState<{ role: "user" | "assistant"; text: string }[]>([]);
  const [input, setInput] = useState("");

  async function send() {
    if (!input.trim()) return;
    const newItems = [...items, { role: "user" as const, text: input }];
    setItems(newItems);
    setInput("");

    const res = await fetch("/api/copilot/ask", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        user,
        messages: newItems.map(m => ({ role: m.role as "user" | "assistant", content: m.text })),
      }),
    }).then(r => r.json());

    setItems([...newItems, { role: "assistant" as const, text: res.text }]);
  }

  return (
    <div className="rounded-xl border p-4">
      <div className="mb-3 text-sm text-gray-500">Ask SubHealthAI (non-diagnostic)</div>
      <div className="max-h-64 space-y-2 overflow-auto">
        {items.map((m, i) => (
          <div key={i} className={m.role === "user" ? "text-right" : ""}>
            <span
              className={
                m.role === "user"
                  ? "inline-block rounded bg-blue-50 px-2 py-1"
                  : "inline-block rounded bg-gray-50 px-2 py-1"
              }
            >
              {m.text}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          className="flex-1 rounded border px-3 py-2"
          placeholder="Why did risk change today?"
        />
        <button onClick={send} className="rounded bg-black px-4 py-2 text-white">
          Send
        </button>
      </div>
    </div>
  );
}
