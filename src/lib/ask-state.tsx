'use client'

import { usePathname } from 'next/navigation'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

/**
 * The assistant's transcript, which survives a reload and a page change.
 *
 * This is the one piece of demo state that persists, and it is a deliberate
 * exception to the rule stated in `demo-state.tsx` — that everything resets on
 * reload so the next meeting starts clean. `sessionStorage`, not
 * `localStorage`, is what makes both true at once: the thread survives a
 * refresh and a navigation, and dies when the tab closes.
 *
 * What is stored is the question and the model's spec — never the rendered
 * rows. A rehydrated turn re-runs against the live cohort, so an answer cannot
 * disagree with the screen it comes back to, even if the filter moved.
 */
export interface AskTurn {
  id: string
  question: string
  /** Raw JSON from the model, replayed through `parseQuery` on every render. */
  json?: string
  /** Transport or model failure, as opposed to a question that cannot be expressed. */
  error?: string
}

interface AskState {
  open: boolean
  setOpen: (open: boolean) => void
  /** Drawer width in px, dragged by the handle on its left edge. */
  width: number
  setWidth: (width: number) => void
  turns: AskTurn[]
  pending: boolean
  ask: (question: string) => void
  clear: () => void
}

const Ctx = createContext<AskState | null>(null)

const STORAGE_KEY = 'kyk.ask'

export const MIN_WIDTH = 320
export const MAX_WIDTH = 760
export const DEFAULT_WIDTH = 400

export const clampWidth = (w: number) => Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round(w)))

/**
 * `/api/ask` in production. The override exists because `output: 'export'`
 * forbids route handlers, so local development runs two servers — `next dev`
 * for the UI and `wrangler dev` for this endpoint.
 *
 * Set it in `.env.development.local`, never `.env.local`: `NEXT_PUBLIC_*` is
 * inlined at build time and `next build` reads `.env.local` too, so a stray
 * localhost value there ships a demo that calls the presenter's own laptop.
 */
const API = process.env.NEXT_PUBLIC_ASK_API ?? '/api/ask'

/**
 * Which screen the question was asked from, sent as orientation so "who is
 * weakest here?" resolves against what is on screen. Deliberately not a filter:
 * the assistant may still answer about any faculty, wave or part of the
 * instrument, whatever page it was asked from.
 *
 * The live faculty/intake/wave values are not included yet — those live in each
 * page's own `useState`, so passing them needs the filter lifted into shared
 * state. The route alone already resolves most vague references.
 */
const SCREENS: Record<string, string> = {
  '/overview': 'Overview — enrolment and assessment progress',
  '/fingerprint': 'Fingerprint — the six-dimension cohort averages',
  '/segments': 'Segments — recurring behavioural patterns and who is flagged',
  '/readiness': 'Readiness — the five educator reads as band distributions',
  '/longitudinal': 'Longitudinal — how the cohort has moved between waves',
  '/campaigns': 'Campaigns — assessment invitations and their funnels',
  '/people': 'People — the student directory',
  '/templates': 'Templates — the invitation and reminder emails',
  '/students/profile': "Profile — one student's full 6D report",
  '/t': "Student link — what one student sees when they open their invite",
}

export function AskStateProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [width, setWidthRaw] = useState(DEFAULT_WIDTH)
  const [turns, setTurns] = useState<AskTurn[]>([])
  const [pending, setPending] = useState(false)
  /**
   * Client components still prerender during `next build`, where there is no
   * `sessionStorage`. Reading it after mount rather than during the first
   * render is what keeps the export from throwing.
   */
  const [rehydrated, setRehydrated] = useState(false)

  /**
   * Read through a ref so `ask` keeps a stable identity across navigation. As a
   * dependency it would rebuild the callback on every route change, and with it
   * the context value, re-rendering every consumer for nothing.
   */
  const pathname = usePathname()
  const screen = useRef('')
  screen.current = SCREENS[pathname ?? ''] ?? ''

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY)
      if (raw) {
        const saved = JSON.parse(raw) as { open?: boolean; width?: number; turns?: AskTurn[] }
        if (saved.open) setOpen(true)
        // Clamped on the way in as well as out: a stored width from a wider
        // monitor should not leave the panel wider than this screen.
        if (typeof saved.width === 'number') setWidthRaw(clampWidth(saved.width))
        if (Array.isArray(saved.turns)) setTurns(saved.turns)
      }
    } catch {
      // A malformed or blocked store is not worth breaking the page over.
    }
    setRehydrated(true)
  }, [])

  useEffect(() => {
    if (!rehydrated) return
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ open, width, turns }))
    } catch {
      // Private-mode quota. The thread still works for this page view.
    }
  }, [rehydrated, open, width, turns])

  const ask = useCallback((question: string) => {
    const q = question.trim()
    if (!q) return
    const id = crypto.randomUUID()
    setTurns((prev) => [...prev, { id, question: q }])
    setPending(true)

    const settle = (patch: Partial<AskTurn>) => {
      setTurns((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))
      setPending(false)
    }

    fetch(API, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ question: q, context: screen.current }),
    })
      .then(async (res) => {
        // Read as text first. Anything between the browser and the Worker — a
        // Cloudflare error page, a reloading `wrangler dev` — answers with HTML
        // or plain text, and `res.json()` on that reports a parse error at the
        // presenter instead of saying the assistant is unreachable.
        const raw = await res.text()
        let body: { json?: string; error?: string } = {}
        try {
          body = JSON.parse(raw) as typeof body
        } catch {
          throw new Error(
            res.ok ? 'The assistant sent something unreadable' : `Assistant unavailable (${res.status})`,
          )
        }
        if (!res.ok || !body.json) throw new Error(body.error ?? `Request failed (${res.status})`)
        settle({ json: body.json })
      })
      .catch((err: unknown) => {
        settle({ error: err instanceof Error ? err.message : 'Could not reach the assistant' })
      })
  }, [])

  const clear = useCallback(() => setTurns([]), [])
  const setWidth = useCallback((w: number) => setWidthRaw(clampWidth(w)), [])

  const value = useMemo<AskState>(
    () => ({ open, setOpen, width, setWidth, turns, pending, ask, clear }),
    [open, width, setWidth, turns, pending, ask, clear],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAskState() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAskState must be used inside AskStateProvider')
  return ctx
}
