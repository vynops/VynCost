import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'

type Channel = 'slackWebhookUrl' | 'teamsWebhookUrl' | 'customWebhookUrl'

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, 'admin')
  if (auth) return auth

  try {
    const { channel, url } = await req.json() as { channel?: Channel; url?: string }
    if (!channel || !url?.trim()) return NextResponse.json({ ok: false, message: 'Channel URL is required' }, { status: 400 })
    if (!['slackWebhookUrl', 'teamsWebhookUrl', 'customWebhookUrl'].includes(channel)) {
      return NextResponse.json({ ok: false, message: 'Unknown notification channel' }, { status: 400 })
    }

    const parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return NextResponse.json({ ok: false, message: 'URL must use HTTP or HTTPS' }, { status: 400 })
    }

    const label = channel === 'slackWebhookUrl' ? 'Slack' : channel === 'teamsWebhookUrl' ? 'Microsoft Teams' : 'Custom webhook'
    const payload = channel === 'slackWebhookUrl'
      ? { text: 'VynCost test notification from Settings' }
      : channel === 'teamsWebhookUrl'
        ? { '@type': 'MessageCard', '@context': 'https://schema.org/extensions', summary: 'VynCost test notification', text: 'VynCost test notification from Settings' }
        : { alert_type: 'test', title: 'VynCost test notification', description: 'Test notification from VynCost Settings', severity: 'info', timestamp: new Date().toISOString(), source: 'vyncost/settings' }

    const started = Date.now()
    const response = await fetch(parsed, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!response.ok) {
      return NextResponse.json({ ok: false, message: `${label} returned HTTP ${response.status} ${response.statusText}` }, { status: 502 })
    }
    return NextResponse.json({ ok: true, message: `${label} delivered`, latencyMs: Date.now() - started })
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : 'Notification test failed' }, { status: 502 })
  }
}
