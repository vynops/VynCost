/**
 * Unified simulation engine.
 * Routes per-account calls to the correct vendor simulator.
 * For OCI accounts with credentials, delegates to real OCI API (lib/oci-live.ts).
 */

import type { CloudProvider, ServiceCost, Recommendation, WasteItem, AllocationRow, OverviewData, AnomalyEvent, RiCoverageItem } from '@/lib/mock-data'
import { createRng, hashSeed, seededRand } from '@/lib/simulation/seed'
import { listAccounts } from '@/lib/account-store'
import {
  ociHasCredentials,
  ociServiceCostsLive,
  ociDailyTrendLive,
  ociMonthlyCostLive,
  ociAllocationLive,
  ociAnomaliesLive,
  ociRecommendationsLive,
  ociWasteLive,
  ociCommitmentsLive,
} from '@/lib/oci-live'

import { awsServiceCosts, awsDailyTrend, awsRecommendations, awsWaste, awsMonthlyCost, awsAllocation } from '@/lib/simulation/vendors/aws'
import { gcpServiceCosts, gcpDailyTrend, gcpRecommendations, gcpWaste, gcpMonthlyCost, gcpAllocation } from '@/lib/simulation/vendors/gcp'
import { azureServiceCosts, azureDailyTrend, azureRecommendations, azureWaste, azureMonthlyCost, azureAllocation } from '@/lib/simulation/vendors/azure'
import { ociServiceCosts, ociDailyTrend, ociRecommendations, ociWaste, ociMonthlyCost, ociAllocation } from '@/lib/simulation/vendors/oci'

// ── Default demo accounts used when none are configured ──────────────────────
export const DEFAULT_ACCOUNTS: { id: string; name: string; provider: CloudProvider }[] = [
  { id: 'demo-aws-prod',     name: 'AWS Production',    provider: 'aws'   },
  { id: 'demo-aws-staging',  name: 'AWS Staging',       provider: 'aws'   },
  { id: 'demo-gcp-core',     name: 'GCP Core',          provider: 'gcp'   },
  { id: 'demo-azure-dev',    name: 'Azure Dev',         provider: 'azure' },
  { id: 'demo-oci-infra',    name: 'OCI Infrastructure',provider: 'oci'   },
]

// ── OCI live account lookup ───────────────────────────────────────────────────
function liveOciAccount(id: string) {
  const full = listAccounts().find(a => a.id === id)
  return full && ociHasCredentials(full) ? full : null
}

// ── Per-vendor routing (async — OCI routes to live API when creds present) ────
async function serviceCosts(acct: { id: string; name: string; provider: CloudProvider }): Promise<ServiceCost[]> {
  if (acct.provider === 'oci') {
    const live = liveOciAccount(acct.id)
    if (live) {
      try { return await ociServiceCostsLive(live) } catch (e) { console.error('[OCI live] serviceCosts failed:', e) }
    }
  }
  switch (acct.provider) {
    case 'aws':   return awsServiceCosts(acct.id, acct.name)
    case 'gcp':   return gcpServiceCosts(acct.id, acct.name)
    case 'azure': return azureServiceCosts(acct.id, acct.name)
    case 'oci':   return ociServiceCosts(acct.id, acct.name)
  }
}

async function dailyTrend(acct: { id: string; provider: CloudProvider }) {
  if (acct.provider === 'oci') {
    const live = liveOciAccount(acct.id)
    if (live) {
      try { return await ociDailyTrendLive(live) } catch (e) { console.error('[OCI live] dailyTrend failed:', e) }
    }
  }
  switch (acct.provider) {
    case 'aws':   return awsDailyTrend(acct.id)
    case 'gcp':   return gcpDailyTrend(acct.id)
    case 'azure': return azureDailyTrend(acct.id)
    case 'oci':   return ociDailyTrend(acct.id)
  }
}

async function monthlyCost(acct: { id: string; provider: CloudProvider }): Promise<number> {
  if (acct.provider === 'oci') {
    const live = liveOciAccount(acct.id)
    if (live) {
      try { return await ociMonthlyCostLive(live) } catch (e) { console.error('[OCI live] monthlyCost failed:', e) }
    }
  }
  switch (acct.provider) {
    case 'aws':   return awsMonthlyCost(acct.id)
    case 'gcp':   return gcpMonthlyCost(acct.id)
    case 'azure': return azureMonthlyCost(acct.id)
    case 'oci':   return ociMonthlyCost(acct.id)
  }
}

// ── Overview ─────────────────────────────────────────────────────────────────
export async function simulatedOverview(
  accounts: { id: string; name: string; provider: CloudProvider }[]
): Promise<OverviewData> {
  const accts = accounts.length ? accounts : DEFAULT_ACCOUNTS

  // Merge daily trends (sum by date) — run all in parallel
  const trendMap = new Map<string, number>()
  const trendResults = await Promise.all(accts.map(acct => dailyTrend(acct)))
  for (const pts of trendResults) {
    for (const pt of pts) {
      trendMap.set(pt.date, (trendMap.get(pt.date) ?? 0) + pt.amountUsd)
    }
  }
  const daily = Array.from(trendMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, amountUsd]) => ({ date, amountUsd: parseFloat(amountUsd.toFixed(2)) }))

  const today = new Date().getDate()
  const totalMtd       = parseFloat(daily.slice(-today).reduce((s, p) => s + p.amountUsd, 0).toFixed(2))
  const projectedEom   = parseFloat(((totalMtd / today) * 30).toFixed(2))

  // Top services across all accounts (top 12 by cost)
  const allServicesArrays = await Promise.all(accts.map(a => serviceCosts(a)))
  const allServices: ServiceCost[] = allServicesArrays.flat()
  const topServices = allServices
    .sort((a, b) => b.amountUsd - a.amountUsd)
    .slice(0, 12)

  // By provider
  const providerTotals = new Map<CloudProvider, number>()
  const monthlyCosts = await Promise.all(accts.map(acct => monthlyCost(acct)))
  accts.forEach((acct, i) => {
    providerTotals.set(acct.provider, (providerTotals.get(acct.provider) ?? 0) + monthlyCosts[i])
  })
  const byProvider = Array.from(providerTotals.entries()).map(([provider, amountUsd]) => ({
    provider, amountUsd: parseFloat(amountUsd.toFixed(2)),
  }))

  // Savings — sum real recs if available, else estimate from projected spend
  const recs = await simulatedRecommendations(accts)
  const savingsFound = recs.length > 0
    ? parseFloat(recs.filter(r => r.status === 'open').reduce((s, r) => s + r.savingsPerMonth, 0).toFixed(2))
    : parseFloat((projectedEom * seededRand(createRng(hashSeed('overview:savings')), 0.12, 0.20)).toFixed(2))
  const savingsApplied = recs.length > 0
    ? parseFloat(recs.filter(r => r.status === 'applied').reduce((s, r) => s + r.savingsPerMonth, 0).toFixed(2))
    : parseFloat((savingsFound * seededRand(createRng(hashSeed('overview:applied')), 0.2, 0.45)).toFixed(2))

  // Alerts — one per vendor with realistic messages
  const alerts: OverviewData['alerts'] = []
  if (providerTotals.has('aws'))   alerts.push({ id: 'al-aws', severity: 'warning', message: 'EC2 spend up 18% vs last week in eu-west-1', time: '2h ago' })
  if (providerTotals.has('gcp'))   alerts.push({ id: 'al-gcp', severity: 'info',    message: 'BigQuery: 3 jobs scanned >500GB — consider partitioning', time: '6h ago' })
  if (providerTotals.has('azure')) alerts.push({ id: 'al-az',  severity: 'warning', message: 'Azure Data Factory budget 78% consumed with 9 days left', time: '1d ago' })
  if (providerTotals.has('oci'))   alerts.push({ id: 'al-oci', severity: 'info',    message: 'OCI Autonomous DB CPU spike detected — auto-scale triggered', time: '4h ago' })

  const wasteItems = await simulatedWaste(accts)
  return {
    totalMtd,
    projectedEom,
    savingsFound,
    savingsApplied,
    accountCount:  accts.length,
    wasteCount:    wasteItems.length,
    dailyTrend:    daily,
    topServices,
    byProvider,
    alerts,
  }
}

// ── Recommendations ───────────────────────────────────────────────────────────
export async function simulatedRecommendations(
  accounts: { id: string; name: string; provider: CloudProvider }[],
  accountId?: string
): Promise<Recommendation[]> {
  const accts = accounts.length ? accounts : DEFAULT_ACCOUNTS
  const filtered = accountId ? accts.filter(a => a.id === accountId) : accts

  const results = await Promise.all(filtered.map(async acct => {
    if (acct.provider === 'oci') {
      const live = liveOciAccount(acct.id)
      if (live) {
        try { return await ociRecommendationsLive(live) }
        catch (e) { console.error('[OCI live] recommendations failed:', e) }
      }
    }
    switch (acct.provider) {
      case 'aws':   return awsRecommendations(acct.id, acct.name)
      case 'gcp':   return gcpRecommendations(acct.id, acct.name)
      case 'azure': return azureRecommendations(acct.id, acct.name)
      case 'oci':   return ociRecommendations(acct.id, acct.name)
    }
  }))
  return results.flat().filter(Boolean) as Recommendation[]
}

// ── Waste ─────────────────────────────────────────────────────────────────────
export async function simulatedWaste(
  accounts: { id: string; name: string; provider: CloudProvider }[],
  provider?: CloudProvider
): Promise<WasteItem[]> {
  const accts = accounts.length ? accounts : DEFAULT_ACCOUNTS
  const filtered = provider ? accts.filter(a => a.provider === provider) : accts

  const results = await Promise.all(filtered.map(async acct => {
    if (acct.provider === 'oci') {
      const live = liveOciAccount(acct.id)
      if (live) {
        try { return await ociWasteLive(live) }
        catch (e) { console.error('[OCI live] waste failed:', e) }
      }
    }
    switch (acct.provider) {
      case 'aws':   return awsWaste(acct.id, acct.name)
      case 'gcp':   return gcpWaste(acct.id, acct.name)
      case 'azure': return azureWaste(acct.id, acct.name)
      case 'oci':   return ociWaste(acct.id, acct.name)
    }
  }))
  return results.flat().filter(Boolean) as WasteItem[]
}

// ── Allocation ────────────────────────────────────────────────────────────────
export async function simulatedAllocation(
  accounts: { id: string; name: string; provider: CloudProvider }[]
): Promise<AllocationRow[]> {
  const accts = accounts.length ? accounts : DEFAULT_ACCOUNTS
  // Merge allocation rows across accounts — combine same team names
  const mergeMap = new Map<string, AllocationRow>()
  for (const acct of accts) {
    let rows: AllocationRow[]
    if (acct.provider === 'oci') {
      const live = liveOciAccount(acct.id)
      if (live) {
        try { rows = await ociAllocationLive(live) } catch (e) { console.error('[OCI live] allocation failed:', e); rows = ociAllocation(acct.id) }
      } else { rows = ociAllocation(acct.id) }
    } else {
      switch (acct.provider) {
        case 'aws':   rows = awsAllocation(acct.id);   break
        case 'gcp':   rows = gcpAllocation(acct.id);   break
        case 'azure': rows = azureAllocation(acct.id); break
      }
    }
    for (const row of rows) {
      const existing = mergeMap.get(row.team)
      if (existing) {
        existing.amountUsd     += row.amountUsd
        existing.prevAmountUsd += row.prevAmountUsd
        existing.services = existing.services.map((s, i) => ({
          ...s, amountUsd: s.amountUsd + (row.services[i]?.amountUsd ?? 0),
        }))
      } else {
        mergeMap.set(row.team, { ...row })
      }
    }
  }
  const rows = Array.from(mergeMap.values())
  const total = rows.reduce((s, r) => s + r.amountUsd, 0)
  return rows
    .map(r => ({
      ...r,
      pct:   total > 0 ? parseFloat(((r.amountUsd / total) * 100).toFixed(1)) : 0,
      trend: r.prevAmountUsd > 0 ? parseFloat((((r.amountUsd - r.prevAmountUsd) / r.prevAmountUsd) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.amountUsd - a.amountUsd)
}

// ── Explorer ──────────────────────────────────────────────────────────────────
export async function simulatedExplorer(
  accounts: { id: string; name: string; provider: CloudProvider }[],
  groupBy: string
): Promise<{ label: string; amountUsd: number; prev: number; region?: string; provider?: string }[]> {
  const accts = accounts.length ? accounts : DEFAULT_ACCOUNTS
  const allServicesArrays = await Promise.all(accts.map(a => serviceCosts(a)))
  const allServices = allServicesArrays.flat()

  if (groupBy === 'service') {
    const map = new Map<string, { amountUsd: number; provider: string }>()
    for (const s of allServices) {
      const e = map.get(s.service)
      if (e) e.amountUsd += s.amountUsd
      else map.set(s.service, { amountUsd: s.amountUsd, provider: s.provider })
    }
    const rng = createRng(hashSeed('explorer:service:prev'))
    return Array.from(map.entries())
      .map(([label, { amountUsd, provider }]) => ({
        label, amountUsd: parseFloat(amountUsd.toFixed(2)),
        prev: parseFloat((amountUsd * seededRand(rng, 0.78, 1.15)).toFixed(2)),
        provider,
      }))
      .sort((a, b) => b.amountUsd - a.amountUsd)
      .slice(0, 15)
  }

  if (groupBy === 'provider') {
    const map = new Map<string, number>()
    for (const s of allServices) {
      map.set(s.provider, (map.get(s.provider) ?? 0) + s.amountUsd)
    }
    const rng = createRng(hashSeed('explorer:provider:prev'))
    return Array.from(map.entries()).map(([label, amountUsd]) => ({
      label: label.toUpperCase(), amountUsd: parseFloat(amountUsd.toFixed(2)),
      prev: parseFloat((amountUsd * seededRand(rng, 0.78, 1.15)).toFixed(2)),
      provider: label,
    }))
  }

  if (groupBy === 'region') {
    const map = new Map<string, number>()
    for (const s of allServices) {
      map.set(s.region, (map.get(s.region) ?? 0) + s.amountUsd)
    }
    const rng = createRng(hashSeed('explorer:region:prev'))
    return Array.from(map.entries())
      .map(([label, amountUsd]) => ({
        label, amountUsd: parseFloat(amountUsd.toFixed(2)),
        prev: parseFloat((amountUsd * seededRand(rng, 0.78, 1.15)).toFixed(2)),
        region: label,
      }))
      .sort((a, b) => b.amountUsd - a.amountUsd)
  }

  if (groupBy === 'account') {
    const rng = createRng(hashSeed('explorer:account:prev'))
    const amounts = await Promise.all(accts.map(acct => monthlyCost(acct)))
    return accts.map((acct, i) => ({
      label: acct.name,
      amountUsd: parseFloat(amounts[i].toFixed(2)),
      prev: parseFloat((amounts[i] * seededRand(rng, 0.78, 1.15)).toFixed(2)),
      provider: acct.provider,
    })).sort((a, b) => b.amountUsd - a.amountUsd)
  }

  return []
}

// ── Anomaly Detection ─────────────────────────────────────────────────────────
// AnomalyEvent type lives in lib/mock-data.ts (shared with oci-live.ts)
export type { AnomalyEvent } from '@/lib/mock-data'

export async function simulatedAnomalies(
  accounts: { id: string; name: string; provider: CloudProvider }[]
): Promise<AnomalyEvent[]> {
  const accts = accounts.length ? accounts : DEFAULT_ACCOUNTS

  // Separate OCI accounts with live credentials
  const liveOciResults = await Promise.all(
    accts
      .filter(a => a.provider === 'oci')
      .map(async acct => {
        const live = liveOciAccount(acct.id)
        if (!live) return null
        try { return await ociAnomaliesLive(live, acct.name) } catch (e) { console.error('[OCI live] anomalies failed:', e); return null }
      })
  )
  const liveEvents: AnomalyEvent[] = liveOciResults.filter(Boolean).flat() as AnomalyEvent[]

  // Simulated events for non-OCI accounts (or OCI without credentials)
  const simulatedAccts = accts.filter(a => {
    if (a.provider !== 'oci') return true
    return !liveOciAccount(a.id)  // only simulate OCI if no live creds
  })

  const simEvents: AnomalyEvent[] = []
  const ANOMALY_TEMPLATES: Record<CloudProvider, { service: string; region: string; description: string }[]> = {
    aws: [
      { service: 'EC2', region: 'eu-west-1', description: 'Unexpected instance type change caused spend spike' },
      { service: 'Data Transfer', region: 'us-east-1', description: 'Cross-region data transfer increased sharply' },
      { service: 'RDS', region: 'us-west-2', description: 'Multi-AZ failover triggered higher I/O billing' },
    ],
    gcp: [
      { service: 'BigQuery', region: 'us-central1', description: 'Unpartitioned query scanned full table (500GB+)' },
      { service: 'Compute Engine', region: 'europe-west1', description: 'Autoscaler added 12 extra VMs during traffic event' },
    ],
    azure: [
      { service: 'Virtual Machines', region: 'westeurope', description: 'Dev VMs left running over weekend' },
      { service: 'Azure SQL', region: 'eastus', description: 'DTU burst exceeded reserved capacity' },
    ],
    oci: [
      { service: 'Compute VM', region: 'eu-frankfurt-1', description: 'Flex shape OCPU scaled up due to CPU pressure' },
      { service: 'Object Storage', region: 'uk-london-1', description: 'Egress spike — large backup restore operation' },
    ],
  }
  const today = new Date()
  simulatedAccts.forEach((acct, ai) => {
    const templates = ANOMALY_TEMPLATES[acct.provider]
    const rng = createRng(hashSeed(`anomaly:${acct.id}`))
    templates.forEach((tpl, ti) => {
      const daysAgo = (ai * 3 + ti * 7 + 2) % 14
      const date = new Date(today)
      date.setDate(date.getDate() - daysAgo)
      const dateStr = date.toISOString().split('T')[0]
      const baseline = seededRand(rng, 80, 400, 2)
      const spikeMultiplier = seededRand(rng, 1.35, 2.8, 2)
      const actual = parseFloat((baseline * spikeMultiplier).toFixed(2))
      const spikePercent = parseFloat(((spikeMultiplier - 1) * 100).toFixed(1))
      const severity: AnomalyEvent['severity'] =
        spikePercent >= 120 ? 'high' : spikePercent >= 60 ? 'medium' : 'low'
      simEvents.push({
        id: `anom-${acct.id}-${ti}`, date: dateStr,
        service: tpl.service, provider: acct.provider,
        accountName: acct.name, accountId: acct.id, region: tpl.region,
        baseline: parseFloat(baseline.toFixed(2)), actual, spikePercent, severity,
        status: daysAgo > 7 ? 'acknowledged' : 'open', description: tpl.description,
      })
    })
  })

  return [...liveEvents, ...simEvents].sort((a, b) => b.date.localeCompare(a.date))
}

// ── Forecasting ───────────────────────────────────────────────────────────────
export interface ForecastPoint { date: string; actual: number | null; forecast: number; lower: number; upper: number }
export interface ForecastData {
  accountId?: string
  horizon: number
  points: ForecastPoint[]
  totalForecast30: number
  totalForecast90: number
  mtdActual: number
  projectedEom: number
  growthRate: number  // % month-over-month
}

export async function simulatedForecast(
  accounts: { id: string; name: string; provider: CloudProvider }[],
  horizon = 90
): Promise<ForecastData> {
  const accts = accounts.length ? accounts : DEFAULT_ACCOUNTS

  // Aggregate daily trend (last 90 days actual)
  const trendMap = new Map<string, number>()
  const trendResults = await Promise.all(accts.map(acct => dailyTrend(acct)))
  for (const pts of trendResults) {
    for (const pt of pts) {
      trendMap.set(pt.date, (trendMap.get(pt.date) ?? 0) + pt.amountUsd)
    }
  }
  const historical = Array.from(trendMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, amountUsd]) => ({ date, amountUsd: parseFloat(amountUsd.toFixed(2)) }))

  // Compute linear trend from last 30 days
  const last30 = historical.slice(-30)
  const avgLast30 = last30.reduce((s, p) => s + p.amountUsd, 0) / (last30.length || 1)
  const avgPrev30 = historical.slice(-60, -30).reduce((s, p) => s + p.amountUsd, 0) / 30
  const dailyGrowth = avgPrev30 > 0 ? (avgLast30 - avgPrev30) / avgPrev30 / 30 : 0.001

  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const rng = createRng(hashSeed('forecast:noise'))

  const points: ForecastPoint[] = [
    // historical actuals
    ...historical.map(p => ({
      date: p.date,
      actual: p.amountUsd,
      forecast: p.amountUsd,
      lower: parseFloat((p.amountUsd * 0.92).toFixed(2)),
      upper: parseFloat((p.amountUsd * 1.08).toFixed(2)),
    })),
  ]

  // Project forward
  for (let d = 1; d <= horizon; d++) {
    const fd = new Date(today)
    fd.setDate(fd.getDate() + d)
    const dateStr = fd.toISOString().split('T')[0]
    const base = avgLast30 * (1 + dailyGrowth * d)
    const noise = seededRand(rng, 0.94, 1.06)
    const forecast = parseFloat((base * noise).toFixed(2))
    const ci = 0.08 + d * 0.003  // widening confidence interval
    points.push({
      date: dateStr,
      actual: null,
      forecast,
      lower: parseFloat((forecast * (1 - ci)).toFixed(2)),
      upper: parseFloat((forecast * (1 + ci)).toFixed(2)),
    })
  }

  const todayIdx = points.findIndex(p => p.date === todayStr)
  const dayOfMonth = today.getDate()
  const mtdActual = points.slice(Math.max(0, todayIdx - dayOfMonth + 1), todayIdx + 1)
    .reduce((s, p) => s + (p.actual ?? p.forecast), 0)
  const projectedEom = parseFloat(((mtdActual / dayOfMonth) * 30).toFixed(2))
  const totalForecast30 = parseFloat(points.filter(p => p.actual === null).slice(0, 30).reduce((s, p) => s + p.forecast, 0).toFixed(2))
  const totalForecast90 = parseFloat(points.filter(p => p.actual === null).slice(0, 90).reduce((s, p) => s + p.forecast, 0).toFixed(2))
  const growthRate = avgPrev30 > 0 ? parseFloat((((avgLast30 - avgPrev30) / avgPrev30) * 100).toFixed(1)) : 0

  return { horizon, points, totalForecast30, totalForecast90, mtdActual: parseFloat(mtdActual.toFixed(2)), projectedEom, growthRate }
}

// ── RI / Savings Plan Coverage ────────────────────────────────────────────────
// RiCoverageItem type lives in lib/mock-data.ts
export type { RiCoverageItem } from '@/lib/mock-data'

export async function simulatedRiCoverage(
  accounts: { id: string; name: string; provider: CloudProvider }[]
): Promise<RiCoverageItem[]> {
  const accts = accounts.length ? accounts : DEFAULT_ACCOUNTS
  const today = new Date()
  const allItems: RiCoverageItem[] = []

  for (const acct of accts) {
    // OCI: try live credits API first
    if (acct.provider === 'oci') {
      const live = liveOciAccount(acct.id)
      if (live) {
        try {
          const liveItems = await ociCommitmentsLive(live)
          allItems.push(...liveItems)
          continue
        } catch (e) { console.error('[OCI live] commitments failed:', e) }
      }
    }

    // Simulation for all other providers (and OCI fallback)
    const rng = createRng(hashSeed(`ri:${acct.id}`))
    const TEMPLATES: Record<CloudProvider, { commitmentType: string; service: string; region: string; term: '1yr' | '3yr'; payment: RiCoverageItem['paymentOption'] }[]> = {
      aws: [
        { commitmentType: 'EC2 Reserved Instance', service: 'EC2', region: 'eu-west-1', term: '1yr', payment: 'Partial Upfront' },
        { commitmentType: 'Compute Savings Plan', service: 'EC2/Fargate/Lambda', region: 'Global', term: '1yr', payment: 'No Upfront' },
        { commitmentType: 'RDS Reserved Instance', service: 'RDS', region: 'us-east-1', term: '3yr', payment: 'All Upfront' },
      ],
      gcp: [
        { commitmentType: 'Committed Use Discount', service: 'Compute Engine', region: 'us-central1', term: '1yr', payment: 'No Upfront' },
        { commitmentType: 'Committed Use Discount', service: 'Cloud SQL', region: 'europe-west1', term: '3yr', payment: 'No Upfront' },
      ],
      azure: [
        { commitmentType: 'Reserved VM Instance', service: 'Virtual Machines', region: 'westeurope', term: '1yr', payment: 'All Upfront' },
        { commitmentType: 'Azure Savings Plan', service: 'Compute', region: 'Global', term: '3yr', payment: 'No Upfront' },
      ],
      oci: [
        { commitmentType: 'Universal Credits', service: 'Compute VM', region: 'ap-mumbai-1', term: '1yr', payment: 'All Upfront' },
      ],
    }
    TEMPLATES[acct.provider].forEach((tpl, ti) => {
      const hourlyCost = seededRand(rng, 0.08, 1.20, 4)
      const totalHours = 720
      const unusedFraction = seededRand(rng, 0.02, 0.30, 3)
      const unusedHours = parseFloat((totalHours * unusedFraction).toFixed(1))
      const coveragePct = parseFloat((seededRand(rng, 45, 95, 1)).toFixed(1))
      const monthlyCost = parseFloat((hourlyCost * totalHours).toFixed(2))
      const wastedMonthly = parseFloat((hourlyCost * unusedHours).toFixed(2))
      const monthsOut = (accts.indexOf(acct) * 4 + ti * 7 + 2) % 24
      const expiry = new Date(today)
      expiry.setMonth(expiry.getMonth() + monthsOut)
      const expiresAt = expiry.toISOString().split('T')[0]
      const status: RiCoverageItem['status'] =
        monthsOut === 0 ? 'expired' : monthsOut <= 2 ? 'expiring_soon' : 'active'
      allItems.push({
        id: `ri-${acct.id}-${ti}`, provider: acct.provider,
        accountName: acct.name, accountId: acct.id,
        commitmentType: tpl.commitmentType, service: tpl.service, region: tpl.region,
        term: tpl.term, paymentOption: tpl.payment,
        hourlyCost, unusedHours, totalHours, coveragePct, monthlyCost, wastedMonthly,
        expiresAt, status,
      })
    })
  }

  return allItems.sort((a, b) => b.wastedMonthly - a.wastedMonthly)
}
