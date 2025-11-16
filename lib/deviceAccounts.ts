import { supabaseAdmin } from "./supabaseAdmin";

/**
 * Save OAuth device account credentials to database.
 */
export async function saveDeviceAccount(data: {
  userId: string;
  provider: string;
  access_token: string;
  refresh_token: string;
  expires_in?: number;
}): Promise<void> {
  // TODO: Implement actual database save
  // Example schema: device_accounts (user_id, provider, access_token, refresh_token, expires_at, created_at)
  
  console.log(`[DEVICE_ACCOUNT] Saving ${data.provider} account for user ${data.userId}`);
  
  // Stub implementation
  // await supabaseAdmin
  //   .from('device_accounts')
  //   .upsert({
  //     user_id: data.userId,
  //     provider: data.provider,
  //     access_token: data.access_token,
  //     refresh_token: data.refresh_token,
  //     expires_at: data.expires_in ? new Date(Date.now() + data.expires_in * 1000).toISOString() : null,
  //   }, {
  //     onConflict: 'user_id,provider'
  //   });
}

