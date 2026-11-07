import { NextRequest, NextResponse } from 'next/server'
import { listAccounts } from '@/lib/account-store'
import { simulatedRecommendations } from '@/lib/simulation'
import type { CloudProvider } from '@/lib/account-store'
import { listActionStates } from '@/lib/action-store'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const category  = searchParams.get('category')
  const provider  = searchParams.get('provider') as CloudProvider | null
  const accountId = searchParams.get('accountId') ?? undefined
  const accounts  = listAccounts()
  let recs = await simulatedRecommendations(
    accounts.map(a => ({ id: a.id, name: a.name, provider: a.provider })),
    accountId
  )
  if (category) recs = recs.filter(r => r.category === category)
  if (provider) recs = recs.filter(r => r.provider === provider)
  const states = listActionStates('recommendations')
  return NextResponse.json(recs.map(rec => {
    const status = states[rec.id]?.status
    return status === 'applied' || status === 'dismissed' ? { ...rec, status } : rec
  }))
}
