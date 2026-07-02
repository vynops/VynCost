import { NextRequest, NextResponse } from 'next/server'
import { listAccounts, addAccount, sanitize } from '@/lib/account-store'

export async function GET() {
  const accounts = listAccounts().map(sanitize)
  return NextResponse.json(accounts)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const account = addAccount({ ...body, currency: body.currency || 'USD' })
  return NextResponse.json(sanitize(account), { status: 201 })
}
