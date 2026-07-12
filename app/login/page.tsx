'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DollarSign, Eye, EyeOff, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    setLoading(false)
    if (res.ok) { router.push('/overview') }
    else { setError('Invalid email or password') }
  }

  return (
    <div className="min-h-screen bg-[#0b0f1a] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-orange-500/15 border border-orange-500/30 mb-4">
            <DollarSign size={22} className="text-orange-400" />
          </div>
          <h1 className="text-xl font-black text-white">
            Vyn<span className="text-orange-400">Cost</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">AI-Powered Cloud Cost Optimizer</p>
        </div>

        <form onSubmit={submit} className="bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1.5">Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              required placeholder="admin@example.com"
              className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-orange-500/60 focus:ring-1 focus:ring-orange-500/20"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                required placeholder="••••••••"
                className="w-full px-3 py-2.5 pr-10 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-orange-500/60 focus:ring-1 focus:ring-orange-500/20"
              />
              <button type="button" onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2">
            {loading ? <><Loader2 size={14} className="animate-spin" /> Signing in...</> : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3 text-xs text-slate-500 space-y-1.5">
          <p className="font-semibold text-slate-400">First-time setup</p>
          <p>Set <span className="font-mono text-slate-400">VYNCOST_ADMIN_EMAIL</span> and <span className="font-mono text-slate-400">VYNCOST_ADMIN_PASSWORD</span> in <span className="font-mono text-slate-400">.env.local</span> — the admin account is created automatically on first boot.</p>
        </div>

        {/* Family footer */}
        <p className="text-center text-xs text-slate-600 mt-4">
          Part of the{' '}
          <a href="https://vynops.com" target="_blank" rel="noopener noreferrer"
            className="text-orange-400 hover:text-orange-300 transition-colors font-medium">VynOps Suite</a>
        </p>
      </div>
    </div>
  )
}