import { NextRequest, NextResponse } from 'next/server'
import { loadSettings, saveSettings } from '@/lib/settings-store'

export async function GET() {
  const settings = loadSettings()
  return NextResponse.json({
    ...settings,
    aiApiKey: settings.aiApiKey ? '***configured***' : '',
    groqApiKey: settings.groqApiKey ? '***configured***' : '',
    adminEmail: process.env.VYNCOST_ADMIN_EMAIL || 'admin@example.com',
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const existing = loadSettings()
  if (body.aiApiKey === '***configured***') body.aiApiKey = existing.aiApiKey
  if (body.groqApiKey === '***configured***') body.groqApiKey = existing.groqApiKey
  if (body.aiProvider === 'groq' && body.aiApiKey && body.aiApiKey !== '***configured***') body.groqApiKey = body.aiApiKey
  const updated = saveSettings(body)
  return NextResponse.json({
    ...updated,
    aiApiKey: updated.aiApiKey ? '***configured***' : '',
    groqApiKey: updated.groqApiKey ? '***configured***' : '',
  })
}
