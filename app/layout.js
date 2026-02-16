import { Inter } from 'next/font/google'
import './globals.css'
import SessionWrapper from './components/SessionWrapper'
import { Analytics } from '@vercel/analytics/next'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata = {
  title: 'DashClaw — AI Agent Decision Infrastructure',
  description: 'Prove what your AI agents decided and why. Open-source decision infrastructure with policy enforcement, assumption tracking, and compliance mapping for autonomous AI agents.',
  icons: {
    icon: '/favicon.svg',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#f97316',
}

export default function RootLayout({ children }) {
  const enableAnalytics =
    // Vercel sets this in deployments; keeps self-host/non-Vercel installs from emitting analytics by default.
    process.env.VERCEL === '1' ||
    // Explicit opt-in for non-Vercel hosts.
    process.env.NEXT_PUBLIC_ENABLE_VERCEL_ANALYTICS === 'true'

  return (
    <html lang="en" className={inter.variable}>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#f97316" />
      </head>
      <body className="font-sans antialiased">
        <SessionWrapper>{children}</SessionWrapper>
        {enableAnalytics ? <Analytics /> : null}
      </body>
    </html>
  )
}
