import { NextResponse } from 'next/server'
import { getUsageToday, getUsageLast7Days } from '@/lib/copilot-usage'

export async function GET() {
  return NextResponse.json({
    today: getUsageToday(),
    last7Days: getUsageLast7Days(),
  })
}
