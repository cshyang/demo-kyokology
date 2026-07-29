import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Your 6D Profile · KYKOLOGY',
  description: 'A 15-minute assessment from your university.',
}

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return children
}
