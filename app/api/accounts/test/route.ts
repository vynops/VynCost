import { NextRequest, NextResponse } from 'next/server'
import { ociTestConnection, ociHasCredentials } from '@/lib/oci-live'
import type { CloudAccount } from '@/lib/account-store'

/** Quick credential test — real OCI call; mock validation for AWS/GCP/Azure */
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { provider } = body

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
    if (!body.ociTenancyOcid || !body.ociUserOcid || !body.ociFingerprint || !body.ociPrivateKey || !body.ociRegion) {
      return NextResponse.json({ ok: false, error: 'Tenancy OCID, User OCID, Fingerprint, Private Key, and Region are all required' }, { status: 400 })
    }
    const fakeAcct = body as unknown as CloudAccount
    const result = await ociTestConnection(fakeAcct)
    return NextResponse.json(result, { status: result.ok ? 200 : 400 })
  }

  return NextResponse.json({ ok: false, error: 'Unknown provider' }, { status: 400 })
}
