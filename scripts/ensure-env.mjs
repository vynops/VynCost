import { randomBytes } from 'node:crypto'
import { existsSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const envPath = join(process.cwd(), '.env.local')

if (existsSync(envPath)) {
  console.log('.env.local already exists; keeping existing configuration.')
} else {
  const contents = [
    '# Generated automatically by VynCost. Do not commit this file.',
    `VYNCOST_SECRET=${randomBytes(32).toString('base64')}`,
    'VYNCOST_ADMIN_EMAIL=admin@vyncost.local',
    'VYNCOST_ADMIN_PASSWORD=changeme',
    '',
  ].join('\n')

  try {
    writeFileSync(envPath, contents, { encoding: 'utf8', flag: 'wx', mode: 0o600 })
    console.log('Created .env.local with a generated session secret and bootstrap admin account.')
  } catch (error) {
    if (error?.code === 'EEXIST') {
      console.log('.env.local was created by another process; keeping existing configuration.')
    } else {
      throw error
    }
  }
}