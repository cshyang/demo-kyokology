'use client'

import { useMemo } from 'react'
import { buildData, type DemoData, type SegmentId } from './generator.ts'

/**
 * This cache is safe ONLY because the data is deterministic and never mutated.
 *
 * Client components still render on the server, so `cached` is shared across
 * requests in the Node process as well as living in the browser. Read-only that
 * is harmless — every caller gets the same bytes it would have generated itself.
 *
 * It stops being harmless the moment anything writes to it. Demo interactions
 * that change state — sending, nudging, editing a template — MUST live in
 * useState, never here. A mutable module-scope object would be shared between
 * every viewer of the deployed demo: two people clicking at once would see each
 * other's changes. That is precisely the problem we cut D1 to avoid, arriving
 * silently and without a database to blame.
 */
let cached: DemoData | null = null

export function useDemoData(): DemoData {
  return useMemo(() => (cached ??= buildData()), [])
}

/** Presentation copy for each segment. Lifted from the prototype; the generator stays pure. */
export const SEGMENT_META: Record<
  SegmentId,
  { rule: string; tone: string; action: string }
> = {
  silent: { rule: 'SOCIO < 35 · SECURITY > 65', tone: 'SHADOW', action: 'Structured role assignment' },
  driven: { rule: 'SELF-ACT > 80 · EGO < 40', tone: 'SHADOW', action: 'Early check-in; workload pacing' },
  explorer: { rule: 'COMPLEXITY > 80 · SECURITY < 35', tone: 'DYNAMIC', action: 'Elective breadth; research placement' },
  fragile: { rule: 'SECURITY < 35 · CPX < 40 · 2026', tone: 'SHADOW', action: 'Orientation follow-up, week 4' },
  adrift: { rule: 'SPIRIT < 30 · SELF-ACT < 45', tone: 'SHADOW', action: 'Values and careers conversation' },
  steady: { rule: 'ALL SIX 35–70', tone: 'HEALTHY', action: 'No action needed' },
  unflagged: { rule: 'NO RULE MATCHED', tone: 'NEUTRAL', action: 'Monitor only' },
}

/** Each student's most recent completed result, or null if they never finished one. */
export function latestResult(data: DemoData, studentId: string) {
  return data.w2[studentId] ?? data.w3[studentId] ?? null
}

export function assessedStudents(data: DemoData) {
  return data.students.filter((st) => latestResult(data, st.id) !== null)
}

export function toCsv(rows: string[][]): string {
  return rows
    .map((r) => r.map((c) => (/[",\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c)).join(','))
    .join('\n')
}
