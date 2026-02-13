import { Inter } from 'next/font/google'
import './globals.css'
import SessionWrapper from './components/SessionWrapper'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata = {
  title: 'DashClaw — AI Agent Observability',
  description: 'See what your AI agents are actually doing. Real-time observability, risk signals, and operational control for autonomous AI agents.',
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
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#f97316" />
      </head>
      <body className="font-sans antialiased">
        <SessionWrapper>{children}</SessionWrapper>
      </body>
    </html>
  )
}
