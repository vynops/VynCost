import { NextRequest, NextResponse } from 'next/server'

/** Quick credential test — real provider calls in v0.2, mock validation for now */
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { provider } = body

  // Simulate a short connection test
  await new Promise(r => setTimeout(r, 600))

  if (provider === 'aws') {
    if (!body.awsAccessKeyId || !body.awsSecretAccessKey) {
      return NextResponse.json({ ok: false, error: 'Access Key ID and Secret are required' }, { status: 400 })
    }
    // Real: call STS GetCallerIdentity; mock: validate format
    const keyOk = /^AKIA[A-Z0-9]{16}$/.test(body.awsAccessKeyId)
    if (!keyOk) return NextResponse.json({ ok: false, error: 'Access Key format invalid (must start with AKIA...)' }, { status: 400 })
    return NextResponse.json({ ok: true, message: 'AWS credentials look valid. Cost Explorer access will be verified on first sync.' })
  }

  if (provider === 'gcp') {
    if (!body.gcpProjectId) return NextResponse.json({ ok: false, error: 'Project ID required' }, { status: 400 })
    return NextResponse.json({ ok: true, message: `GCP project "${body.gcpProjectId}" accepted. Billing API access verified on first sync.` })
  }

  if (provider === 'azure') {
    if (!body.azureSubscriptionId || !body.azureTenantId) {
      return NextResponse.json({ ok: false, error: 'Subscription ID and Tenant ID required' }, { status: 400 })
    }
    return NextResponse.json({ ok: true, message: 'Azure subscription accepted. Cost Management access verified on first sync.' })
  }

  if (provider === 'oci') {
    if (!body.ociTenancyOcid) return NextResponse.json({ ok: false, error: 'Tenancy OCID required' }, { status: 400 })
    return NextResponse.json({ ok: true, message: 'OCI tenancy accepted. Cost & Usage Reports access verified on first sync.' })
  }

  return NextResponse.json({ ok: false, error: 'Unknown provider' }, { status: 400 })
}
