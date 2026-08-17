'use client'
import { useState, useRef, useEffect } from 'react'
import useSWR from 'swr'
import { Sparkles, Send, Loader2, User, Bot, History, Zap, X, Search, Trash2 } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then(r => r.json())
const API_CONTEXT_MSGS = 20  // max messages sent to Groq (keeps tokens low; full history still shown)

interface Message { role: 'user' | 'assistant'; content: string; time?: string; date?: string }

const STORAGE_KEY = 'vyncost_copilot_history'
const MAX_STORED = 200  // max messages to persist

const WELCOME: Message = {
  role: 'assistant',
  content: "Hi! I'm your VynCost AI Copilot. I have full visibility into your cloud spend, waste, and optimization opportunities.\n\nAsk me anything — \"what caused last week's spike?\", \"how much can I save this month?\", or \"which team is overspending?\"",
  time: 'now',
  date: new Date().toLocaleDateString(),
}

const SUGGESTIONS = [
  'What are my top OCI services by cost this month?',
  'Are there idle compute instances I should stop?',
  'How are my Universal Credits being used?',
  'Am I on track with my budget this month?',
  'What does OCI Cloud Advisor recommend?',
  'Which compartment is driving the most spend?',
  'Forecast my OCI bill for end of month',
]

function loadHistory(): Message[] {
  if (typeof window === 'undefined') return [WELCOME]
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return [WELCOME]
    const parsed = JSON.parse(raw) as Message[]
    return parsed.length > 0 ? parsed : [WELCOME]
  } catch { return [WELCOME] }
}

function saveHistory(msgs: Message[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(msgs.slice(-MAX_STORED)))
  } catch { /* quota exceeded — silently ignore */ }
}

function todayStr() { return new Date().toLocaleDateString() }

function DateDivider({ date }: { date: string }) {
  const label = date === todayStr() ? 'Today' : date
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="flex-1 h-px bg-slate-800" />
      <span className="text-[10px] text-slate-600 font-medium">{label}</span>
      <div className="flex-1 h-px bg-slate-800" />
    </div>
  )
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
        isUser ? 'bg-orange-500/20 border border-orange-500/30' : 'bg-violet-500/20 border border-violet-500/30'
      }`}>
        {isUser ? <User size={13} className="text-orange-400" /> : <Bot size={13} className="text-violet-400" />}
      </div>
      <div className={`flex-1 max-w-[85%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div className={`text-[10px] font-medium ${isUser ? 'text-orange-400/70 text-right' : 'text-violet-400/70'}`}>
          {isUser ? 'You' : 'VynCost AI'} {msg.time && `· ${msg.time}`}
        </div>
        <div className={`text-sm rounded-2xl px-4 py-2.5 leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'bg-orange-500/10 border border-orange-500/20 text-orange-50 rounded-tr-sm'
            : 'bg-[#1a2335] border border-slate-700/60 text-slate-200 rounded-tl-sm'
        }`}>
          {msg.content}
        </div>
      </div>
    </div>
  )
}

export default function CopilotPage() {
  const [messages, setMessages] = useState<Message[]>(() => loadHistory())
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [historyFilter, setHistoryFilter] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const { data: usage, mutate: mutateUsage } = useSWR<{
    today: { requests: number; totalTokens: number; promptTokens: number; completionTokens: number }
  }>('/api/copilot/usage', fetcher, { refreshInterval: 10000 })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Persist to localStorage whenever messages change
  useEffect(() => {
    saveHistory(messages)
  }, [messages])

  function clearHistory() {
    const fresh = [{ ...WELCOME, time: 'now', date: todayStr() }]
    setMessages(fresh)
    try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
  }

  async function send(text?: string) {
    const content = (text ?? input).trim()
    if (!content || loading) return
    setInput('')

    const now = new Date()
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const dateStr = now.toLocaleDateString()

    const userMsg: Message = { role: 'user', content, time: timeStr, date: dateStr }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setLoading(true)

    try {
      const res = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Cap context sent to API — last N messages to limit token usage
        // Full history is still displayed in the UI from localStorage
        body: JSON.stringify({ messages: newMessages.slice(-API_CONTEXT_MSGS).map(m => ({ role: m.role, content: m.content })) }),
      })
      const { reply } = await res.json()
      setMessages(prev => [...prev, {
        role: 'assistant', content: reply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: todayStr(),
      }])
      mutateUsage()
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.', date: todayStr() }])
    } finally {
      setLoading(false)
    }
  }

  // Group messages by date for rendering dividers
  const rendered: (Message | { divider: true; date: string })[] = []
  let lastDate = ''
  for (const msg of messages) {
    const d = msg.date ?? ''
    if (d && d !== lastDate) {
      rendered.push({ divider: true, date: d })
      lastDate = d
    }
    rendered.push(msg)
  }

  const humanTurns = messages.filter(m => m.role === 'user').length

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
            <Sparkles size={15} className="text-violet-400" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">VynCost AI Copilot</div>
            <div className="text-xs text-slate-500">Multi-provider AI · full cost context</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {usage?.today && usage.today.totalTokens > 0 && (
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-violet-500/10 border border-violet-500/20">
              <Zap size={10} className="text-violet-400 shrink-0" />
              <span className="text-[10px] text-violet-300 font-mono">
                {usage.today.totalTokens.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-600 hidden sm:inline">
                <span className="text-slate-500">{usage.today.promptTokens.toLocaleString()} in</span>
                {' · '}
                <span className="text-slate-500">{usage.today.completionTokens.toLocaleString()} out</span>
                {' · '}
                <span className="text-slate-600">{usage.today.requests} req{usage.today.requests !== 1 ? 's' : ''}</span>
              </span>
            </div>
          )}
          {humanTurns > 0 && (
            <span className="text-[10px] text-slate-600 hidden sm:flex items-center gap-1">
              <History size={10} />{humanTurns} msg{humanTurns !== 1 ? 's' : ''}
            </span>
          )}
          <button onClick={() => { setShowHistory(v => !v); setHistoryFilter('') }}
            title="Prompt history"
            className={`p-1.5 rounded-lg transition-colors ${
              showHistory ? 'text-violet-400 bg-violet-500/10' : 'text-slate-500 hover:text-violet-400 hover:bg-violet-500/10'
            }`}>
            <History size={13} />
          </button>
        </div>
      </div>


      {/* Messages + History overlay */}
      <div className="flex-1 relative overflow-hidden">
        {/* Scrollable messages */}
        <div className="absolute inset-0 overflow-y-auto space-y-4 pb-2 pr-1">
          {rendered.map((item, i) =>
            'divider' in item
              ? <DateDivider key={`div-${i}`} date={item.date} />
              : <MessageBubble key={i} msg={item} />
          )}
          {loading && (
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
                <Bot size={13} className="text-violet-400" />
              </div>
              <div className="bg-[#1a2335] border border-slate-700/60 rounded-2xl rounded-tl-sm px-4 py-3">
                <Loader2 size={14} className="text-violet-400 animate-spin" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* History panel overlay */}
        {showHistory && (() => {
          const allPrompts = messages.filter(m => m.role === 'user')
          const filtered = historyFilter
            ? allPrompts.filter(m => m.content.toLowerCase().includes(historyFilter.toLowerCase()))
            : allPrompts
          // Group by date, newest date first
          const byDate = new Map<string, Message[]>()
          for (const msg of [...filtered].reverse()) {
            const d = msg.date || 'Unknown'
            if (!byDate.has(d)) byDate.set(d, [])
            byDate.get(d)!.push(msg)
          }
          return (
            <div className="absolute inset-0 z-10 bg-[#0b0f1a]/97 backdrop-blur-sm flex flex-col rounded-xl border border-slate-800/80">
              {/* Panel header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-2">
                  <History size={13} className="text-violet-400" />
                  <span className="text-sm font-semibold text-white">Prompt History</span>
                  <span className="text-[10px] text-slate-600">{allPrompts.length} prompts</span>
                </div>
                <button onClick={() => setShowHistory(false)}
                  className="p-1 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors">
                  <X size={14} />
                </button>
              </div>

              {/* Search */}
              <div className="px-3 py-2 border-b border-slate-800/60 shrink-0">
                <div className="flex items-center gap-2 bg-[#111827] border border-slate-700/60 rounded-lg px-2.5 py-1.5">
                  <Search size={12} className="text-slate-600 shrink-0" />
                  <input
                    value={historyFilter}
                    onChange={e => setHistoryFilter(e.target.value)}
                    placeholder="Filter prompts…"
                    className="flex-1 bg-transparent text-xs text-white placeholder-slate-600 focus:outline-none"
                  />
                  {historyFilter && (
                    <button onClick={() => setHistoryFilter('')} className="text-slate-600 hover:text-slate-400">
                      <X size={11} />
                    </button>
                  )}
                </div>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto py-2">
                {byDate.size === 0 ? (
                  <div className="text-center text-slate-600 text-xs py-10">No prompts found</div>
                ) : (
                  [...byDate.entries()].map(([date, prompts]) => (
                    <div key={date} className="mb-3">
                      <div className="px-4 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-600">
                        {date === todayStr() ? 'Today' : date}
                      </div>
                      {prompts.map((msg, i) => (
                        <button
                          key={i}
                          onClick={() => { setInput(msg.content); setShowHistory(false) }}
                          className="w-full text-left px-4 py-2 hover:bg-slate-800/60 transition-colors group"
                        >
                          <div className="text-xs text-slate-300 group-hover:text-white leading-snug line-clamp-2">
                            {msg.content}
                          </div>
                          {msg.time && (
                            <div className="text-[10px] text-slate-600 mt-0.5">{msg.time}</div>
                          )}
                        </button>
                      ))}
                    </div>
                  ))
                )}
              </div>

              {/* Footer — clear all */}
              <div className="px-4 py-2.5 border-t border-slate-800 shrink-0">
                <button
                  onClick={() => { clearHistory(); setShowHistory(false) }}
                  className="flex items-center gap-1.5 text-[11px] text-slate-600 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={11} />
                  Clear all history
                </button>
              </div>
            </div>
          )
        })()}
      </div>

      {/* Input */}
      <div className="shrink-0 pt-3">
        <div className="flex flex-wrap gap-1.5 mb-2">
          {SUGGESTIONS.map(s => (
            <button key={s} onClick={() => send(s)} disabled={loading}
              className="px-2.5 py-1 rounded-lg bg-[#111827] border border-slate-800 text-[11px] text-slate-400 hover:text-white hover:border-violet-500/40 disabled:opacity-40 transition-colors">
              {s}
            </button>
          ))}
        </div>
        <div className="flex gap-2 bg-[#111827] border border-slate-700 rounded-2xl p-1.5">
          <input
            value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
            placeholder="Ask about your cloud costs, waste, savings…"
            disabled={loading}
            className="flex-1 bg-transparent px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none"
          />
          <button onClick={() => send()} disabled={loading || !input.trim()}
            className="w-9 h-9 rounded-xl bg-violet-500 hover:bg-violet-400 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors shrink-0">
            <Send size={14} className="text-white" />
          </button>
        </div>
        <div className="text-[10px] text-slate-700 text-center mt-2">
          History saved locally · up to {MAX_STORED} messages · browse with <History size={9} className="inline mb-0.5" />
        </div>
      </div>
    </div>
  )
}

