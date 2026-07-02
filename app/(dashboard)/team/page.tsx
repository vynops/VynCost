'use client'
import useSWR from 'swr'
import { useState } from 'react'
import { Plus, Trash2, Pencil, X, Check, Shield, Eye, Edit3, Crown, Loader2 } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then(r => r.json())

type Role = 'admin' | 'editor' | 'viewer'
interface User { id: string; email: string; name: string; role: Role; createdAt: string; lastLoginAt?: string }

const ROLE_META: Record<Role, { label: string; icon: React.ComponentType<{ size?: number; className?: string }>; color: string; desc: string }> = {
  admin:  { label: 'Admin',  icon: Crown,  color: 'bg-orange-500/10 text-orange-400 border-orange-500/20', desc: 'Full access — accounts, settings, users' },
  editor: { label: 'Editor', icon: Edit3,  color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',     desc: 'View + manage budgets, ack anomalies, apply recs' },
  viewer: { label: 'Viewer', icon: Eye,    color: 'bg-slate-700/50 text-slate-300 border-slate-600/30',  desc: 'Read-only access, CSV export' },
}

function RoleBadge({ role }: { role: Role }) {
  const m = ROLE_META[role]
  const Icon = m.icon
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border ${m.color}`}>
      <Icon size={10} /> {m.label}
    </span>
  )
}

function InviteModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: '', email: '', role: 'viewer' as Role, password: '', confirm: '' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (form.password !== form.confirm) { setErr('Passwords do not match'); return }
    setSaving(true); setErr('')
    const res = await fetch('/api/users', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name, email: form.email, role: form.role, password: form.password }),
    })
    setSaving(false)
    if (res.ok) { onCreated(); onClose() }
    else { const d = await res.json(); setErr(d.error || 'Failed to create user') }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#111827] border border-slate-700 rounded-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-bold text-white">Add Team Member</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={16} /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          {[
            { label: 'Full Name', key: 'name', type: 'text', placeholder: 'Jane Smith' },
            { label: 'Email', key: 'email', type: 'email', placeholder: 'jane@company.com' },
            { label: 'Password', key: 'password', type: 'password', placeholder: '8+ characters' },
            { label: 'Confirm Password', key: 'confirm', type: 'password', placeholder: 'Repeat password' },
          ].map(f => (
            <div key={f.key}>
              <label className="text-xs text-slate-400 font-medium block mb-1">{f.label}</label>
              <input type={f.type} value={form[f.key as keyof typeof form]}
                onChange={e => set(f.key, e.target.value)} placeholder={f.placeholder} required
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-orange-500/60" />
            </div>
          ))}

          <div>
            <label className="text-xs text-slate-400 font-medium block mb-2">Role</label>
            <div className="space-y-2">
              {(['admin', 'editor', 'viewer'] as Role[]).map(r => {
                const m = ROLE_META[r]
                const Icon = m.icon
                return (
                  <label key={r} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    form.role === r ? `${m.color} border-opacity-60` : 'border-slate-700 hover:border-slate-600'
                  }`}>
                    <input type="radio" name="role" value={r} checked={form.role === r}
                      onChange={() => set('role', r)} className="mt-0.5 accent-orange-500" />
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                        <Icon size={12} /> {m.label}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{m.desc}</div>
                    </div>
                  </label>
                )
              })}
            </div>
          </div>

          {err && <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-xl">{err}</div>}

          <button type="submit" disabled={saving}
            className="w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2">
            {saving ? <Loader2 size={13} className="animate-spin" /> : null}
            Add Team Member
          </button>
        </form>
      </div>
    </div>
  )
}

function EditRoleModal({ user, onClose, onSaved }: { user: User; onClose: () => void; onSaved: () => void }) {
  const [role, setRole] = useState<Role>(user.role)
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    await fetch(`/api/users/${user.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    setSaving(false); onSaved(); onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#111827] border border-slate-700 rounded-2xl p-6 w-full max-w-sm">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-bold text-white">Change Role — {user.name}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={16} /></button>
        </div>
        <div className="space-y-2 mb-5">
          {(['admin', 'editor', 'viewer'] as Role[]).map(r => {
            const m = ROLE_META[r]
            const Icon = m.icon
            return (
              <label key={r} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                role === r ? `${m.color} border-opacity-60` : 'border-slate-700 hover:border-slate-600'
              }`}>
                <input type="radio" name="role" value={r} checked={role === r}
                  onChange={() => setRole(r)} className="mt-0.5 accent-orange-500" />
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white"><Icon size={12} /> {m.label}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{m.desc}</div>
                </div>
              </label>
            )
          })}
        </div>
        <button onClick={save} disabled={saving || role === user.role}
          className="w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2">
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
          Save Role
        </button>
      </div>
    </div>
  )
}

export default function TeamPage() {
  const [showInvite, setShowInvite] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const { data: me } = useSWR<{ id: string; role: Role }>('/api/auth/me', fetcher)
  const { data: usersData, mutate, isLoading } = useSWR<User[] | { error: string }>(
    '/api/users', fetcher
  )
  const users: User[] = Array.isArray(usersData) ? usersData : []
  const isAdmin = me?.role === 'admin'

  async function deleteUser(u: User) {
    if (!confirm(`Remove ${u.name} (${u.email})? This cannot be undone.`)) return
    await fetch(`/api/users/${u.id}`, { method: 'DELETE' })
    mutate()
  }

  if (!isAdmin) {
    return (
      <div className="max-w-3xl">
        <div className="bg-[#111827] border border-slate-800/60 rounded-2xl p-10 text-center">
          <Shield size={32} className="mx-auto mb-3 text-slate-600" />
          <div className="text-sm font-bold text-white mb-1">Access Restricted</div>
          <div className="text-xs text-slate-500">Only admins can manage team members.</div>
          {me && <div className="mt-3 text-[11px] text-slate-600">Your role: <span className="text-slate-400 font-bold">{me.role}</span></div>}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Role legend */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {(['admin', 'editor', 'viewer'] as Role[]).map(r => {
          const m = ROLE_META[r]
          const Icon = m.icon
          const count = users.filter(u => u.role === r).length
          return (
            <div key={r} className={`flex items-center gap-3 bg-[#111827] border rounded-2xl p-4 ${m.color.split(' ').find(c => c.startsWith('border')) || 'border-slate-800/60'}`}>
              <div className={`p-2 rounded-xl border ${m.color}`}><Icon size={14} /></div>
              <div>
                <div className="text-sm font-black text-white">{count}</div>
                <div className="text-xs text-slate-400">{m.label}{count !== 1 ? 's' : ''}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-white">Team Members</h2>
          <p className="text-xs text-slate-500 mt-0.5">{users.length} member{users.length !== 1 ? 's' : ''} with access to VynCost</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowInvite(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-xs font-bold transition-colors">
            <Plus size={13} /> Add Member
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-[#111827] border border-slate-800/60 rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="h-40 flex items-center justify-center text-slate-500 animate-pulse text-sm">Loading team…</div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500">
                <th className="text-left px-4 sm:px-6 py-3 font-medium">Member</th>
                <th className="text-left px-4 py-3 font-medium">Role</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Joined</th>
                <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Last Login</th>
                {isAdmin && <th className="px-4 sm:px-6 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {users.map(u => (
                <tr key={u.id} className={`hover:bg-slate-800/20 transition-colors ${u.id === me?.id ? 'bg-orange-500/3' : ''}`}>
                  <td className="px-4 sm:px-6 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white shrink-0">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-white flex items-center gap-1.5">
                          {u.name}
                          {u.id === me?.id && <span className="text-[9px] font-bold text-orange-400 bg-orange-500/10 px-1 py-0.5 rounded">You</span>}
                        </div>
                        <div className="text-slate-500">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                  <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{u.createdAt.split('T')[0]}</td>
                  <td className="px-4 py-3 text-slate-500 hidden lg:table-cell">
                    {u.lastLoginAt ? u.lastLoginAt.split('T')[0] : <span className="text-slate-700">Never</span>}
                  </td>
                  {isAdmin && (
                    <td className="px-4 sm:px-6 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setEditUser(u)}
                          className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-500 hover:text-white transition-colors">
                          <Pencil size={12} />
                        </button>
                        {u.id !== me?.id && (
                          <button onClick={() => deleteUser(u)}
                            className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors">
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Role permissions legend */}
      <div className="bg-[#111827] border border-slate-800/60 rounded-2xl p-5">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Shield size={12} /> Role Permissions
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-500 border-b border-slate-800">
                <th className="text-left py-2 font-medium">Permission</th>
                <th className="text-center py-2 font-medium px-4"><Crown size={10} className="inline text-orange-400" /> Admin</th>
                <th className="text-center py-2 font-medium px-4"><Edit3 size={10} className="inline text-blue-400" /> Editor</th>
                <th className="text-center py-2 font-medium px-4"><Eye size={10} className="inline text-slate-400" /> Viewer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30">
              {[
                ['View all cost data & charts',        true,  true,  true  ],
                ['Export CSV',                          true,  true,  true  ],
                ['Acknowledge anomalies',               true,  true,  false ],
                ['Mark recommendations applied',        true,  true,  false ],
                ['Manage budgets',                      true,  true,  false ],
                ['Connect / delete cloud accounts',     true,  false, false ],
                ['Change app settings',                 true,  false, false ],
                ['Manage team members',                 true,  false, false ],
              ].map(([label, admin, editor, viewer]) => (
                <tr key={String(label)} className="hover:bg-slate-800/20">
                  <td className="py-2 text-slate-300">{String(label)}</td>
                  {[admin, editor, viewer].map((v, i) => (
                    <td key={i} className="py-2 text-center">
                      {v ? <Check size={12} className="inline text-green-400" /> : <span className="text-slate-700">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showInvite && <InviteModal onClose={() => setShowInvite(false)} onCreated={mutate} />}
      {editUser   && <EditRoleModal user={editUser} onClose={() => setEditUser(null)} onSaved={mutate} />}
    </div>
  )
}
