import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { listAccounts } from '@/lib/account-store'
import { simulatedOverview, simulatedRecommendations, simulatedWaste } from '@/lib/simulation'
import type { CloudProvider } from '@/lib/mock-data'
import { loadSettings } from '@/lib/settings-store'
import { recordUsage } from '@/lib/copilot-usage'

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
  const apiKey = settings.groqApiKey || process.env.GROQ_API_KEY || ''
  const model = settings.aiModel || 'llama-3.3-70b-versatile'

  if (!apiKey) {
    // Demo mode — deterministic responses
    const lastMsg = messages[messages.length - 1]?.content?.toLowerCase() || ''
    let reply = "I'm VynCost AI Copilot. Add your Groq API key in **Settings → AI Copilot** to enable real AI responses."
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
  const client = new Groq({ apiKey })

  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: context },
      ...messages.map((m: { role: string; content: string }) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    ],
    max_tokens: 512,
    temperature: 0.3,
  })

  const usage = completion.usage
  if (usage) recordUsage(usage.prompt_tokens, usage.completion_tokens)

  const reply = completion.choices[0]?.message?.content || 'No response generated.'
  return NextResponse.json({ reply })
}
