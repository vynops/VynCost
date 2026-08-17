import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { listAccounts } from '@/lib/account-store'
import { simulatedOverview, simulatedRecommendations, simulatedWaste } from '@/lib/simulation'
import type { CloudProvider } from '@/lib/mock-data'
import { loadSettings } from '@/lib/settings-store'
import { recordUsage } from '@/lib/copilot-usage'

type ChatMessage = { role: 'user' | 'assistant'; content: string }

type AiResult = { reply: string; promptTokens?: number; completionTokens?: number }

type ProviderResponse = {
  error?: { message?: string }
  message?: string
  content?: Array<{ type?: string; text?: string }>
  usage?: { input_tokens?: number; output_tokens?: number; prompt_tokens?: number; completion_tokens?: number }
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number }
  choices?: Array<{ message?: { content?: string } }>
}

async function buildContext(): Promise<string> {
  const accounts = listAccounts()
  const acctArg = accounts.map(a => ({ id: a.id, name: a.name, provider: a.provider as CloudProvider }))
  const [overview, recs, waste] = await Promise.all([
    simulatedOverview(acctArg),
    simulatedRecommendations(acctArg),
    simulatedWaste(acctArg),
  ])

  const savingsTotal = recs.reduce((s, r) => s + r.savingsPerMonth, 0)
  const wasteTotal = waste.reduce((s, w) => s + w.costPerDay * 30, 0)

  return `
You are the VynCost AI Copilot, an expert FinOps assistant embedded in VynCost — a cloud cost management dashboard.

Current cost snapshot (this month so far):
- MTD spend: $${overview.totalMtd.toFixed(0)}
- Projected EOM: $${overview.projectedEom.toFixed(0)}
- Connected accounts: ${accounts.length > 0 ? accounts.map(a => `${a.name} (${a.provider.toUpperCase()})`).join(', ') : '3 demo accounts (AWS Production, GCP Core, Azure Dev)'}
- Top cost drivers: ${overview.topServices.slice(0, 3).map(s => `${s.service} ($${s.amountUsd.toFixed(0)}/mo, ${s.trend > 0 ? '+' : ''}${s.trend.toFixed(1)}% trend)`).join('; ')}

Recommendations summary:
- Total open recommendations: ${recs.filter(r => r.status === 'open').length}
- Total potential savings: $${savingsTotal.toFixed(0)}/month
- Top recommendation: "${recs[0]?.issue}" — save $${recs[0]?.savingsPerMonth.toFixed(0)}/mo

Waste detected:
- ${waste.filter(w => w.status === 'open').length} idle/orphaned resources
- Total waste cost: $${wasteTotal.toFixed(0)}/month

You have access to this data. Answer the user's FinOps question concisely and practically.
If asked for an apply command, show the exact CLI command from the recommendations.
Keep answers to 2-4 short paragraphs maximum. Use numbers from the context above.
`.trim()
}

export async function POST(req: NextRequest) {
  const { messages } = await req.json()
  if (!messages?.length) return NextResponse.json({ error: 'No messages' }, { status: 400 })

  const settings = loadSettings()
  const provider = settings.aiProvider || 'groq'
  const apiKey = settings.aiApiKey || (provider === 'groq' ? settings.groqApiKey || process.env.GROQ_API_KEY : '') || ''
  const model = settings.aiModel || 'llama-3.3-70b-versatile'

  if (!apiKey && !(provider === 'custom' && settings.aiBaseUrl)) {
    // Demo mode — deterministic responses
    const lastMsg = messages[messages.length - 1]?.content?.toLowerCase() || ''
    let reply = "I'm VynCost AI Copilot. Add an API key in **Settings → AI Copilot** to enable real AI responses."
    if (lastMsg.includes('saving') || lastMsg.includes('save') || lastMsg.includes('optim')) {
      reply = "Based on your current infrastructure, I've identified **$1,247/month** in potential savings. The top 3 actions are:\n\n1. **Rightsize prod-app-server-01** (EC2 m5.2xlarge → m5.large): saves $206/mo — CPU avg is only 4.2%\n2. **Purchase Compute Savings Plan** for your stable EC2 workload: saves $157/mo\n3. **Delete orphaned EBS snapshots and unattached volumes**: saves ~$75/mo with zero risk\n\nTotal risk-free savings (Low risk only): **$438/month**."
    } else if (lastMsg.includes('spike') || lastMsg.includes('increase') || lastMsg.includes('why')) {
      reply = "Your EC2 spend increased **+18%** vs last week in eu-west-1. The likely cause is your new auto-scaling group scaling out more aggressively — I see 3 additional m5.large instances launched on Tuesday.\n\nAlso, BigQuery scan volumes jumped this week — 3 unoptimised queries scanned >500GB each. Adding partition filters to those queries could reduce BigQuery costs by 40-60%."
    } else if (lastMsg.includes('waste') || lastMsg.includes('idle')) {
      reply = `I've found **8 idle/orphaned resources** costing **$${(8*1.8*30).toFixed(0)}/month** you can eliminate today:\n\n- 2 unattached EBS volumes (34 days idle)\n- 1 Elastic IP not associated with any instance\n- 1 orphaned EBS snapshot (source volume deleted)\n- 1 staging ALB with 0 targets for 21 days\n\nAll are **Low risk** — I'd recommend deleting them this sprint.`
    }
    return NextResponse.json({ reply })
  }

  const context = await buildContext()
  const chatMessages = messages.map((m: { role: string; content: string }) => ({
    role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content,
  })) as ChatMessage[]

  try {
    const result = await requestAi({ provider, apiKey, model, baseUrl: settings.aiBaseUrl, context, messages: chatMessages })
    if (result.promptTokens !== undefined || result.completionTokens !== undefined) {
      recordUsage(result.promptTokens ?? 0, result.completionTokens ?? 0)
    }
    return NextResponse.json({ reply: result.reply })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AI provider request failed'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}

async function requestAi({
  provider,
  apiKey,
  model,
  baseUrl,
  context,
  messages,
}: {
  provider: string
  apiKey: string
  model: string
  baseUrl: string
  context: string
  messages: ChatMessage[]
}): Promise<AiResult> {
  if (provider === 'groq') {
    const client = new Groq({ apiKey })
    const completion = await client.chat.completions.create({
      model,
      messages: [{ role: 'system', content: context }, ...messages],
      max_tokens: 512,
      temperature: 0.3,
    })
    return {
      reply: completion.choices[0]?.message?.content || 'No response generated.',
      promptTokens: completion.usage?.prompt_tokens,
      completionTokens: completion.usage?.completion_tokens,
    }
  }

  if (provider === 'anthropic') {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 512,
        system: context,
        messages: messages.map(message => ({ role: message.role === 'assistant' ? 'assistant' : 'user', content: message.content })),
      }),
    })
    const data = await readProviderResponse(response)
    const content = Array.isArray(data.content) ? data.content.find(item => item.type === 'text') : null
    return {
      reply: content?.text || 'No response generated.',
      promptTokens: data.usage?.input_tokens,
      completionTokens: data.usage?.output_tokens,
    }
  }

  if (provider === 'google') {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: context }] },
        contents: messages.map(message => ({ role: message.role === 'assistant' ? 'model' : 'user', parts: [{ text: message.content }] })),
        generationConfig: { maxOutputTokens: 512, temperature: 0.3 },
      }),
    })
    const data = await readProviderResponse(response)
    return {
      reply: data.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('') || 'No response generated.',
      promptTokens: data.usageMetadata?.promptTokenCount,
      completionTokens: data.usageMetadata?.candidatesTokenCount,
    }
  }

  const endpoint = `${(baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '')}/chat/completions`
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}) },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: context }, ...messages],
      max_tokens: 512,
      temperature: 0.3,
    }),
  })
  const data = await readProviderResponse(response)
  return {
    reply: data.choices?.[0]?.message?.content || 'No response generated.',
    promptTokens: data.usage?.prompt_tokens,
    completionTokens: data.usage?.completion_tokens,
  }
}

async function readProviderResponse(response: Response): Promise<ProviderResponse> {
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error?.message || data.message || `AI provider returned HTTP ${response.status}`)
  }
  return data
}
