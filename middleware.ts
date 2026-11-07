import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/auth'

const PUBLIC = ['/login', '/api/auth/login']
const PASSWORD_CHANGE_ALLOWED = ['/change-password', '/api/auth/change-password', '/api/auth/logout']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (PUBLIC.some(p => pathname.startsWith(p))) return NextResponse.next()
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon')) return NextResponse.next()

  const token = req.cookies.get('vyncost_session')?.value
  if (!token) {
    const loginUrl = req.nextUrl.clone()
    loginUrl.pathname = '/login'
    return NextResponse.redirect(loginUrl)
  }
  const session = await verifySession(token)
  if (!session) {
    const loginUrl = req.nextUrl.clone()
    loginUrl.pathname = '/login'
    const res = NextResponse.redirect(loginUrl)
    res.cookies.delete('vyncost_session')
    return res
  }
  if (session.mustChangePassword && !PASSWORD_CHANGE_ALLOWED.includes(pathname)) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Password change required' }, { status: 403 })
    }
    const changePasswordUrl = req.nextUrl.clone()
    changePasswordUrl.pathname = '/change-password'
    return NextResponse.redirect(changePasswordUrl)
  }
  return NextResponse.next()
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] }
