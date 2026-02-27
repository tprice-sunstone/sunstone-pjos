import { NextRequest, NextResponse } from 'next/server';
import { renderTemplate } from '@/lib/templates';

export async function POST(request: NextRequest) {
  const { body, variables } = await request.json();

  if (!body) {
    return NextResponse.json({ error: 'body is required' }, { status: 400 });
  }

  const rendered = renderTemplate(body, variables || {});
  return NextResponse.json({ rendered });
}
