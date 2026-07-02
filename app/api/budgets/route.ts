import { NextRequest, NextResponse } from 'next/server'
import { listBudgets, createBudget } from '@/lib/budget-store'

export async function GET() {
  return NextResponse.json(listBudgets())
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const budget = createBudget(body)
  return NextResponse.json(budget, { status: 201 })
}
