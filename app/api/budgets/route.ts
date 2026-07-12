import { NextRequest, NextResponse } from 'next/server'
import { listBudgets, createBudget } from '@/lib/budget-store'
import { listAccounts } from '@/lib/account-store'
import { simulatedExplorer } from '@/lib/simulation'

export async function GET() {
  const budgets = listBudgets()
  if (!budgets.length) return NextResponse.json([])

  const accounts = listAccounts()
  const acctArg = accounts.map(a => ({ id: a.id, name: a.name, provider: a.provider }))

  // Determine which scopes are needed and fetch once each
  const scopes = new Set(budgets.map(b => b.scope))
  const [byAccount, byProvider, byService] = await Promise.all([
    scopes.has('account')  ? simulatedExplorer(acctArg, 'account')  : Promise.resolve([]),
    scopes.has('provider') ? simulatedExplorer(acctArg, 'provider') : Promise.resolve([]),
    scopes.has('service')  ? simulatedExplorer(acctArg, 'service')  : Promise.resolve([]),
  ])

  const spendMap = {
    account:  Object.fromEntries(byAccount.map(r => [r.label.toLowerCase(), r.amountUsd])),
    provider: Object.fromEntries(byProvider.map(r => [r.label.toLowerCase(), r.amountUsd])),
    service:  Object.fromEntries(byService.map(r => [r.label.toLowerCase(), r.amountUsd])),
  } as Record<string, Record<string, number>>

  const result = budgets.map(b => {
    const map = spendMap[b.scope] ?? {}
    const currentSpend = map[b.scopeValue.toLowerCase()] ?? 0
    return { ...b, currentSpend }
  })

  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const budget = createBudget(body)
  return NextResponse.json(budget, { status: 201 })
}
