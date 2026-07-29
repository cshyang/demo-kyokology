'use client'

import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Header, HeaderButton } from '@/components/Header'
import { useDemoData } from '@/lib/data/demo.ts'
import { StudentProfile } from './StudentProfile'

/*
 * Profiles hang off a query param rather than /students/[id].
 *
 * A dynamic segment would need generateStaticParams over all 840 students to
 * survive a static export — tens of megabytes of prerendered HTML for a demo,
 * to serve pages nobody will open more than a handful of. One page plus
 * ?id=S0017 costs nothing and behaves identically.
 */
/**
 * The header names the student, so it has to live inside the Suspense boundary
 * with the search param — a static shell above it could only say "Student profile".
 */
function Profile() {
  const id = useSearchParams().get('id') ?? ''
  const router = useRouter()
  const st = useDemoData().byId[id]
  return (
    <>
      <Header
        title="Student profile"
        sub={st ? `${st.name} · ${st.faculty} · ${st.intakeYear} intake` : 'Individual result · consent on record'}
      >
        <HeaderButton onClick={() => router.push('/people')}>← Back</HeaderButton>
      </Header>
      <StudentProfile id={id} />
    </>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8 text-[13px] text-ink/50">Loading…</div>}>
      <Profile />
    </Suspense>
  )
}
