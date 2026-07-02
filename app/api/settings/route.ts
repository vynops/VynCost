import { NextRequest, NextResponse } from 'next/server'
import { loadSettings, saveSettings } from '@/lib/settings-store'

export async function GET() {
  return NextResponse.json({
    ...loadSettings(),
    adminEmail: process.env.VYNCOST_ADMIN_EMAIL || 'admin@example.com',
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const updated = saveSettings(body)
  return NextResponse.json(updated)
}
