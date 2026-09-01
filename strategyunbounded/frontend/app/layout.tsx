import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, DM_Serif_Display, DM_Mono } from 'next/font/google'
import './globals.css'
import Header from '@/components/Header'

const jakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans',
  display: 'swap',
})

const dmSerifDisplay = DM_Serif_Display({
  subsets: ['latin'],
  weight: ['400'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
})

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Strategy Unbounded',
  description: 'AI-Powered Workshop — Discover AI use cases for your business',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jakartaSans.variable} ${dmSerifDisplay.variable} ${dmMono.variable}`}>
      <body className="bg-page text-text-default min-h-screen">
        <Header />
        <main className="animate-fade-in-up">{children}</main>
      </body>
    </html>
  )
}
