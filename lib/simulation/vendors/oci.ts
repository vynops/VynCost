/**
 * OCI simulation — mirrors Oracle Cloud Infrastructure Usage Reports API shapes.
 * Uses Tenancy → Compartment → Resource hierarchy with Universal Credits model.
 */

import { createRng, hashSeed, seededRand, seededPick, buildDailyTrend } from '@/lib/simulation/seed'
import type { ServiceCost, Recommendation, WasteItem, AllocationRow } from '@/lib/mock-data'

const OCI_REGIONS = ['uk-london-1','eu-frankfurt-1','us-ashburn-1','us-phoenix-1','ap-tokyo-1','ap-sydney-1']

const OCI_SERVICES: { name: string; baseUsd: number }[] = [
  { name: 'Compute (VM)',         baseUsd: 680  },
  { name: 'Object Storage',       baseUsd: 140  },
  { name: 'Autonomous DB',        baseUsd: 520  },
  { name: 'OKE (Kubernetes)',     baseUsd: 310  },
  { name: 'Block Volumes',        baseUsd: 165  },
  { name: 'Load Balancer',        baseUsd: 95   },
  { name: 'VCN Networking',       baseUsd: 130  },
  { name: 'Streaming (Kafka)',    baseUsd: 88   },
  { name: 'Data Catalog',         baseUsd: 72   },
  { name: 'Functions',            baseUsd: 45   },
  { name: 'API Gateway',          baseUsd: 55   },
  { name: 'Bastion',              baseUsd: 30   },
]

const OCI_SHAPES = ['VM.Standard.E4.Flex','VM.Standard3.Flex','VM.Standard.E3.Flex','VM.Optimized3.Flex','BM.Standard.E4.128']

export function ociServiceCosts(accountId: string, accountName: string): ServiceCost[] {
  const rng = createRng(hashSeed(`${accountId}:oci:services`))
  return OCI_SERVICES.map(s => ({
    service: s.name,
    provider: 'oci' as const,
    accountId,
    accountName,
    amountUsd: seededRand(rng, s.baseUsd * 0.75, s.baseUsd * 1.30),
    trend:     seededRand(rng, -8, 24),
    region:    seededPick(rng, OCI_REGIONS),
  }))
}

export function ociDailyTrend(accountId: string) {
  const rng = createRng(hashSeed(`${accountId}:oci:anomaly`))
  const anomalyDay = Math.floor(rng() * 14) + 6
  return buildDailyTrend(accountId + ':oci', 155, anomalyDay)
}

export function ociRecommendations(accountId: string, accountName: string): Recommendation[] {
  const rng        = createRng(hashSeed(`${accountId}:oci:recs`))
  const region     = seededPick(rng, OCI_REGIONS)
  const shape      = seededPick(rng, OCI_SHAPES)
  const tenancyId  = `ocid1.tenancy.oc1..${hashSeed(accountId).toString(16).padStart(40,'a').slice(0,40)}`
  const compId     = `ocid1.compartment.oc1..${hashSeed(accountId + 'comp').toString(16).padStart(40,'a').slice(0,40)}`
  const instId     = `ocid1.instance.oc1.${region}.${hashSeed(accountId + 'inst').toString(16).slice(0,24)}`
  const adbId      = `ocid1.autonomousdatabase.oc1.${region}.${hashSeed(accountId + 'adb').toString(16).slice(0,20)}`

  return [
    {
      id: `oci-rec-001-${accountId}`,
      provider: 'oci', accountId, accountName,
      resourceId: instId,
      resourceName: `prod-compute-${hashSeed(accountId).toString(16).slice(0,4)}`,
      resourceType: 'OCI Compute Instance', region,
      issue: `OCPU avg ${seededRand(rng,3,9,1)}% — flex shape overallocated`,
      currentConfig: `${shape} (16 OCPU, 256GB RAM)`,
      currentCostPerMonth: seededRand(rng, 300, 550),
      recommendedConfig: `${shape} (4 OCPU, 64GB RAM)`,
      optimisedCostPerMonth: seededRand(rng, 75, 140),
      savingsPerMonth: seededRand(rng, 220, 420),
      savingsPercent: seededRand(rng, 64, 78),
      risk: 'Low', confidence: seededRand(rng, 87, 96, 0) as unknown as number,
      applyCommand: `oci compute instance update --instance-id ${instId} --shape-config '{"ocpus": 4, "memoryInGBs": 64}'`,
      status: 'open', category: 'rightsize',
    },
    {
      id: `oci-rec-002-${accountId}`,
      provider: 'oci', accountId, accountName,
      resourceId: adbId,
      resourceName: `adb-prod-${hashSeed(accountId + 'adb').toString(16).slice(0,6)}`,
      resourceType: 'Autonomous Database', region,
      issue: `Autonomous DB running 24/7 with ${seededRand(rng,2,8,1)}% avg CPU — auto-scale over-provisioned`,
      currentConfig: '8 OCPU Always-on',
      currentCostPerMonth: seededRand(rng, 400, 700),
      recommendedConfig: '2 OCPU with auto-scale enabled',
      optimisedCostPerMonth: seededRand(rng, 100, 175),
      savingsPerMonth: seededRand(rng, 300, 530),
      savingsPercent: seededRand(rng, 68, 78),
      risk: 'Medium', confidence: seededRand(rng, 80, 90, 0) as unknown as number,
      applyCommand: `oci db autonomous-database update --autonomous-database-id ${adbId} --cpu-core-count 2 --is-auto-scaling-enabled true`,
      status: 'open', category: 'rightsize',
    },
    {
      id: `oci-rec-003-${accountId}`,
      provider: 'oci', accountId, accountName,
      resourceId: `${compId}/object-storage/old-archive-bucket`,
      resourceName: 'old-archive-bucket',
      resourceType: 'Object Storage Bucket', region,
      issue: `${seededRand(rng,2,8,0)}TB in Standard tier — data not accessed in ${seededRand(rng,60,120,0)} days`,
      currentConfig: 'Object Storage Standard tier',
      currentCostPerMonth: seededRand(rng, 80, 200),
      recommendedConfig: 'Archive Storage tier (83% cheaper)',
      optimisedCostPerMonth: seededRand(rng, 12, 35),
      savingsPerMonth: seededRand(rng, 65, 165),
      savingsPercent: seededRand(rng, 78, 88),
      risk: 'Low', confidence: seededRand(rng, 88, 96, 0) as unknown as number,
      applyCommand: `oci os object bulk-upload --bucket-name old-archive-bucket --storage-tier Archive`,
      status: 'open', category: 'storage',
    },
  ]
}

export function ociWaste(accountId: string, accountName: string): WasteItem[] {
  const rng    = createRng(hashSeed(`${accountId}:oci:waste`))
  const region = seededPick(rng, OCI_REGIONS)
  const volId  = `ocid1.volume.oc1.${region}.${hashSeed(accountId + 'vol').toString(16).slice(0,20)}`
  const ipId   = `ocid1.publicip.oc1.${region}.${hashSeed(accountId + 'ip').toString(16).slice(0,20)}`

  return [
    { id: `oci-w1-${accountId}`, provider: 'oci', accountId, accountName, resourceId: volId, resourceName: `block-vol-orphan-${hashSeed(accountId).toString(16).slice(0,4)}`, resourceType: 'Block Volume', region, reason: `Detached block volume — compute instance terminated ${seededRand(rng,15,50,0)} days ago`, costPerDay: seededRand(rng,1.5,4.5), idleSinceDays: seededRand(rng,15,50,0) as unknown as number, status: 'open' },
    { id: `oci-w2-${accountId}`, provider: 'oci', accountId, accountName, resourceId: ipId, resourceName: `reserved-ip-${hashSeed(accountId + 'ip').toString(16).slice(0,4)}`, resourceType: 'Reserved Public IP', region, reason: 'Reserved public IP not assigned to any resource', costPerDay: 0.25, idleSinceDays: seededRand(rng,20,60,0) as unknown as number, status: 'open' },
    { id: `oci-w3-${accountId}`, provider: 'oci', accountId, accountName, resourceId: `ocid1.loadbalancer.oc1.${region}.${hashSeed(accountId + 'lb').toString(16).slice(0,16)}`, resourceName: `lb-idle-${hashSeed(accountId + 'lb').toString(16).slice(0,4)}`, resourceType: 'Load Balancer', region, reason: `Load balancer with empty backend set — no traffic for ${seededRand(rng,10,30,0)} days`, costPerDay: seededRand(rng,0.5,1.5), idleSinceDays: seededRand(rng,10,30,0) as unknown as number, status: 'open' },
  ]
}

export function ociMonthlyCost(accountId: string): number {
  const services = ociServiceCosts(accountId, '')
  return parseFloat(services.reduce((s, c) => s + c.amountUsd, 0).toFixed(2))
}

export function ociAllocation(accountId: string): AllocationRow[] {
  const rng    = createRng(hashSeed(`${accountId}:oci:alloc`))
  const teams  = ['Infrastructure','Database Team','Application Dev','Security Ops','Unallocated']
  const shares = [0.35, 0.28, 0.20, 0.10, 0.07]
  const total  = ociMonthlyCost(accountId)
  return teams.map((team, i) => {
    const amt  = parseFloat((total * shares[i] * seededRand(rng, 0.9, 1.1)).toFixed(2))
    const prev = parseFloat((amt * seededRand(rng, 0.82, 1.18)).toFixed(2))
    return {
      team, amountUsd: amt, pct: parseFloat(((amt / total) * 100).toFixed(1)),
      prevAmountUsd: prev, trend: parseFloat((((amt - prev) / prev) * 100).toFixed(1)),
      services: [
        { service: 'Compute (VM)',  amountUsd: parseFloat((amt * 0.45).toFixed(2)) },
        { service: 'Autonomous DB', amountUsd: parseFloat((amt * 0.35).toFixed(2)) },
        { service: 'Object Storage',amountUsd: parseFloat((amt * 0.20).toFixed(2)) },
      ],
    }
  })
}
