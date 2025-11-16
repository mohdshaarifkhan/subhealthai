import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { toolSchemas } from "@/lib/copilotTools";
import { runTool } from "@/lib/copilotExec";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || undefined,
});

const MODEL = process.env.LLM_MODEL || "gpt-4o-mini";

const SYS = `You are SubHealthAI's preventive-health copilot.

- Always include: "Non-diagnostic. For context only."
- Prefer concise answers with bullets.
- If you need data, call a tool.
- Never invent numbers; cite values returned by tools.
- Default to the user's own baseline; avoid population norms unless asked.`;

function parseArgs(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}

export async function POST(req: NextRequest) {
  const { user, version = "phase3-v1-wes", messages } = await req.json();

  const msg = [
    { role: "system", content: SYS },
    ...messages,
  ];

  let toolResults: Record<string, any> = {};
  for (let i = 0; i < 3; i++) {
    const r = await client.chat.completions.create({
      model: MODEL,
      messages: msg,
      tools: toolSchemas as any,
      tool_choice: "auto",
      temperature: 0.2,
    });

    const choice = r.choices[0];
    const toolCall = choice.message.tool_calls?.[0];

    if (!toolCall) {
      const finalText = choice.message.content ?? "";
      return NextResponse.json({
        text: finalText,
        toolResults,
        disclaimer: "Non-diagnostic. For context only.",
      });
    }

    const name = toolCall.function.name;
    const rawArgs = parseArgs(toolCall.function.arguments || "{}");
    const args = { user, version, ...rawArgs };
    const result = await runTool(name, args);
    toolResults[name] = result;

    msg.push({
      role: "tool",
      tool_call_id: toolCall.id,
      name,
      content: JSON.stringify(result),
    });
  }

  return NextResponse.json({
    text: "I gathered the requested data. What would you like me to analyze next?",
    toolResults,
    disclaimer: "Non-diagnostic. For context only.",
  });
}


