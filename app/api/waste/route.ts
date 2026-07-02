import { NextRequest, NextResponse } from 'next/server'
import { listAccounts } from '@/lib/account-store'
import { simulatedWaste } from '@/lib/simulation'
import type { CloudProvider } from '@/lib/account-store'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const provider = searchParams.get('provider') as CloudProvider | null
  const accounts = listAccounts()
  const accts = accounts.map(a => ({ id: a.id, name: a.name, provider: a.provider }))
  const items = simulatedWaste(accts, provider ?? undefined)
  return NextResponse.json(items)
}
