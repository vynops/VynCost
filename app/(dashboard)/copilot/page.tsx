'use client'
import { useState, useRef, useEffect } from 'react'
import { Sparkles, Send, Loader2, User, Bot, RotateCcw } from 'lucide-react'

interface Message { role: 'user' | 'assistant'; content: string; time?: string }

const SUGGESTIONS = [
  'What caused the cost spike last week?',
  'Which resources should I delete today?',
  'How much can I save this month?',
  'Show me the top 3 optimisation actions',
  'Which team is overspending?',
]

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
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hi! I'm your VynCost AI Copilot. I have full visibility into your cloud spend, waste, and optimization opportunities.\n\nAsk me anything — \"what caused last week's spike?\", \"how much can I save this month?\", or \"which team is overspending?\"",
      time: 'now',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send(text?: string) {
    const content = (text ?? input).trim()
    if (!content || loading) return
    setInput('')

    const userMsg: Message = { role: 'user', content, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setLoading(true)

    try {
      const res = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages.map(m => ({ role: m.role, content: m.content })) }),
      })
      const { reply } = await res.json()
      setMessages(prev => [...prev, {
        role: 'assistant', content: reply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

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
            <div className="text-xs text-slate-500">Powered by Groq Llama · full cost context</div>
          </div>
        </div>
        <button onClick={() => setMessages([{
          role: 'assistant', content: "Hi! I'm your VynCost AI Copilot. Ask me anything about your cloud costs.", time: 'now'
        }])} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors">
          <RotateCcw size={13} />
        </button>
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-2 mb-4 shrink-0">
          {SUGGESTIONS.map(s => (
            <button key={s} onClick={() => send(s)}
              className="px-3 py-1.5 rounded-xl bg-[#111827] border border-slate-800 text-xs text-slate-400 hover:text-white hover:border-violet-500/40 transition-colors">
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-2">
        {messages.map((m, i) => <MessageBubble key={i} msg={m} />)}
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

      {/* Input */}
      <div className="shrink-0 pt-3">
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
          Add GROQ_API_KEY to .env.local for full AI responses · Context-aware FinOps assistant
        </div>
      </div>
    </div>
  )
}
