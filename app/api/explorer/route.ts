import { NextRequest, NextResponse } from 'next/server'
import { listAccounts } from '@/lib/account-store'
import { simulatedExplorer } from '@/lib/simulation'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const groupBy = searchParams.get('groupBy') || 'service'
  const accounts = listAccounts()
  const data = await simulatedExplorer(
    accounts.map(a => ({ id: a.id, name: a.name, provider: a.provider })),
    groupBy
  )
  return NextResponse.json(data)
}
