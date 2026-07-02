/**
 * Azure simulation — mirrors Azure Cost Management API response shapes.
 * Uses Subscription → Resource Group → Resource hierarchy.
 */

import { createRng, hashSeed, seededRand, seededPick, buildDailyTrend } from '@/lib/simulation/seed'
import type { ServiceCost, Recommendation, WasteItem, AllocationRow } from '@/lib/mock-data'

const AZURE_REGIONS = ['West Europe','North Europe','East US','East US 2','Southeast Asia','UK South']

const AZURE_SERVICES: { name: string; baseUsd: number }[] = [
  { name: 'Virtual Machines',   baseUsd: 620  },
  { name: 'Azure SQL',          baseUsd: 340  },
  { name: 'Blob Storage',       baseUsd: 175  },
  { name: 'AKS',                baseUsd: 380  },
  { name: 'Azure Functions',    baseUsd: 88   },
  { name: 'Data Factory',       baseUsd: 195  },
  { name: 'Azure Monitor',      baseUsd: 72   },
  { name: 'Azure Cosmos DB',    baseUsd: 290  },
  { name: 'Azure Cache (Redis)',baseUsd: 135  },
  { name: 'Bandwidth',          baseUsd: 165  },
  { name: 'Azure DevOps',       baseUsd: 55   },
  { name: 'App Service',        baseUsd: 110  },
]

const AZURE_VM_SIZES = ['Standard_D2s_v3','Standard_D4s_v3','Standard_D8s_v3','Standard_E4s_v3','Standard_B2ms','Standard_F8s_v2']

export function azureServiceCosts(accountId: string, accountName: string): ServiceCost[] {
  const rng = createRng(hashSeed(`${accountId}:azure:services`))
  return AZURE_SERVICES.map(s => ({
    service: s.name,
    provider: 'azure' as const,
    accountId,
    accountName,
    amountUsd: seededRand(rng, s.baseUsd * 0.78, s.baseUsd * 1.28),
    trend:     seededRand(rng, -14, 30),
    region:    seededPick(rng, AZURE_REGIONS),
  }))
}

export function azureDailyTrend(accountId: string) {
  const rng = createRng(hashSeed(`${accountId}:azure:anomaly`))
  const anomalyDay = Math.floor(rng() * 16) + 5
  return buildDailyTrend(accountId + ':azure', 185, anomalyDay)
}

export function azureRecommendations(accountId: string, accountName: string): Recommendation[] {
  const rng    = createRng(hashSeed(`${accountId}:azure:recs`))
  const region = seededPick(rng, AZURE_REGIONS)
  const vmSize = seededPick(rng, AZURE_VM_SIZES)
  const subId  = `sub-${hashSeed(accountId).toString(16).slice(0,8)}`
  const rgName = `rg-${accountName.toLowerCase().replace(/\s+/g,'-').slice(0,12)}`
  const vmName = `vm-${hashSeed(accountId + 'vm').toString(16).slice(0,6)}`
  const diskId = `/subscriptions/${subId}/resourceGroups/${rgName}/providers/Microsoft.Compute/disks/old-os-disk`

  return [
    {
      id: `az-rec-001-${accountId}`,
      provider: 'azure', accountId, accountName,
      resourceId: `/subscriptions/${subId}/resourceGroups/${rgName}/providers/Microsoft.Compute/virtualMachines/${vmName}`,
      resourceName: vmName,
      resourceType: 'Azure Virtual Machine', region,
      issue: `Dev VM running overnight — CPU 0% from 8pm–8am on weekdays`,
      currentConfig: `${vmSize} 24/7`,
      currentCostPerMonth: seededRand(rng, 110, 200),
      recommendedConfig: 'Auto-shutdown 8pm–8am via Azure DevTest policy',
      optimisedCostPerMonth: seededRand(rng, 55, 100),
      savingsPerMonth: seededRand(rng, 55, 100),
      savingsPercent: seededRand(rng, 44, 54),
      risk: 'Low', confidence: seededRand(rng, 93, 98, 0) as unknown as number,
      applyCommand: `az vm auto-shutdown -g ${rgName} -n ${vmName} --time 2000`,
      status: 'open', category: 'idle',
    },
    {
      id: `az-rec-002-${accountId}`,
      provider: 'azure', accountId, accountName,
      resourceId: diskId,
      resourceName: 'old-os-disk',
      resourceType: 'Azure Managed Disk', region,
      issue: `Unattached Premium SSD — VM was deleted ${seededRand(rng,10,30,0)} days ago`,
      currentConfig: `${seededRand(rng,128,512,0)}GB Premium SSD`,
      currentCostPerMonth: seededRand(rng, 40, 110),
      recommendedConfig: 'Delete disk or downgrade to Standard HDD',
      optimisedCostPerMonth: 0,
      savingsPerMonth: seededRand(rng, 40, 110),
      savingsPercent: 100,
      risk: 'Low', confidence: seededRand(rng, 95, 99, 0) as unknown as number,
      applyCommand: `az disk delete --ids ${diskId} --yes`,
      status: 'open', category: 'storage',
    },
    {
      id: `az-rec-003-${accountId}`,
      provider: 'azure', accountId, accountName,
      resourceId: `/subscriptions/${subId}/resourceGroups/${rgName}/providers/Microsoft.Sql/servers/sqlsvr/databases/sqldb`,
      resourceName: 'sqldb',
      resourceType: 'Azure SQL Database', region,
      issue: `DTU utilisation avg ${seededRand(rng,5,15,1)}% — overprovisioned tier`,
      currentConfig: 'Premium P2 (250 DTU)',
      currentCostPerMonth: seededRand(rng, 460, 620),
      recommendedConfig: 'Standard S4 (200 DTU)',
      optimisedCostPerMonth: seededRand(rng, 150, 200),
      savingsPerMonth: seededRand(rng, 280, 440),
      savingsPercent: seededRand(rng, 58, 72),
      risk: 'Medium', confidence: seededRand(rng, 82, 92, 0) as unknown as number,
      applyCommand: `az sql db update -g ${rgName} -s sqlsvr -n sqldb --edition Standard --capacity 200`,
      status: 'open', category: 'rightsize',
    },
  ]
}

export function azureWaste(accountId: string, accountName: string): WasteItem[] {
  const rng    = createRng(hashSeed(`${accountId}:azure:waste`))
  const region = seededPick(rng, AZURE_REGIONS)
  const subId  = `sub-${hashSeed(accountId).toString(16).slice(0,8)}`
  const rgName = `rg-${accountName.toLowerCase().replace(/\s+/g,'-').slice(0,12)}`
  const diskId = `disk-${hashSeed(accountId + 'disk').toString(16).slice(0,6)}`
  const pipId  = `pip-${hashSeed(accountId + 'pip').toString(16).slice(0,4)}`

  return [
    { id: `az-w1-${accountId}`, provider: 'azure', accountId, accountName, resourceId: `/subscriptions/${subId}/resourceGroups/${rgName}/disks/${diskId}`, resourceName: diskId, resourceType: 'Managed Disk', region, reason: `Unattached managed disk — VM deleted ${seededRand(rng,10,40,0)} days ago`, costPerDay: seededRand(rng,1.2,4.0), idleSinceDays: seededRand(rng,10,40,0) as unknown as number, status: 'open' },
    { id: `az-w2-${accountId}`, provider: 'azure', accountId, accountName, resourceId: `/subscriptions/${subId}/resourceGroups/${rgName}/publicIPAddresses/${pipId}`, resourceName: pipId, resourceType: 'Public IP Address', region, reason: 'Static IP not associated with any resource', costPerDay: 0.30, idleSinceDays: seededRand(rng,14,45,0) as unknown as number, status: 'open' },
    { id: `az-w3-${accountId}`, provider: 'azure', accountId, accountName, resourceId: `/subscriptions/${subId}/resourceGroups/${rgName}/loadBalancers/lb-old`, resourceName: 'lb-old', resourceType: 'Load Balancer', region, reason: `Empty backend pool — no VMs attached for ${seededRand(rng,15,35,0)} days`, costPerDay: 0.48, idleSinceDays: seededRand(rng,15,35,0) as unknown as number, status: 'open' },
  ]
}

export function azureMonthlyCost(accountId: string): number {
  const services = azureServiceCosts(accountId, '')
  return parseFloat(services.reduce((s, c) => s + c.amountUsd, 0).toFixed(2))
}

export function azureAllocation(accountId: string): AllocationRow[] {
  const rng    = createRng(hashSeed(`${accountId}:azure:alloc`))
  const teams  = ['Product Engineering','DevOps','Data','Security','Unallocated']
  const shares = [0.38, 0.22, 0.20, 0.12, 0.08]
  const total  = azureMonthlyCost(accountId)
  return teams.map((team, i) => {
    const amt  = parseFloat((total * shares[i] * seededRand(rng, 0.9, 1.1)).toFixed(2))
    const prev = parseFloat((amt * seededRand(rng, 0.82, 1.18)).toFixed(2))
    return {
      team, amountUsd: amt, pct: parseFloat(((amt / total) * 100).toFixed(1)),
      prevAmountUsd: prev, trend: parseFloat((((amt - prev) / prev) * 100).toFixed(1)),
      services: [
        { service: 'Virtual Machines', amountUsd: parseFloat((amt * 0.48).toFixed(2)) },
        { service: 'Azure SQL',        amountUsd: parseFloat((amt * 0.32).toFixed(2)) },
        { service: 'Blob Storage',     amountUsd: parseFloat((amt * 0.20).toFixed(2)) },
      ],
    }
  })
}
