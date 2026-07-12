/**
 * Realistic mock cost data — used when no real cloud credentials are configured.
 * Same shape as real API responses so switching to real APIs is drop-in.
 */

export type CloudProvider = 'aws' | 'gcp' | 'azure' | 'oci'

export interface CostPoint {
  date: string        // YYYY-MM-DD
  amountUsd: number
}

export interface ServiceCost {
  service: string
  provider: CloudProvider
  accountId: string
  accountName: string
  amountUsd: number
  trend: number        // % change vs prior period, e.g. +12.5
  region: string
}

export interface Recommendation {
  id: string
  provider: CloudProvider
  accountId: string
  accountName: string
  resourceId: string
  resourceName: string
  resourceType: string
  region: string
  issue: string
  currentConfig: string
  currentCostPerMonth: number
  recommendedConfig: string
  optimisedCostPerMonth: number
  savingsPerMonth: number
  savingsPercent: number
  risk: 'Low' | 'Medium' | 'High'
  confidence: number   // 0-100
  applyCommand: string
  status: 'open' | 'applied' | 'dismissed'
  category: 'rightsize' | 'idle' | 'reserved' | 'spot' | 'storage'
}

export interface WasteItem {
  id: string
  provider: CloudProvider
  accountId: string
  accountName: string
  resourceId: string
  resourceName: string
  resourceType: string
  region: string
  reason: string
  costPerDay: number
  idleSinceDays: number
  status: 'open' | 'dismissed' | 'deleted'
}

export interface AllocationRow {
  team: string
  amountUsd: number
  pct: number
  prevAmountUsd: number
  trend: number
  services: { service: string; amountUsd: number }[]
}

export interface AnomalyEvent {
  id: string
  date: string
  service: string
  provider: CloudProvider
  accountName: string
  accountId: string
  region: string
  baseline: number
  actual: number
  spikePercent: number
  severity: 'low' | 'medium' | 'high'
  status: 'open' | 'acknowledged'
  description: string
}

export interface OverviewData {
  totalMtd: number
  projectedEom: number
  savingsFound: number
  savingsApplied: number
  accountCount: number
  wasteCount: number
  dailyTrend: CostPoint[]
  topServices: ServiceCost[]
  byProvider: { provider: CloudProvider; amountUsd: number }[]
  alerts: { id: string; severity: 'critical' | 'warning' | 'info'; message: string; time: string }[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function rand(min: number, max: number, dp = 2) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(dp))
}

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}

// ── Daily trend: last 30 days ─────────────────────────────────────────────────
function buildDailyTrend(base: number): CostPoint[] {
  const pts: CostPoint[] = []
  for (let i = 29; i >= 0; i--) {
    const noise = rand(-0.08, 0.12)
    const weekendDip = new Date(daysAgo(i)).getDay() % 6 === 0 ? 0.78 : 1
    pts.push({ date: daysAgo(i), amountUsd: parseFloat((base * (1 + noise) * weekendDip).toFixed(2)) })
  }
  return pts
}

export interface RiCoverageItem {
  id: string
  provider: CloudProvider
  accountName: string
  accountId: string
  commitmentType: string
  service: string
  region: string
  term: '1yr' | '3yr'
  paymentOption: 'No Upfront' | 'Partial Upfront' | 'All Upfront'
  hourlyCost: number
  unusedHours: number
  totalHours: number
  coveragePct: number
  monthlyCost: number
  wastedMonthly: number
  expiresAt: string
  status: 'active' | 'expiring_soon' | 'expired'
}

// ── Mock for a single account ─────────────────────────────────────────────────
export function mockOverview(accounts: { id: string; name: string; provider: CloudProvider }[]): OverviewData {
  const dailyBase = 420
  const daily = buildDailyTrend(dailyBase)
  const totalMtd = daily.slice(-new Date().getDate()).reduce((s, p) => s + p.amountUsd, 0)
  const projectedEom = (totalMtd / new Date().getDate()) * 30

  const awsShare = 0.58, gcpShare = 0.26, azureShare = 0.16
  const byProvider: OverviewData['byProvider'] = [
    { provider: 'aws', amountUsd: parseFloat((projectedEom * awsShare).toFixed(2)) },
    { provider: 'gcp', amountUsd: parseFloat((projectedEom * gcpShare).toFixed(2)) },
    { provider: 'azure', amountUsd: parseFloat((projectedEom * azureShare).toFixed(2)) },
  ]

  const awsAcct = accounts.find(a => a.provider === 'aws')?.name || 'AWS Production'
  const gcpAcct = accounts.find(a => a.provider === 'gcp')?.name || 'GCP Core'
  const azAcct  = accounts.find(a => a.provider === 'azure')?.name || 'Azure Dev'

  const topServices: ServiceCost[] = [
    { service: 'EC2', provider: 'aws', accountId: 'mock-aws', accountName: awsAcct, amountUsd: rand(2800, 3200), trend: rand(-5, 18), region: 'eu-west-1' },
    { service: 'RDS', provider: 'aws', accountId: 'mock-aws', accountName: awsAcct, amountUsd: rand(800, 1100), trend: rand(-2, 8), region: 'eu-west-1' },
    { service: 'S3',  provider: 'aws', accountId: 'mock-aws', accountName: awsAcct, amountUsd: rand(180, 320), trend: rand(0, 25), region: 'global' },
    { service: 'CloudFront', provider: 'aws', accountId: 'mock-aws', accountName: awsAcct, amountUsd: rand(90, 160), trend: rand(-3, 12), region: 'global' },
    { service: 'Compute Engine', provider: 'gcp', accountId: 'mock-gcp', accountName: gcpAcct, amountUsd: rand(900, 1300), trend: rand(-8, 15), region: 'europe-west1' },
    { service: 'BigQuery', provider: 'gcp', accountId: 'mock-gcp', accountName: gcpAcct, amountUsd: rand(300, 550), trend: rand(5, 30), region: 'EU' },
    { service: 'Cloud SQL', provider: 'gcp', accountId: 'mock-gcp', accountName: gcpAcct, amountUsd: rand(200, 380), trend: rand(-5, 10), region: 'europe-west1' },
    { service: 'Virtual Machines', provider: 'azure', accountId: 'mock-az', accountName: azAcct, amountUsd: rand(450, 700), trend: rand(-10, 20), region: 'West Europe' },
    { service: 'Azure SQL', provider: 'azure', accountId: 'mock-az', accountName: azAcct, amountUsd: rand(200, 400), trend: rand(-5, 15), region: 'West Europe' },
    { service: 'Data Factory', provider: 'azure', accountId: 'mock-az', accountName: azAcct, amountUsd: rand(100, 220), trend: rand(0, 35), region: 'West Europe' },
  ]

  return {
    totalMtd: parseFloat(totalMtd.toFixed(2)),
    projectedEom: parseFloat(projectedEom.toFixed(2)),
    savingsFound: rand(1800, 2600),
    savingsApplied: rand(400, 900),
    accountCount: accounts.length || 3,
    wasteCount: rand(12, 22, 0) as number,
    dailyTrend: daily,
    topServices: topServices.sort((a, b) => b.amountUsd - a.amountUsd),
    byProvider,
    alerts: [
      { id: 'a1', severity: 'warning', message: 'EC2 spend up 18% vs last week in eu-west-1', time: '2h ago' },
      { id: 'a2', severity: 'info', message: 'BigQuery: 3 jobs scanned >500GB — consider partitioning', time: '6h ago' },
      { id: 'a3', severity: 'warning', message: 'Azure Data Factory budget 78% consumed with 9 days left', time: '1d ago' },
    ],
  }
}

export function mockRecommendations(accountId?: string): Recommendation[] {
  return [
    {
      id: 'rec_001', provider: 'aws', accountId: accountId || 'mock-aws', accountName: 'AWS Production',
      resourceId: 'i-0a1b2c3d4e5f6789a', resourceName: 'prod-app-server-01',
      resourceType: 'EC2 Instance', region: 'eu-west-1',
      issue: 'CPU avg 4.2% over 30 days — severely over-provisioned',
      currentConfig: 'm5.2xlarge (8 vCPU, 32 GB RAM)',
      currentCostPerMonth: 274.56,
      recommendedConfig: 'm5.large (2 vCPU, 8 GB RAM)',
      optimisedCostPerMonth: 68.64,
      savingsPerMonth: 205.92, savingsPercent: 75.0,
      risk: 'Low', confidence: 94,
      applyCommand: 'aws ec2 modify-instance-attribute --instance-id i-0a1b2c3d4e5f6789a --instance-type m5.large',
      status: 'open', category: 'rightsize',
    },
    {
      id: 'rec_002', provider: 'aws', accountId: accountId || 'mock-aws', accountName: 'AWS Production',
      resourceId: 'db-prod-mysql-01', resourceName: 'prod-mysql-01',
      resourceType: 'RDS Instance', region: 'eu-west-1',
      issue: 'Database CPU avg 8% — overprovisioned by 2 tiers',
      currentConfig: 'db.r5.2xlarge (8 vCPU, 64 GB)',
      currentCostPerMonth: 748.80,
      recommendedConfig: 'db.r5.large (2 vCPU, 16 GB)',
      optimisedCostPerMonth: 187.20,
      savingsPerMonth: 561.60, savingsPercent: 75.0,
      risk: 'Medium', confidence: 82,
      applyCommand: 'aws rds modify-db-instance --db-instance-identifier prod-mysql-01 --db-instance-class db.r5.large --apply-immediately',
      status: 'open', category: 'rightsize',
    },
    {
      id: 'rec_003', provider: 'aws', accountId: accountId || 'mock-aws', accountName: 'AWS Production',
      resourceId: 'i-staging-001', resourceName: 'staging-worker-02',
      resourceType: 'EC2 Instance', region: 'eu-west-1',
      issue: 'Instance idle — 0 CPU activity for 9 days',
      currentConfig: 't3.medium running 24/7',
      currentCostPerMonth: 30.37,
      recommendedConfig: 'Stop instance (restart when needed)',
      optimisedCostPerMonth: 0,
      savingsPerMonth: 30.37, savingsPercent: 100,
      risk: 'Low', confidence: 99,
      applyCommand: 'aws ec2 stop-instances --instance-ids i-staging-001',
      status: 'open', category: 'idle',
    },
    {
      id: 'rec_004', provider: 'aws', accountId: accountId || 'mock-aws', accountName: 'AWS Production',
      resourceId: 'reserved-purchase-1', resourceName: 'EC2 Savings Plan',
      resourceType: 'Commitment', region: 'global',
      issue: 'On-demand EC2 spend has been stable for 3 months — RI would save 38%',
      currentConfig: 'On-demand m5.large x6 ($411/mo)',
      currentCostPerMonth: 411.84,
      recommendedConfig: '1-year Compute Savings Plan ($255/mo)',
      optimisedCostPerMonth: 255.34,
      savingsPerMonth: 156.50, savingsPercent: 38.0,
      risk: 'Low', confidence: 91,
      applyCommand: '# Purchase via AWS Console: EC2 → Savings Plans → Purchase Savings Plan',
      status: 'open', category: 'reserved',
    },
    {
      id: 'rec_005', provider: 'gcp', accountId: accountId || 'mock-gcp', accountName: 'GCP Core',
      resourceId: 'projects/my-project/zones/europe-west1-b/instances/analytics-worker',
      resourceName: 'analytics-worker',
      resourceType: 'Compute Engine VM', region: 'europe-west1',
      issue: 'Batch workload — eligible for Spot VM (90% cheaper)',
      currentConfig: 'n2-standard-8 on-demand ($195/mo)',
      currentCostPerMonth: 195.20,
      recommendedConfig: 'n2-standard-8 Spot ($22/mo)',
      optimisedCostPerMonth: 22.00,
      savingsPerMonth: 173.20, savingsPercent: 88.7,
      risk: 'Medium', confidence: 78,
      applyCommand: 'gcloud compute instances set-scheduling analytics-worker --provisioning-model=SPOT --zone=europe-west1-b',
      status: 'open', category: 'spot',
    },
    {
      id: 'rec_006', provider: 'gcp', accountId: accountId || 'mock-gcp', accountName: 'GCP Core',
      resourceId: 'projects/my-project/disks/old-snapshot-disk',
      resourceName: 'old-snapshot-disk',
      resourceType: 'Persistent Disk Snapshot', region: 'europe-west1',
      issue: 'Snapshot 47 days old — no parent disk exists (orphaned)',
      currentConfig: '500GB SSD snapshot ($50/mo)',
      currentCostPerMonth: 50.00,
      recommendedConfig: 'Delete snapshot',
      optimisedCostPerMonth: 0,
      savingsPerMonth: 50.00, savingsPercent: 100,
      risk: 'Low', confidence: 97,
      applyCommand: 'gcloud compute snapshots delete old-snapshot-disk --quiet',
      status: 'open', category: 'storage',
    },
    {
      id: 'rec_007', provider: 'azure', accountId: accountId || 'mock-az', accountName: 'Azure Dev',
      resourceId: '/subscriptions/xxx/resourceGroups/rg-dev/providers/Microsoft.Compute/virtualMachines/dev-vm-03',
      resourceName: 'dev-vm-03',
      resourceType: 'Azure Virtual Machine', region: 'West Europe',
      issue: 'Dev VM running overnight — 0% CPU 8pm–8am weekdays',
      currentConfig: 'Standard_D4s_v3 24/7 ($140/mo)',
      currentCostPerMonth: 140.16,
      recommendedConfig: 'Auto-shutdown 8pm–8am via Azure DevTest policy',
      optimisedCostPerMonth: 70.08,
      savingsPerMonth: 70.08, savingsPercent: 50.0,
      risk: 'Low', confidence: 96,
      applyCommand: 'az vm auto-shutdown -g rg-dev -n dev-vm-03 --time 2000 --email admin@example.com',
      status: 'open', category: 'idle',
    },
  ]
}

export function mockWaste(): WasteItem[] {
  return [
    { id: 'w_001', provider: 'aws', accountId: 'mock-aws', accountName: 'AWS Production', resourceId: 'vol-01ab23cd', resourceName: 'vol-01ab23cd', resourceType: 'EBS Volume', region: 'eu-west-1', reason: 'Unattached for 34 days', costPerDay: 3.20, idleSinceDays: 34, status: 'open' },
    { id: 'w_002', provider: 'aws', accountId: 'mock-aws', accountName: 'AWS Production', resourceId: 'eipalloc-0a1b2c3d', resourceName: '54.74.12.34', resourceType: 'Elastic IP', region: 'eu-west-1', reason: 'Not associated with any instance', costPerDay: 0.36, idleSinceDays: 12, status: 'open' },
    { id: 'w_003', provider: 'aws', accountId: 'mock-aws', accountName: 'AWS Production', resourceId: 'snap-0a1b2c3d4e5', resourceName: 'snap-0a1b2c3d4e5', resourceType: 'EBS Snapshot', region: 'eu-west-1', reason: 'Snapshot 62 days old — source volume deleted', costPerDay: 1.80, idleSinceDays: 62, status: 'open' },
    { id: 'w_004', provider: 'aws', accountId: 'mock-aws', accountName: 'AWS Production', resourceId: 'i-idle-worker', resourceName: 'old-batch-worker', resourceType: 'EC2 Instance', region: 'us-east-1', reason: 'CPU avg 0.2% for 14 days', costPerDay: 1.38, idleSinceDays: 14, status: 'open' },
    { id: 'w_005', provider: 'aws', accountId: 'mock-aws', accountName: 'AWS Production', resourceId: 'elbv2-staging-lb', resourceName: 'staging-alb', resourceType: 'Application Load Balancer', region: 'eu-west-1', reason: '0 targets registered — no traffic for 21 days', costPerDay: 0.56, idleSinceDays: 21, status: 'open' },
    { id: 'w_006', provider: 'gcp', accountId: 'mock-gcp', accountName: 'GCP Core', resourceId: 'disk-orphan-001', resourceName: 'disk-orphan-001', resourceType: 'Persistent Disk', region: 'europe-west1', reason: 'Disk not attached to any VM for 28 days', costPerDay: 2.40, idleSinceDays: 28, status: 'open' },
    { id: 'w_007', provider: 'gcp', accountId: 'mock-gcp', accountName: 'GCP Core', resourceId: 'static-ip-002', resourceName: 'legacy-static-ip', resourceType: 'Static External IP', region: 'global', reason: 'Reserved but not in use', costPerDay: 0.24, idleSinceDays: 45, status: 'open' },
    { id: 'w_008', provider: 'azure', accountId: 'mock-az', accountName: 'Azure Dev', resourceId: '/rg-dev/disk/old-os-disk', resourceName: 'old-os-disk', resourceType: 'Managed Disk', region: 'West Europe', reason: 'Unattached managed disk — VM deleted 19 days ago', costPerDay: 1.60, idleSinceDays: 19, status: 'open' },
  ]
}

export function mockAllocation(): AllocationRow[] {
  return [
    { team: 'Platform Engineering', amountUsd: 4820, pct: 31.2, prevAmountUsd: 4200, trend: 14.8, services: [{ service: 'EC2', amountUsd: 2800 }, { service: 'RDS', amountUsd: 1100 }, { service: 'S3', amountUsd: 920 }] },
    { team: 'Data & Analytics', amountUsd: 3610, pct: 23.3, prevAmountUsd: 3100, trend: 16.5, services: [{ service: 'BigQuery', amountUsd: 1800 }, { service: 'Dataflow', amountUsd: 1100 }, { service: 'Cloud Storage', amountUsd: 710 }] },
    { team: 'Product — Core', amountUsd: 2980, pct: 19.3, prevAmountUsd: 2980, trend: 0.0, services: [{ service: 'ECS/Fargate', amountUsd: 1400 }, { service: 'ElastiCache', amountUsd: 880 }, { service: 'SQS', amountUsd: 700 }] },
    { team: 'ML / AI', amountUsd: 1760, pct: 11.4, prevAmountUsd: 1200, trend: 46.7, services: [{ service: 'EC2 GPU', amountUsd: 980 }, { service: 'S3', amountUsd: 500 }, { service: 'SageMaker', amountUsd: 280 }] },
    { team: 'DevOps / CI-CD', amountUsd: 1280, pct: 8.3, prevAmountUsd: 1350, trend: -5.2, services: [{ service: 'CodeBuild', amountUsd: 480 }, { service: 'ECR', amountUsd: 420 }, { service: 'Route53', amountUsd: 380 }] },
    { team: 'Unallocated', amountUsd: 1000, pct: 6.5, prevAmountUsd: 1400, trend: -28.6, services: [{ service: 'Various', amountUsd: 1000 }] },
  ]
}

export function mockExplorer(groupBy: string): { label: string; amountUsd: number; prev: number; region?: string; provider?: string }[] {
  const data: Record<string, { label: string; amountUsd: number; prev: number; region?: string; provider?: string }[]> = {
    service: [
      { label: 'EC2', amountUsd: 3124, prev: 2650, provider: 'aws' },
      { label: 'Compute Engine', amountUsd: 1180, prev: 1020, provider: 'gcp' },
      { label: 'RDS', amountUsd: 890, prev: 840, provider: 'aws' },
      { label: 'BigQuery', amountUsd: 480, prev: 310, provider: 'gcp' },
      { label: 'Virtual Machines', amountUsd: 580, prev: 500, provider: 'azure' },
      { label: 'S3', amountUsd: 260, prev: 230, provider: 'aws' },
      { label: 'Cloud SQL', amountUsd: 310, prev: 290, provider: 'gcp' },
      { label: 'Azure SQL', amountUsd: 320, prev: 280, provider: 'azure' },
      { label: 'ECS/Fargate', amountUsd: 420, prev: 380, provider: 'aws' },
      { label: 'Data Factory', amountUsd: 195, prev: 140, provider: 'azure' },
    ],
    provider: [
      { label: 'AWS', amountUsd: 8950, prev: 7800, provider: 'aws' },
      { label: 'GCP', amountUsd: 4010, prev: 3400, provider: 'gcp' },
      { label: 'Azure', amountUsd: 2440, prev: 2100, provider: 'azure' },
    ],
    region: [
      { label: 'eu-west-1', amountUsd: 5200, prev: 4500, region: 'eu-west-1' },
      { label: 'us-east-1', amountUsd: 3400, prev: 3100, region: 'us-east-1' },
      { label: 'europe-west1', amountUsd: 2800, prev: 2400, region: 'europe-west1' },
      { label: 'us-central1', amountUsd: 1200, prev: 1000, region: 'us-central1' },
      { label: 'West Europe', amountUsd: 2440, prev: 2100, region: 'West Europe' },
      { label: 'global', amountUsd: 360, prev: 300, region: 'global' },
    ],
    account: [
      { label: 'AWS Production', amountUsd: 6200, prev: 5400, provider: 'aws' },
      { label: 'AWS Staging', amountUsd: 2750, prev: 2400, provider: 'aws' },
      { label: 'GCP Core', amountUsd: 4010, prev: 3400, provider: 'gcp' },
      { label: 'Azure Dev', amountUsd: 2440, prev: 2100, provider: 'azure' },
    ],
  }
  return data[groupBy] ?? data['service']
}
