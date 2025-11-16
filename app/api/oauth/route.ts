import { NextResponse } from "next/server";
import { getParams } from "@/lib/utils";
import { exchangeCodeForTokens } from "@/lib/oauth";
import { saveDeviceAccount } from "@/lib/deviceAccounts";
import { queue } from "@/lib/queue";

// OAuth callbacks (Fitbit/Oura)
export async function GET(req: Request) {
  const { code, state } = getParams(req.url);

  // TODO: Parse state to extract userId (state should be a JWT or encoded string)
  const stateData = JSON.parse(Buffer.from(state, 'base64').toString()); // Stub parsing
  const userId = stateData.userId || state;

  const tokens = await exchangeCodeForTokens('fitbit', code);

  await saveDeviceAccount({ userId, provider: 'fitbit', ...tokens });

  await queue('backfill_provider', { userId, provider: 'fitbit', days: 90 });

  return NextResponse.redirect(new URL('/settings/connections?connected=fitbit', req.url));
}

