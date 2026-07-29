import type { Metadata } from 'next'
import { Lora, Lato, IBM_Plex_Mono } from 'next/font/google'
import { Sidebar } from '@/components/Sidebar'
import './globals.css'

const lora = Lora({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-display' })
const lato = Lato({ subsets: ['latin'], weight: ['400', '700', '900'], variable: '--font-sans' })
const mono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-mono' })

export const metadata: Metadata = {
  title: 'KYKOLOGY · Admin',
  description: 'University admin platform for the KYKOLOGY 6D Profile.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${lora.variable} ${lato.variable} ${mono.variable}`}>
      <body>
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <main className="min-w-0 flex-1 overflow-auto bg-cream">{children}</main>
        </div>
      </body>
    </html>
  )
}
