import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth-server'
import { loadSettings, saveSettings } from '@/lib/settings-store'

export async function GET(req: NextRequest) {
  const deny = await requireRole(req, 'admin')
  if (deny) return deny

  const settings = loadSettings()
  return NextResponse.json({
    ...settings,
    aiApiKey: settings.aiApiKey ? '***configured***' : '',
    groqApiKey: settings.groqApiKey ? '***configured***' : '',
    adminEmail: process.env.VYNCOST_ADMIN_EMAIL || 'admin@example.com',
  })
}

export async function POST(req: NextRequest) {
  const deny = await requireRole(req, 'admin')
  if (deny) return deny

  const body = await req.json()
  const existing = loadSettings()
  if (body.aiApiKey === '***configured***') body.aiApiKey = existing.aiApiKey
  if (body.groqApiKey === '***configured***') body.groqApiKey = existing.groqApiKey
  const provider = body.aiProvider || existing.aiProvider
  if (provider === 'groq' && body.aiApiKey) body.groqApiKey = body.aiApiKey
  const updated = saveSettings(body)
  return NextResponse.json({
    ...updated,
    aiApiKey: updated.aiApiKey ? '***configured***' : '',
    groqApiKey: updated.groqApiKey ? '***configured***' : '',
  })
}
