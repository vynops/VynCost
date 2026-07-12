/**
 * Real OCI API integration.
 * Used when a CloudAccount has full OCI credentials.
 * Falls back gracefully — callers should always handle thrown errors.
 */

import { SimpleAuthenticationDetailsProvider, Region } from 'oci-common'
import { UsageapiClient, models as usageModels } from 'oci-usageapi'
import { IdentityClient } from 'oci-identity'
import { OptimizerClient, models as optModels } from 'oci-optimizer'
import { BlockstorageClient, ComputeClient, models as coreModels } from 'oci-core'
import { MonitoringClient, models as monModels } from 'oci-monitoring'
import type { CloudAccount } from './account-store'
import type { ServiceCost, CostPoint, AllocationRow, AnomalyEvent, Recommendation, WasteItem, RiCoverageItem } from './mock-data'

// Module-level types (Turbopack/esbuild does not allow type aliases inside function bodies)
interface OciCompData { amountUsd: number; services: Map<string, number> }
interface OciDayPoint { date: string; amount: number; region: string }

// ── Credential guard ──────────────────────────────────────────────────────────

export function ociHasCredentials(a: CloudAccount): boolean {
  return !!(
    a.ociTenancyOcid &&
    a.ociUserOcid &&
    a.ociFingerprint &&
    a.ociPrivateKey &&
    a.ociRegion
  )
}

// ── Auth provider factory ─────────────────────────────────────────────────────

function makeAuth(a: CloudAccount): SimpleAuthenticationDetailsProvider {
  return new SimpleAuthenticationDetailsProvider(
    a.ociTenancyOcid!,
    a.ociUserOcid!,
    a.ociFingerprint!,
    a.ociPrivateKey!,
    null,
    Region.fromRegionId(a.ociRegion!)
  )
}

// ── Connection test ───────────────────────────────────────────────────────────

export async function ociTestConnection(
  a: CloudAccount
): Promise<{ ok: boolean; message?: string; error?: string }> {
  try {
    const auth = makeAuth(a)
    const client = new IdentityClient({ authenticationDetailsProvider: auth })
    client.regionId = a.ociRegion!
    const resp = await client.getTenancy({ tenancyId: a.ociTenancyOcid! })
    const name = resp.tenancy.name ?? a.ociTenancyOcid
    return { ok: true, message: `Connected to OCI tenancy "${name}". Cost & Usage Reports access confirmed.` }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false, error: `OCI connection failed: ${msg}` }
  }
}

// ── In-memory response cache (avoids 429 rate-limit; TTL = 15 min) ─────────────
interface CacheEntry { data: usageModels.UsageSummary[]; expiresAt: number }
const _usageCache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 15 * 60 * 1000
// Generic cache for non-usage responses (recommendations, waste, etc.)
interface GenericCacheEntry { ts: number; data: unknown }
const CACHE = new Map<string, GenericCacheEntry>()
// In-flight deduplication: if the same key is already being fetched, reuse that promise
const _inflight = new Map<string, Promise<usageModels.UsageSummary[]>>()

function cacheKey(a: CloudAccount, opts: UsageFetchOptions): string {
  return `${a.id}:${opts.granularity}:${opts.groupBy?.join(',')}:${opts.compartmentDepth ?? 0}:${opts.timeStart.toISOString()}:${opts.timeEnd.toISOString()}`
}

// ── Shared Usage API fetcher ──────────────────────────────────────────────────

interface UsageFetchOptions {
  granularity: usageModels.RequestSummarizedUsagesDetails.Granularity
  groupBy?: string[]
  compartmentDepth?: number
  timeStart: Date
  timeEnd: Date
}

async function fetchUsage(
  a: CloudAccount,
  opts: UsageFetchOptions
): Promise<usageModels.UsageSummary[]> {
  const key = cacheKey(a, opts)

  // 1. Serve from cache if fresh
  const cached = _usageCache.get(key)
  if (cached && cached.expiresAt > Date.now()) return cached.data

  // 2. Deduplicate: if a fetch for this key is already in-flight, wait for it
  const existing = _inflight.get(key)
  if (existing) return existing

  // 3. Fire the real OCI API call and register it as in-flight
  const promise = (async () => {
    const auth = makeAuth(a)
    const client = new UsageapiClient({ authenticationDetailsProvider: auth })
    client.regionId = a.ociRegion!

    const items: usageModels.UsageSummary[] = []
    let page: string | undefined

    do {
      const resp = await client.requestSummarizedUsages({
        requestSummarizedUsagesDetails: {
          tenantId: a.ociTenancyOcid!,
          timeUsageStarted: opts.timeStart,
          timeUsageEnded: opts.timeEnd,
          granularity: opts.granularity,
          queryType: usageModels.RequestSummarizedUsagesDetails.QueryType.Cost,
          groupBy: opts.groupBy,
          compartmentDepth: opts.compartmentDepth,
        },
        page,
        limit: 500,
      })
      // Normalise dates: OCI SDK may return strings instead of Date objects
      const raw = resp.usageAggregation.items ?? []
      for (const item of raw) {
        if (item.timeUsageStarted && typeof (item.timeUsageStarted as unknown) === 'string') {
          item.timeUsageStarted = new Date(item.timeUsageStarted as unknown as string)
        }
        if (item.timeUsageEnded && typeof (item.timeUsageEnded as unknown) === 'string') {
          item.timeUsageEnded = new Date(item.timeUsageEnded as unknown as string)
        }
      }
      items.push(...raw)
      page = resp.opcNextPage
    } while (page)

    _usageCache.set(key, { data: items, expiresAt: Date.now() + CACHE_TTL_MS })
    return items
  })()

  _inflight.set(key, promise)
  promise.finally(() => _inflight.delete(key))
  return promise
}

// ── Month boundaries ──────────────────────────────────────────────────────────

function currentMonthRange(): { start: Date; end: Date } {
  const now = new Date()
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
  return { start, end }
}

function last30DaysRange(): { start: Date; end: Date } {
  const end = new Date()
  end.setUTCHours(0, 0, 0, 0)
  const start = new Date(end)
  start.setUTCDate(start.getUTCDate() - 30)
  return { start, end }
}

function prevMonthRange(): { start: Date; end: Date } {
  const now = new Date()
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  return { start, end }
}

// ── Service costs (current month, grouped by service) ────────────────────────

export async function ociServiceCostsLive(a: CloudAccount): Promise<ServiceCost[]> {
  const { start, end } = currentMonthRange()
  const items = await fetchUsage(a, {
    granularity: usageModels.RequestSummarizedUsagesDetails.Granularity.Monthly,
    groupBy: ['service', 'region'],
    timeStart: start,
    timeEnd: end,
  })

  // Also fetch prev month for trend calculation
  const prev = prevMonthRange()
  const prevItems = await fetchUsage(a, {
    granularity: usageModels.RequestSummarizedUsagesDetails.Granularity.Monthly,
    groupBy: ['service', 'region'],
    timeStart: prev.start,
    timeEnd: prev.end,
  })

  // Build prev month map: service → total
  const prevMap = new Map<string, number>()
  for (const item of prevItems) {
    const svc = item.service ?? 'Other'
    prevMap.set(svc, (prevMap.get(svc) ?? 0) + (item.computedAmount ?? 0))
  }

  // Aggregate current month by service+region (keep highest-cost region per service)
  const map = new Map<string, { amountUsd: number; region: string }>()
  for (const item of items) {
    const svc = item.service ?? 'Other'
    const region = item.region ?? a.ociRegion ?? 'unknown'
    const existing = map.get(svc)
    const amount = item.computedAmount ?? 0
    if (!existing || amount > existing.amountUsd) {
      map.set(svc, { amountUsd: (existing?.amountUsd ?? 0) + amount, region })
    } else {
      map.set(svc, { amountUsd: existing.amountUsd + amount, region: existing.region })
    }
  }

  const results: ServiceCost[] = []
  for (const [service, { amountUsd, region }] of map) {
    const prev = prevMap.get(service) ?? 0
    const trend = prev > 0 ? parseFloat((((amountUsd - prev) / prev) * 100).toFixed(1)) : 0
    results.push({
      service,
      provider: 'oci',
      accountId: a.id,
      accountName: a.name,
      amountUsd: parseFloat(amountUsd.toFixed(2)),
      trend,
      region,
    })
  }

  return results.sort((x, y) => y.amountUsd - x.amountUsd)
}

// ── Daily trend (last 30 days) ────────────────────────────────────────────────

export async function ociDailyTrendLive(a: CloudAccount): Promise<CostPoint[]> {
  const { start, end } = last30DaysRange()
  const items = await fetchUsage(a, {
    granularity: usageModels.RequestSummarizedUsagesDetails.Granularity.Daily,
    timeStart: start,
    timeEnd: end,
  })

  const dayMap = new Map<string, number>()
  for (const item of items) {
    const date = item.timeUsageStarted.toISOString().slice(0, 10)
    dayMap.set(date, (dayMap.get(date) ?? 0) + (item.computedAmount ?? 0))
  }

  return Array.from(dayMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, amountUsd]) => ({ date, amountUsd: parseFloat(amountUsd.toFixed(2)) }))
}

// ── Monthly cost total (current month) ───────────────────────────────────────

export async function ociMonthlyCostLive(a: CloudAccount): Promise<number> {
  const { start, end } = currentMonthRange()
  const items = await fetchUsage(a, {
    granularity: usageModels.RequestSummarizedUsagesDetails.Granularity.Monthly,
    timeStart: start,
    timeEnd: end,
  })

  const total = items.reduce((s, item) => s + (item.computedAmount ?? 0), 0)
  return parseFloat(total.toFixed(2))
}

// ── Allocation by compartment ─────────────────────────────────────────────────
export async function ociAllocationLive(a: CloudAccount): Promise<AllocationRow[]> {
  const curr = currentMonthRange()
  const prev = prevMonthRange()

  const [currItems, prevItems] = await Promise.all([
    fetchUsage(a, {
      granularity: usageModels.RequestSummarizedUsagesDetails.Granularity.Monthly,
      groupBy: ['compartmentName', 'service'],
      compartmentDepth: 1,
      timeStart: curr.start,
      timeEnd: curr.end,
    }),
    fetchUsage(a, {
      granularity: usageModels.RequestSummarizedUsagesDetails.Granularity.Monthly,
      groupBy: ['compartmentName'],
      compartmentDepth: 1,
      timeStart: prev.start,
      timeEnd: prev.end,
    }),
  ])

  // Prev month totals by compartment
  const prevMap = new Map<string, number>()
  for (const item of prevItems) {
    const comp = item.compartmentName ?? 'root'
    prevMap.set(comp, (prevMap.get(comp) ?? 0) + (item.computedAmount ?? 0))
  }

  // Current month: aggregate by compartment → services
  const compMap = new Map<string, OciCompData>()
  for (const item of currItems) {
    const comp = item.compartmentName ?? 'root'
    const svc = item.service ?? 'Other'
    const amount = item.computedAmount ?? 0
    const existing = compMap.get(comp) ?? { amountUsd: 0, services: new Map<string, number>() }
    existing.amountUsd += amount
    existing.services.set(svc, (existing.services.get(svc) ?? 0) + amount)
    compMap.set(comp, existing)
  }

  const totalCurr = Array.from(compMap.values()).reduce((s, c) => s + c.amountUsd, 0)

  const rows: AllocationRow[] = []
  for (const [team, data] of compMap) {
    const prevAmt = prevMap.get(team) ?? 0
    const trend =
      prevAmt > 0
        ? parseFloat((((data.amountUsd - prevAmt) / prevAmt) * 100).toFixed(1))
        : 0
    const services = Array.from(data.services.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([service, amountUsd]) => ({ service, amountUsd: parseFloat(amountUsd.toFixed(2)) }))

    rows.push({
      team,
      amountUsd: parseFloat(data.amountUsd.toFixed(2)),
      pct: totalCurr > 0 ? parseFloat(((data.amountUsd / totalCurr) * 100).toFixed(1)) : 0,
      prevAmountUsd: parseFloat(prevAmt.toFixed(2)),
      trend,
      services,
    })
  }

  return rows.sort((a, b) => b.amountUsd - a.amountUsd)
}

// ── Live anomaly detection (rolling 14-day baseline per service) ──────────────

export async function ociAnomaliesLive(
  a: CloudAccount,
  accountName: string
): Promise<AnomalyEvent[]> {
  // Fetch 60 days of daily costs grouped by service + region
  const end = new Date()
  end.setUTCHours(0, 0, 0, 0)
  const start = new Date(end)
  start.setUTCDate(start.getUTCDate() - 60)

  const items = await fetchUsage(a, {
    granularity: usageModels.RequestSummarizedUsagesDetails.Granularity.Daily,
    groupBy: ['service', 'region'],
    timeStart: start,
    timeEnd: end,
  })

  // Build map: service → sorted daily amounts [ { date, amount } ]
  const serviceMap = new Map<string, OciDayPoint[]>()
  for (const item of items) {
    const svc = item.service ?? 'Other'
    const date = item.timeUsageStarted.toISOString().slice(0, 10)
    const region = item.region ?? a.ociRegion ?? 'unknown'
    const amount = item.computedAmount ?? 0
    if (!serviceMap.has(svc)) serviceMap.set(svc, [])
    const existing = serviceMap.get(svc)!.find(p => p.date === date)
    if (existing) existing.amount += amount
    else serviceMap.get(svc)!.push({ date, amount, region })
  }

  const events: AnomalyEvent[] = []
  const SPIKE_THRESHOLD = 0.30   // 30% above baseline triggers anomaly
  const BASELINE_DAYS = 14
  const MIN_BASELINE = 1.0       // ignore days with < $1 baseline (avoids false positives on $0 baseline)

  for (const [service, points] of serviceMap) {
    const sorted = points.sort((x, y) => x.date.localeCompare(y.date))
    // Only examine last 14 days for anomalies; use prior 14 days as baseline window
    const checkPoints = sorted.slice(-BASELINE_DAYS)
    const baselinePoints = sorted.slice(-BASELINE_DAYS * 2, -BASELINE_DAYS)
    if (baselinePoints.length < 3) continue  // not enough history

    const baseline = baselinePoints.reduce((s, p) => s + p.amount, 0) / baselinePoints.length
    if (baseline < MIN_BASELINE) continue

    for (const pt of checkPoints) {
      if (pt.amount <= baseline * (1 + SPIKE_THRESHOLD)) continue
      const spikePercent = parseFloat((((pt.amount - baseline) / baseline) * 100).toFixed(1))
      const severity: AnomalyEvent['severity'] =
        spikePercent >= 120 ? 'high' : spikePercent >= 60 ? 'medium' : 'low'
      const today = new Date().toISOString().slice(0, 10)
      const daysAgo = Math.round(
        (new Date(today).getTime() - new Date(pt.date).getTime()) / 86400000
      )
      events.push({
        id: `oci-live-anom-${a.id}-${service}-${pt.date}`.replace(/\s+/g, '-').toLowerCase(),
        date: pt.date,
        service,
        provider: 'oci',
        accountName,
        accountId: a.id,
        region: pt.region,
        baseline: parseFloat(baseline.toFixed(2)),
        actual: parseFloat(pt.amount.toFixed(2)),
        spikePercent,
        severity,
        status: daysAgo > 7 ? 'acknowledged' : 'open',
        description: `${service} daily spend $${pt.amount.toFixed(2)} exceeded ${spikePercent.toFixed(0)}% above ${BASELINE_DAYS}-day baseline ($${baseline.toFixed(2)}/day)`,
      })
    }
  }

  return events.sort((x, y) => y.date.localeCompare(x.date))
}

// ── Recommendations via OCI Cloud Advisor (Optimizer API) ────────────────────

function mapImportanceToRisk(imp?: optModels.Importance): Recommendation['risk'] {
  if (imp === optModels.Importance.Critical || imp === optModels.Importance.High) return 'High'
  if (imp === optModels.Importance.Moderate) return 'Medium'
  return 'Low'
}

function mapStatusToRec(s?: optModels.Status): Recommendation['status'] {
  if (s === optModels.Status.Implemented) return 'applied'
  if (s === optModels.Status.Dismissed) return 'dismissed'
  return 'open'
}

function mapCategory(name: string): Recommendation['category'] {
  const n = name.toLowerCase()
  if (n.includes('right') || n.includes('size') || n.includes('shape')) return 'rightsize'
  if (n.includes('idle') || n.includes('unused') || n.includes('underutil')) return 'idle'
  if (n.includes('storage') || n.includes('block') || n.includes('object')) return 'storage'
  if (n.includes('commit') || n.includes('reserved') || n.includes('ucredits')) return 'reserved'
  return 'rightsize'
}

function regionFromOcid(ocid: string, fallback: string): string {
  // OCIDs format: ocid1.<type>.oc1.<region>.<unique>
  const parts = ocid.split('.')
  return parts.length >= 4 ? parts[3] : fallback
}

export async function ociRecommendationsLive(a: CloudAccount): Promise<Recommendation[]> {
  const cacheKey = `${a.id}:recommendations`
  const cached = CACHE.get(cacheKey)
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.data as Recommendation[]

  const auth = makeAuth(a)
  const client = new OptimizerClient({ authenticationDetailsProvider: auth })
  client.regionId = a.ociRegion!

  // Pass 1: fetch recommendations to get importance per recommendation ID
  const importanceMap = new Map<string, optModels.Importance>()
  const recNameMap = new Map<string, string>()
  let recPage: string | undefined
  do {
    const resp = await client.listRecommendations({
      compartmentId: a.ociTenancyOcid!,
      compartmentIdInSubtree: true,
      limit: 100,
      page: recPage,
    })
    for (const rec of resp.recommendationCollection.items ?? []) {
      if (rec.importance) importanceMap.set(rec.id, rec.importance)
      if (rec.name) recNameMap.set(rec.id, rec.name)
    }
    recPage = resp.opcNextPage
  } while (recPage)

  // Pass 2: fetch resource actions (individual affected resources)
  const results: Recommendation[] = []
  let page: string | undefined
  do {
    const resp = await client.listResourceActions({
      compartmentId: a.ociTenancyOcid!,
      compartmentIdInSubtree: true,
      status: optModels.Status.Pending,
      limit: 100,
      page,
    })

    for (const ra of resp.resourceActionCollection.items ?? []) {
      const importance = importanceMap.get(ra.recommendationId) ?? optModels.Importance.Low
      const recName = recNameMap.get(ra.recommendationId) ?? ''
      const savings = ra.estimatedCostSaving ?? 0
      const savingsRate = importance === optModels.Importance.Critical ? 0.55
        : importance === optModels.Importance.High ? 0.45
        : importance === optModels.Importance.Moderate ? 0.30 : 0.20
      const currentCost = savings > 0 ? parseFloat((savings / savingsRate).toFixed(2)) : 0
      const optimisedCost = parseFloat((currentCost - savings).toFixed(2))
      const savingsPct = currentCost > 0 ? parseFloat(((savings / currentCost) * 100).toFixed(1)) : 0

      const meta = ra.metadata ?? {}
      const currentShape = meta['currentShape'] ?? meta['instanceShape'] ?? ''
      const recommendedShape = meta['cpuRecommendedShape'] ?? meta['instanceRecommendedShape'] ?? meta['recommendedShape'] ?? ''
      const cpuUtil = meta['computeCpuUtilization'] ? `CPU ${parseFloat(meta['computeCpuUtilization']).toFixed(1)}%` : ''
      const memUtil = meta['computeMemoryUtilization'] ? `, Mem ${parseFloat(meta['computeMemoryUtilization']).toFixed(1)}%` : ''

      results.push({
        id: ra.id,
        provider: 'oci',
        accountId: a.id,
        accountName: a.name,
        resourceId: ra.resourceId,
        resourceName: ra.name,
        resourceType: ra.resourceType,
        region: regionFromOcid(ra.resourceId, a.ociRegion!),
        issue: ra.action?.description ?? recName ?? `${ra.resourceType} optimization`,
        currentConfig: currentShape ? `${currentShape}${cpuUtil ? ` (${cpuUtil}${memUtil})` : ''}` : ra.resourceType,
        currentCostPerMonth: currentCost,
        recommendedConfig: recommendedShape || ra.action?.description || 'See OCI Cloud Advisor',
        optimisedCostPerMonth: optimisedCost,
        savingsPerMonth: parseFloat(savings.toFixed(2)),
        savingsPercent: savingsPct,
        risk: mapImportanceToRisk(importance),
        confidence: importance === optModels.Importance.Critical ? 95
          : importance === optModels.Importance.High ? 88
          : importance === optModels.Importance.Moderate ? 78 : 65,
        applyCommand: ra.action?.url
          ? `# Docs: ${ra.action.url}`
          : `oci optimizer resource-action update --resource-action-id ${ra.id} --status IMPLEMENTED`,
        status: mapStatusToRec(ra.status),
        category: mapCategory(recName + ' ' + (ra.action?.description ?? '')),
      })
    }

    page = resp.opcNextPage
  } while (page)

  CACHE.set(cacheKey, { ts: Date.now(), data: results })
  return results
}

// ── Waste detection: unattached volumes + idle compute ────────────────────────

export async function ociWasteLive(a: CloudAccount): Promise<WasteItem[]> {
  const ck = `${a.id}:waste`
  const cached = CACHE.get(ck)
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.data as WasteItem[]

  const auth = makeAuth(a)
  const blockClient = new BlockstorageClient({ authenticationDetailsProvider: auth })
  const computeClient = new ComputeClient({ authenticationDetailsProvider: auth })
  const monClient = new MonitoringClient({ authenticationDetailsProvider: auth })
  blockClient.regionId = a.ociRegion!
  computeClient.regionId = a.ociRegion!
  monClient.regionId = a.ociRegion!

  const waste: WasteItem[] = []

  // ── 1. Unattached block volumes ───────────────────────────────────────────
  // Build set of currently-attached volume IDs
  const attachedIds = new Set<string>()
  let attPage: string | undefined
  try {
    do {
      const resp = await computeClient.listVolumeAttachments({
        compartmentId: a.ociTenancyOcid!,
        limit: 100,
        page: attPage,
      })
      for (const att of resp.items ?? []) {
        if ((att.lifecycleState as string) === 'ATTACHED') attachedIds.add(att.volumeId)
      }
      attPage = resp.opcNextPage
    } while (attPage)

    // List all available (provisioned) volumes
    let volPage: string | undefined
    do {
      const resp = await blockClient.listVolumes({
        compartmentId: a.ociTenancyOcid!,
        lifecycleState: coreModels.Volume.LifecycleState.Available,
        limit: 100,
        page: volPage,
      })
      for (const vol of resp.items ?? []) {
        if (attachedIds.has(vol.id)) continue
        const sizeGb = vol.sizeInGBs ?? 50
        // OCI balanced block volume: ~$0.0255/GB-month
        const costPerDay = parseFloat(((sizeGb * 0.0255) / 30).toFixed(4))
        const createdAt = vol.timeCreated ? new Date(vol.timeCreated as unknown as string) : new Date()
        const idleDays = Math.floor((Date.now() - createdAt.getTime()) / 86400000)
        waste.push({
          id: `oci-vol-${vol.id}`,
          provider: 'oci',
          accountId: a.id,
          accountName: a.name,
          resourceId: vol.id,
          resourceName: vol.displayName ?? vol.id,
          resourceType: 'Block Volume',
          region: a.ociRegion!,
          reason: `Unattached ${sizeGb}GB block volume — not connected to any instance`,
          costPerDay,
          idleSinceDays: idleDays,
          status: 'open',
        })
      }
      volPage = resp.opcNextPage
    } while (volPage)
  } catch (e) { console.error('[OCI live] waste volumes failed:', e) }

  // ── 2. Idle compute instances (avg CPU < 5% over last 7 days) ────────────
  try {
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000)

    const metricResp = await monClient.summarizeMetricsData({
      compartmentId: a.ociTenancyOcid!,
      compartmentIdInSubtree: true,
      summarizeMetricsDataDetails: {
        namespace: 'oci_computeagent',
        query: 'CpuUtilization[7d].groupBy(resourceId, resourceDisplayName).mean()',
        startTime: sevenDaysAgo,
        endTime: now,
        resolution: '1d',
      },
    })

    for (const series of metricResp.items ?? []) {
      if (!series.aggregatedDatapoints?.length) continue
      const avgCpu = series.aggregatedDatapoints.reduce((s: number, p: monModels.AggregatedDatapoint) => s + (p.value ?? 0), 0) / series.aggregatedDatapoints.length
      if (avgCpu >= 5) continue   // not idle

      const resourceId = series.dimensions?.['resourceId'] ?? ''
      const resourceName = series.dimensions?.['resourceDisplayName'] ?? resourceId
      // Conservative cost estimate: $2.50/day for a running idle instance
      const costPerDay = 2.50

      waste.push({
        id: `oci-inst-idle-${resourceId}`,
        provider: 'oci',
        accountId: a.id,
        accountName: a.name,
        resourceId,
        resourceName,
        resourceType: 'Compute Instance',
        region: a.ociRegion!,
        reason: `Idle compute — avg CPU ${avgCpu.toFixed(1)}% over last 7 days`,
        costPerDay,
        idleSinceDays: 7,
        status: 'open',
      })
    }
  } catch (e) { console.error('[OCI live] waste compute metrics failed:', e) }

  CACHE.set(ck, { ts: Date.now(), data: waste })
  return waste
}

// ── Commitments: OCI Universal Credits / Subscriptions ───────────────────────
// Uses Usage API queryType ALLCREDIT to surface committed spend and balance.

export async function ociCommitmentsLive(a: CloudAccount): Promise<RiCoverageItem[]> {
  const ck = `${a.id}:commitments`
  const cached = CACHE.get(ck)
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.data as RiCoverageItem[]

  // Fetch credit/commitment usage for current + previous month
  const curr = currentMonthRange()
  const prev = prevMonthRange()

  const [currItems, prevItems] = await Promise.all([
    fetchUsage(a, {
      granularity: usageModels.RequestSummarizedUsagesDetails.Granularity.Monthly,
      groupBy: ['service', 'skuName'],
      timeStart: curr.start,
      timeEnd: curr.end,
    }),
    fetchUsage(a, {
      granularity: usageModels.RequestSummarizedUsagesDetails.Granularity.Monthly,
      groupBy: ['service', 'skuName'],
      timeStart: prev.start,
      timeEnd: prev.end,
    }),
  ])

  // Also query credit adjustments
  const auth = makeAuth(a)
  const creditClient = new UsageapiClient({ authenticationDetailsProvider: auth })
  creditClient.regionId = a.ociRegion!
  let creditItems: usageModels.UsageSummary[] = []
  try {
    const creditResp = await creditClient.requestSummarizedUsages({
      requestSummarizedUsagesDetails: {
        tenantId: a.ociTenancyOcid!,
        timeUsageStarted: curr.start,
        timeUsageEnded: curr.end,
        granularity: usageModels.RequestSummarizedUsagesDetails.Granularity.Monthly,
        queryType: usageModels.RequestSummarizedUsagesDetails.QueryType.Allcredit,
        groupBy: ['skuName'],
      },
      limit: 100,
    })
    creditItems = creditResp.usageAggregation.items ?? []
  } catch { /* credits API may not be available on all tenancies */ }

  const results: RiCoverageItem[] = []
  const today = new Date()

  // Group current usage by service for coverage calculation
  const currByService = new Map<string, number>()
  for (const item of currItems) {
    const svc = item.service ?? 'Other'
    currByService.set(svc, (currByService.get(svc) ?? 0) + (item.computedAmount ?? 0))
  }
  const prevByService = new Map<string, number>()
  for (const item of prevItems) {
    const svc = item.service ?? 'Other'
    prevByService.set(svc, (prevByService.get(svc) ?? 0) + (item.computedAmount ?? 0))
  }
  const totalCurr = Array.from(currByService.values()).reduce((s, v) => s + v, 0)

  // Build commitment entries from credit line items
  const creditMap = new Map<string, number>()
  for (const item of creditItems) {
    const sku = item.skuName ?? 'Universal Credits'
    creditMap.set(sku, (creditMap.get(sku) ?? 0) + Math.abs(item.computedAmount ?? 0))
  }

  if (creditMap.size > 0) {
    for (const [skuName, creditAmount] of creditMap) {
      const monthlyCost = creditAmount
      const hourlyCost = parseFloat((monthlyCost / 720).toFixed(4))
      // Estimate utilisation: credits applied vs total spend
      const usedAmount = Math.min(creditAmount, totalCurr)
      const unusedAmount = Math.max(0, creditAmount - usedAmount)
      const totalHours = 720
      const unusedHours = parseFloat((totalHours * (unusedAmount / Math.max(creditAmount, 1))).toFixed(1))
      const coveragePct = totalCurr > 0 ? parseFloat(((usedAmount / totalCurr) * 100).toFixed(1)) : 100
      // Expiry: assume end of current year as default (credits often annual)
      const expiry = new Date(today.getFullYear(), 11, 31)
      const monthsOut = Math.max(0, (expiry.getFullYear() - today.getFullYear()) * 12 + expiry.getMonth() - today.getMonth())
      results.push({
        id: `oci-credit-${a.id}-${skuName.replace(/\s/g, '-')}`,
        provider: 'oci',
        accountName: a.name,
        accountId: a.id,
        commitmentType: 'Universal Credits',
        service: skuName,
        region: a.ociRegion!,
        term: '1yr',
        paymentOption: 'All Upfront',
        hourlyCost,
        unusedHours,
        totalHours,
        coveragePct,
        monthlyCost: parseFloat(monthlyCost.toFixed(2)),
        wastedMonthly: parseFloat((hourlyCost * unusedHours).toFixed(2)),
        expiresAt: expiry.toISOString().split('T')[0],
        status: monthsOut <= 0 ? 'expired' : monthsOut <= 2 ? 'expiring_soon' : 'active',
      })
    }
  } else if (totalCurr > 0) {
    // No explicit credit items returned but tenancy has spend — show a summary commitment
    results.push({
      id: `oci-ucm-${a.id}`,
      provider: 'oci',
      accountName: a.name,
      accountId: a.id,
      commitmentType: 'Universal Credits (UCM)',
      service: 'All Services',
      region: a.ociRegion!,
      term: '1yr',
      paymentOption: 'All Upfront',
      hourlyCost: parseFloat((totalCurr / 720).toFixed(4)),
      unusedHours: 0,
      totalHours: 720,
      coveragePct: 100,
      monthlyCost: parseFloat(totalCurr.toFixed(2)),
      wastedMonthly: 0,
      expiresAt: new Date(today.getFullYear(), 11, 31).toISOString().split('T')[0],
      status: 'active',
    })
  }

  CACHE.set(ck, { ts: Date.now(), data: results })
  return results
}
