import { NextResponse } from 'next/server';
import { checkConfig } from '@/lib/configValidator';

export async function GET() {
  const status = checkConfig();
  return NextResponse.json(status);
}
