// Design Ref: home-redesign.design.md §4.1 — public genre list
// is_active=true 만, position 오름차순

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('genres')
    .select('id, name, thumbnail_url, position')
    .eq('is_active', true)
    .order('position', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
