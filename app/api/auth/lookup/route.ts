import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // service key ONLY in server routes
);

export async function POST(req: Request) {
  const { email } = await req.json();

  if (!email) {
    return NextResponse.json({ error: 'email_required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('users')
    .select('id, email')
    .eq('email', email.toLowerCase())
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ userId: data.id, email: data.email });
}

