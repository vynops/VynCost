import { NextRequest, NextResponse } from 'next/server'
import { listAccounts } from '@/lib/account-store'
import { simulatedForecast } from '@/lib/simulation'

export async function GET(req: NextRequest) {
  const horizon = parseInt(req.nextUrl.searchParams.get('horizon') || '90', 10)
  const accounts = listAccounts()
  const data = simulatedForecast(
    accounts.map(a => ({ id: a.id, name: a.name, provider: a.provider })),
    horizon
  )
  return NextResponse.json(data)
}
