import { NextRequest, NextResponse } from 'next/server'
import { listAccounts } from '@/lib/account-store'
import { simulatedExplorer } from '@/lib/simulation'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const groupBy = searchParams.get('groupBy') || 'service'
  const days = Math.min(Math.max(parseInt(searchParams.get('days') || '30', 10), 1), 365)
  const accounts = listAccounts()
  const data = await simulatedExplorer(
    accounts.map(a => ({ id: a.id, name: a.name, provider: a.provider })),
    groupBy,
    days
  )
  return NextResponse.json(data)
}

