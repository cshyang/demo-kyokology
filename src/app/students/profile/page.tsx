'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Header } from '@/components/Header'
import { StudentProfile } from './StudentProfile'

/*
 * Profiles hang off a query param rather than /students/[id].
 *
 * A dynamic segment would need generateStaticParams over all 840 students to
 * survive a static export — tens of megabytes of prerendered HTML for a demo,
 * to serve pages nobody will open more than a handful of. One page plus
 * ?id=S0017 costs nothing and behaves identically.
 */
function Profile() {
  const id = useSearchParams().get('id') ?? ''
  return <StudentProfile id={id} />
}

export default function Page() {
  return (
    <>
      <Header title="Student profile" sub="Individual result · consent on record" />
      <Suspense fallback={<div className="p-8 text-[13px] text-ink/50">Loading…</div>}>
        <Profile />
      </Suspense>
    </>
  )
}
