/**
 * AWS simulation — mirrors AWS Cost Explorer API response shapes.
 * Services, regions, pricing tiers and resource IDs match real AWS patterns.
 */

import { createRng, hashSeed, seededRand, seededPick, buildDailyTrend, daysAgo } from '@/lib/simulation/seed'
import type { ServiceCost, Recommendation, WasteItem, AllocationRow } from '@/lib/mock-data'

const AWS_REGIONS = ['us-east-1', 'us-west-2', 'eu-west-1', 'eu-central-1', 'ap-southeast-1', 'ap-northeast-1']

const AWS_SERVICES: { name: string; baseUsd: number; unit: string }[] = [
  { name: 'EC2',              baseUsd: 2800, unit: 'instance-hours' },
  { name: 'RDS',              baseUsd: 880,  unit: 'instance-hours' },
  { name: 'S3',               baseUsd: 240,  unit: 'GB-month' },
  { name: 'ECS/Fargate',      baseUsd: 420,  unit: 'vCPU-hours' },
  { name: 'CloudFront',       baseUsd: 130,  unit: 'GB-transfer' },
  { name: 'ElastiCache',      baseUsd: 280,  unit: 'node-hours' },
  { name: 'Lambda',           baseUsd: 95,   unit: 'GB-seconds' },
  { name: 'SQS',              baseUsd: 68,   unit: 'million requests' },
  { name: 'ECR',              baseUsd: 55,   unit: 'GB-month' },
  { name: 'Route 53',         baseUsd: 42,   unit: 'hosted zones' },
  { name: 'Data Transfer',    baseUsd: 310,  unit: 'GB' },
  { name: 'CloudWatch',       baseUsd: 88,   unit: 'metrics' },
]

const EC2_TYPES = ['t3.micro','t3.medium','t3.large','m5.large','m5.xlarge','m5.2xlarge','c5.xlarge','r5.xlarge','r5.2xlarge']
const RDS_TYPES = ['db.t3.medium','db.t3.large','db.r5.large','db.r5.xlarge','db.r5.2xlarge']

export function awsServiceCosts(accountId: string, accountName: string): ServiceCost[] {
  const rng = createRng(hashSeed(`${accountId}:aws:services`))
  return AWS_SERVICES.map(s => ({
    service: s.name,
    provider: 'aws' as const,
    accountId,
    accountName,
    amountUsd: seededRand(rng, s.baseUsd * 0.82, s.baseUsd * 1.22),
    trend:     seededRand(rng, -12, 28),
    region:    seededPick(rng, AWS_REGIONS),
  }))
}

export function awsDailyTrend(accountId: string) {
  const rng = createRng(hashSeed(`${accountId}:aws:anomaly`))
  const anomalyDay = Math.floor(rng() * 20) + 3   // somewhere in days 3-22
  return buildDailyTrend(accountId + ':aws', 410, anomalyDay)
}

export function awsRecommendations(accountId: string, accountName: string): Recommendation[] {
  const rng = createRng(hashSeed(`${accountId}:aws:recs`))
  const region = seededPick(rng, AWS_REGIONS)
  const ec2type = seededPick(rng, EC2_TYPES)
  const rdstype = seededPick(rng, RDS_TYPES)
  const instId  = `i-${hashSeed(accountId).toString(16).padStart(17,'0').slice(0,17)}`
  const dbId    = `db-${accountName.toLowerCase().replace(/\s+/g,'-').slice(0,12)}-01`

  return [
    {
      id: `aws-rec-001-${accountId}`,
      provider: 'aws', accountId, accountName,
      resourceId: instId, resourceName: `prod-app-server-01`,
      resourceType: 'EC2 Instance', region,
      issue: `CPU avg ${seededRand(rng,2,8,1)}% over 30 days — severely over-provisioned`,
      currentConfig: `${ec2type} (on-demand)`,
      currentCostPerMonth: seededRand(rng, 220, 380),
      recommendedConfig: 't3.medium (2 vCPU, 4 GB)',
      optimisedCostPerMonth: seededRand(rng, 32, 68),
      savingsPerMonth: seededRand(rng, 160, 320),
      savingsPercent: seededRand(rng, 62, 82),
      risk: 'Low', confidence: seededRand(rng, 88, 97, 0) as unknown as number,
      applyCommand: `aws ec2 modify-instance-attribute --instance-id ${instId} --instance-type t3.medium`,
      status: 'open', category: 'rightsize',
    },
    {
      id: `aws-rec-002-${accountId}`,
      provider: 'aws', accountId, accountName,
      resourceId: dbId, resourceName: dbId,
      resourceType: 'RDS Instance', region,
      issue: `Database CPU avg ${seededRand(rng,4,12,1)}% — overprovisioned`,
      currentConfig: `${rdstype} (Multi-AZ)`,
      currentCostPerMonth: seededRand(rng, 580, 900),
      recommendedConfig: 'db.t3.medium (single-AZ for staging)',
      optimisedCostPerMonth: seededRand(rng, 90, 180),
      savingsPerMonth: seededRand(rng, 400, 720),
      savingsPercent: seededRand(rng, 55, 78),
      risk: 'Medium', confidence: seededRand(rng, 80, 92, 0) as unknown as number,
      applyCommand: `aws rds modify-db-instance --db-instance-identifier ${dbId} --db-instance-class db.t3.medium --apply-immediately`,
      status: 'open', category: 'rightsize',
    },
    {
      id: `aws-rec-003-${accountId}`,
      provider: 'aws', accountId, accountName,
      resourceId: 'ec2-savings-plan-candidate', resourceName: 'EC2 Compute Savings Plan',
      resourceType: 'Commitment', region: 'global',
      issue: 'On-demand EC2 spend stable 90 days — 1-year Savings Plan saves 38%',
      currentConfig: `On-demand baseline $${seededRand(rng, 380, 520)}/mo`,
      currentCostPerMonth: seededRand(rng, 380, 520),
      recommendedConfig: '1-year Compute Savings Plan',
      optimisedCostPerMonth: seededRand(rng, 220, 330),
      savingsPerMonth: seededRand(rng, 130, 200),
      savingsPercent: seededRand(rng, 34, 42),
      risk: 'Low', confidence: seededRand(rng, 90, 96, 0) as unknown as number,
      applyCommand: '# Purchase via AWS Console → EC2 → Savings Plans → Purchase',
      status: 'open', category: 'reserved',
    },
  ]
}

export function awsWaste(accountId: string, accountName: string): WasteItem[] {
  const rng = createRng(hashSeed(`${accountId}:aws:waste`))
  const region = seededPick(rng, AWS_REGIONS)
  const volId  = `vol-${hashSeed(accountId + 'vol').toString(16).slice(0,8)}`
  const snapId = `snap-${hashSeed(accountId + 'snap').toString(16).slice(0,10)}`
  const eipId  = `eipalloc-${hashSeed(accountId + 'eip').toString(16).slice(0,8)}`
  const lbId   = `elbv2-${accountName.toLowerCase().replace(/\s+/g,'-').slice(0,8)}-lb`

  return [
    { id: `aws-w1-${accountId}`, provider: 'aws', accountId, accountName, resourceId: volId, resourceName: volId, resourceType: 'EBS Volume', region, reason: `Unattached for ${seededRand(rng,20,60,0)} days`, costPerDay: seededRand(rng, 2.4, 5.2), idleSinceDays: seededRand(rng,20,60,0) as unknown as number, status: 'open' },
    { id: `aws-w2-${accountId}`, provider: 'aws', accountId, accountName, resourceId: eipId, resourceName: eipId, resourceType: 'Elastic IP', region, reason: 'Reserved but not associated with any instance', costPerDay: 0.36, idleSinceDays: seededRand(rng,8,30,0) as unknown as number, status: 'open' },
    { id: `aws-w3-${accountId}`, provider: 'aws', accountId, accountName, resourceId: snapId, resourceName: snapId, resourceType: 'EBS Snapshot', region, reason: `Snapshot ${seededRand(rng,40,90,0)} days old — source volume deleted`, costPerDay: seededRand(rng, 1.2, 3.8), idleSinceDays: seededRand(rng,40,90,0) as unknown as number, status: 'open' },
    { id: `aws-w4-${accountId}`, provider: 'aws', accountId, accountName, resourceId: lbId, resourceName: lbId, resourceType: 'Application Load Balancer', region, reason: '0 healthy targets — no traffic for 18 days', costPerDay: 0.56, idleSinceDays: 18, status: 'open' },
  ]
}

export function awsExplorerByRegion(accountId: string): { label: string; amountUsd: number; prev: number; region: string }[] {
  const rng = createRng(hashSeed(`${accountId}:aws:regions`))
  return AWS_REGIONS.map(r => {
    const base = seededRand(rng, 400, 3200)
    return { label: r, amountUsd: base, prev: seededRand(rng, base * 0.8, base * 1.1), region: r }
  })
}

export function awsMonthlyCost(accountId: string): number {
  const services = awsServiceCosts(accountId, '')
  return parseFloat(services.reduce((s, c) => s + c.amountUsd, 0).toFixed(2))
}

export function awsAllocation(accountId: string): AllocationRow[] {
  const rng = createRng(hashSeed(`${accountId}:aws:alloc`))
  const teams = ['Platform Engineering','Data & Analytics','Product — Core','ML / AI','DevOps / CI-CD','Unallocated']
  const shares = [0.31, 0.23, 0.19, 0.12, 0.09, 0.06]
  const total  = awsMonthlyCost(accountId)
  return teams.map((team, i) => {
    const amt  = parseFloat((total * shares[i] * seededRand(rng, 0.9, 1.1)).toFixed(2))
    const prev = parseFloat((amt * seededRand(rng, 0.8, 1.2)).toFixed(2))
    return {
      team, amountUsd: amt, pct: parseFloat(((amt / total) * 100).toFixed(1)),
      prevAmountUsd: prev, trend: parseFloat((((amt - prev) / prev) * 100).toFixed(1)),
      services: [
        { service: 'EC2',  amountUsd: parseFloat((amt * 0.45).toFixed(2)) },
        { service: 'RDS',  amountUsd: parseFloat((amt * 0.28).toFixed(2)) },
        { service: 'S3',   amountUsd: parseFloat((amt * 0.27).toFixed(2)) },
      ],
    }
  })
}
