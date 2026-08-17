import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { requireRole } from '@/lib/auth'
import { loadSettings } from '@/lib/settings-store'

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, 'admin')
  if (auth) return auth

  const { to } = await req.json() as { to?: string }
  if (!to?.trim()) return NextResponse.json({ ok: false, message: 'Recipient email is required' }, { status: 400 })

  const settings = loadSettings()
  if (!settings.smtpHost || !settings.smtpPort || !settings.smtpFrom) {
    return NextResponse.json({ ok: false, message: 'SMTP host, port, and from address are required' }, { status: 400 })
  }

  try {
    const transporter = nodemailer.createTransport({
      host: settings.smtpHost,
      port: settings.smtpPort,
      secure: settings.smtpPort === 465,
      auth: settings.smtpUser ? { user: settings.smtpUser, pass: settings.smtpPassword } : undefined,
    })
    const started = Date.now()
    await transporter.sendMail({
      from: settings.smtpFrom,
      to: to.trim(),
      subject: '[VynCost] Test email',
      text: `This is a test email from VynCost Settings.\n\nSent: ${new Date().toISOString()}`,
    })
    return NextResponse.json({ ok: true, message: `Test email sent to ${to.trim()}`, latencyMs: Date.now() - started })
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : 'Email test failed' }, { status: 502 })
  }
}
