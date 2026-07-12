import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'VynCost · VynOps Suite', template: '%s | VynCost' },
  description: 'AI-Powered Cloud Cost Optimizer',
  icons: { icon: '/favicon-circle.png', shortcut: '/favicon-circle.png', apple: '/favicon-circle.png' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#0b0f1a] text-slate-100 antialiased">{children}</body>
    </html>
  )
}