import { NextResponse } from 'next/server'
import { listAccounts } from '@/lib/account-store'
import { simulatedOverview } from '@/lib/simulation'

export async function GET() {
  const accounts = listAccounts()
  const data = simulatedOverview(accounts.map(a => ({ id: a.id, name: a.name, provider: a.provider })))
  return NextResponse.json(data)
}
