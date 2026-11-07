'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { KeyRound, Loader2 } from 'lucide-react'

export default function ChangePasswordPage() {
  const router = useRouter()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const result = await response.json()
      if (!response.ok) {
        setError(result.error || 'Could not change password')
        return
      }
      router.replace('/overview')
      router.refresh()
    } catch {
      setError('Could not change password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0b0f1a] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-orange-500/15 border border-orange-500/30 mb-4">
            <KeyRound size={22} className="text-orange-400" />
          </div>
          <h1 className="text-xl font-black text-white">Change your password</h1>
          <p className="text-sm text-slate-500 mt-1">Set a new password to continue to VynCost.</p>
        </div>

        <form onSubmit={submit} className="bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-4">
          <div>
            <label htmlFor="current-password" className="text-xs font-medium text-slate-400 block mb-1.5">Temporary password</label>
            <input id="current-password" type="password" autoComplete="current-password" required
              value={currentPassword} onChange={event => setCurrentPassword(event.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-orange-500/60" />
          </div>
          <div>
            <label htmlFor="new-password" className="text-xs font-medium text-slate-400 block mb-1.5">New password</label>
            <input id="new-password" type="password" autoComplete="new-password" minLength={8} required
              value={newPassword} onChange={event => setNewPassword(event.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-orange-500/60" />
          </div>
          <div>
            <label htmlFor="confirm-password" className="text-xs font-medium text-slate-400 block mb-1.5">Confirm new password</label>
            <input id="confirm-password" type="password" autoComplete="new-password" minLength={8} required
              value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-orange-500/60" />
          </div>

          {error && <p role="alert" className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2">
            {loading ? <><Loader2 size={14} className="animate-spin" /> Updating...</> : 'Set new password'}
          </button>
        </form>
      </div>
    </div>
  )
}