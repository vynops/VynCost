import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth-server'

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  return NextResponse.json({ id: session.id, email: session.email, name: session.name, role: session.role })
}
