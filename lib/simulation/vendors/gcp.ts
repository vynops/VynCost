/**
 * GCP simulation — mirrors Google Cloud Billing API response shapes.
 * Uses GCP project/folder hierarchy, sustained-use discounts, and Spot VM pricing.
 */

import { createRng, hashSeed, seededRand, seededPick, buildDailyTrend } from '@/lib/simulation/seed'
import type { ServiceCost, Recommendation, WasteItem, AllocationRow } from '@/lib/mock-data'

const GCP_REGIONS = ['us-central1','us-east1','europe-west1','europe-west4','asia-east1','asia-southeast1']

const GCP_SERVICES: { name: string; baseUsd: number }[] = [
  { name: 'Compute Engine',   baseUsd: 1100 },
  { name: 'BigQuery',         baseUsd: 480  },
  { name: 'Cloud SQL',        baseUsd: 320  },
  { name: 'Cloud Storage',    baseUsd: 185  },
  { name: 'GKE',              baseUsd: 420  },
  { name: 'Cloud Run',        baseUsd: 95   },
  { name: 'Dataflow',         baseUsd: 260  },
  { name: 'Pub/Sub',          baseUsd: 72   },
  { name: 'Cloud CDN',        baseUsd: 88   },
  { name: 'Networking',       baseUsd: 145  },
  { name: 'Cloud Logging',    baseUsd: 55   },
  { name: 'Vertex AI',        baseUsd: 310  },
]

const GCP_MACHINE_TYPES = ['n1-standard-4','n2-standard-8','n2-standard-16','c2-standard-4','e2-medium','n2d-standard-8']

export function gcpServiceCosts(accountId: string, accountName: string): ServiceCost[] {
  const rng = createRng(hashSeed(`${accountId}:gcp:services`))
  return GCP_SERVICES.map(s => ({
    service: s.name,
    provider: 'gcp' as const,
    accountId,
    accountName,
    amountUsd: seededRand(rng, s.baseUsd * 0.80, s.baseUsd * 1.25),
    trend:     seededRand(rng, -10, 32),
    region:    seededPick(rng, GCP_REGIONS),
  }))
}

export function gcpDailyTrend(accountId: string) {
  const rng = createRng(hashSeed(`${accountId}:gcp:anomaly`))
  const anomalyDay = Math.floor(rng() * 18) + 4
  return buildDailyTrend(accountId + ':gcp', 240, anomalyDay)
}

export function gcpRecommendations(accountId: string, accountName: string): Recommendation[] {
  const rng = createRng(hashSeed(`${accountId}:gcp:recs`))
  const region   = seededPick(rng, GCP_REGIONS)
  const mtype    = seededPick(rng, GCP_MACHINE_TYPES)
  const projectId = `projects/${accountName.toLowerCase().replace(/\s+/g,'-').slice(0,20)}`
  const vmName   = `analytics-worker-${hashSeed(accountId).toString(16).slice(0,4)}`
  const diskName = `orphan-disk-${hashSeed(accountId + 'disk').toString(16).slice(0,6)}`

  return [
    {
      id: `gcp-rec-001-${accountId}`,
      provider: 'gcp', accountId, accountName,
      resourceId: `${projectId}/zones/${region}-b/instances/${vmName}`,
      resourceName: vmName,
      resourceType: 'Compute Engine VM', region,
      issue: `Batch workload eligible for Spot VM — ${seededRand(rng,85,92,1)}% cheaper`,
      currentConfig: `${mtype} on-demand`,
      currentCostPerMonth: seededRand(rng, 160, 280),
      recommendedConfig: `${mtype} Spot VM`,
      optimisedCostPerMonth: seededRand(rng, 18, 35),
      savingsPerMonth: seededRand(rng, 140, 260),
      savingsPercent: seededRand(rng, 84, 92),
      risk: 'Medium', confidence: seededRand(rng, 75, 88, 0) as unknown as number,
      applyCommand: `gcloud compute instances set-scheduling ${vmName} --provisioning-model=SPOT --zone=${region}-b`,
      status: 'open', category: 'spot',
    },
    {
      id: `gcp-rec-002-${accountId}`,
      provider: 'gcp', accountId, accountName,
      resourceId: `${projectId}/disks/${diskName}`,
      resourceName: diskName,
      resourceType: 'Persistent Disk Snapshot', region,
      issue: `Snapshot ${seededRand(rng,40,80,0)} days old — parent disk no longer exists`,
      currentConfig: `${seededRand(rng,200,800,0)}GB SSD snapshot`,
      currentCostPerMonth: seededRand(rng, 35, 80),
      recommendedConfig: 'Delete snapshot',
      optimisedCostPerMonth: 0,
      savingsPerMonth: seededRand(rng, 35, 80),
      savingsPercent: 100,
      risk: 'Low', confidence: seededRand(rng, 94, 99, 0) as unknown as number,
      applyCommand: `gcloud compute snapshots delete ${diskName} --quiet`,
      status: 'open', category: 'storage',
    },
    {
      id: `gcp-rec-003-${accountId}`,
      provider: 'gcp', accountId, accountName,
      resourceId: `${projectId}/bigquery/datasets/analytics`,
      resourceName: 'analytics dataset',
      resourceType: 'BigQuery Dataset', region: 'EU',
      issue: `${seededRand(rng,3,8,0)} queries scanned >500GB each — no partition filter`,
      currentConfig: 'Full table scans on 2TB dataset',
      currentCostPerMonth: seededRand(rng, 280, 480),
      recommendedConfig: 'Partition by date + require partition filter',
      optimisedCostPerMonth: seededRand(rng, 40, 80),
      savingsPerMonth: seededRand(rng, 220, 400),
      savingsPercent: seededRand(rng, 72, 88),
      risk: 'Low', confidence: seededRand(rng, 85, 94, 0) as unknown as number,
      applyCommand: `bq update --time_partitioning_type=DAY ${projectId.split('/')[1]}:analytics.events`,
      status: 'open', category: 'storage',
    },
  ]
}

export function gcpWaste(accountId: string, accountName: string): WasteItem[] {
  const rng = createRng(hashSeed(`${accountId}:gcp:waste`))
  const region    = seededPick(rng, GCP_REGIONS)
  const diskId    = `disk-orphan-${hashSeed(accountId + 'disk').toString(16).slice(0,6)}`
  const staticIp  = `static-ip-${hashSeed(accountId + 'ip').toString(16).slice(0,4)}`
  const projectId = `${accountName.toLowerCase().replace(/\s+/g,'-').slice(0,16)}`

  return [
    { id: `gcp-w1-${accountId}`, provider: 'gcp', accountId, accountName, resourceId: `projects/${projectId}/disks/${diskId}`, resourceName: diskId, resourceType: 'Persistent Disk', region, reason: `Disk not attached to any VM for ${seededRand(rng,20,50,0)} days`, costPerDay: seededRand(rng,1.8,4.5), idleSinceDays: seededRand(rng,20,50,0) as unknown as number, status: 'open' },
    { id: `gcp-w2-${accountId}`, provider: 'gcp', accountId, accountName, resourceId: `projects/${projectId}/addresses/${staticIp}`, resourceName: staticIp, resourceType: 'Static External IP', region: 'global', reason: 'Reserved but not in use — $0.01/hr charge', costPerDay: 0.24, idleSinceDays: seededRand(rng,30,60,0) as unknown as number, status: 'open' },
    { id: `gcp-w3-${accountId}`, provider: 'gcp', accountId, accountName, resourceId: `projects/${projectId}/global/forwardingRules/old-lb`, resourceName: 'old-lb-rule', resourceType: 'Forwarding Rule', region: 'global', reason: 'Load balancer with 0 backends for 25 days', costPerDay: 0.60, idleSinceDays: 25, status: 'open' },
  ]
}

export function gcpMonthlyCost(accountId: string): number {
  const services = gcpServiceCosts(accountId, '')
  return parseFloat(services.reduce((s, c) => s + c.amountUsd, 0).toFixed(2))
}

export function gcpAllocation(accountId: string): AllocationRow[] {
  const rng   = createRng(hashSeed(`${accountId}:gcp:alloc`))
  const teams = ['Data & Analytics','ML Platform','Backend Engineering','BI & Reporting','Unallocated']
  const shares = [0.35, 0.25, 0.20, 0.12, 0.08]
  const total  = gcpMonthlyCost(accountId)
  return teams.map((team, i) => {
    const amt  = parseFloat((total * shares[i] * seededRand(rng, 0.9, 1.1)).toFixed(2))
    const prev = parseFloat((amt * seededRand(rng, 0.8, 1.2)).toFixed(2))
    return {
      team, amountUsd: amt, pct: parseFloat(((amt / total) * 100).toFixed(1)),
      prevAmountUsd: prev, trend: parseFloat((((amt - prev) / prev) * 100).toFixed(1)),
      services: [
        { service: 'Compute Engine', amountUsd: parseFloat((amt * 0.40).toFixed(2)) },
        { service: 'BigQuery',       amountUsd: parseFloat((amt * 0.35).toFixed(2)) },
        { service: 'Cloud Storage',  amountUsd: parseFloat((amt * 0.25).toFixed(2)) },
      ],
    }
  })
}
