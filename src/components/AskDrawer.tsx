'use client'

import { useEffect, useRef, useState } from 'react'
import { tint } from '@/lib/color'
import { useAskState, type AskTurn } from '@/lib/ask-state'
import { useDemoData } from '@/lib/data/demo.ts'
import { parseAsk } from '@/lib/data/query-schema.ts'
import { SUGGESTIONS, runQuery } from '@/lib/data/query.ts'
import type { DemoData } from '@/lib/data/generator.ts'

/**
 * Opens the drawer. In the header for the same reason Invite is: it is not one
 * screen's action.
 *
 * It disappears while the drawer is open, which is not just tidiness. The drawer
 * docks rather than floats, so the header loses 400px exactly when this button
 * would be redundant — and with it still there, "Invite someone" wraps to a
 * second row on a 1440px screen. The drawer's own × is the way back.
 */
export function AskButton() {
  const { open, setOpen } = useAskState()
  if (open) return null
  return (
    <button
      onClick={() => setOpen(true)}
      className="flex cursor-pointer items-center gap-[7px] rounded-md bg-white px-[15px] py-[11px] text-[12px] leading-none font-bold text-ink inset-ring inset-ring-ink/18 hover:bg-cream"
    >
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
        <path
          d="M6 .8l1.15 3.05L10.2 5l-3.05 1.15L6 9.2 4.85 6.15 1.8 5l3.05-1.15z"
          fill="currentColor"
        />
        <circle cx="10" cy="9.6" r="1.15" fill="currentColor" />
      </svg>
      Ask
    </button>
  )
}

/**
 * The assistant, docked rather than floating.
 *
 * It squeezes the page instead of covering it, the way Cloudflare's panel does,
 * because the answer is only trustworthy next to the screen it describes —
 * covering the numbers would defeat the point of grounding them.
 */
export function AskDrawer() {
  const { open, setOpen, width, setWidth, turns, pending, ask, clear } = useAskState()
  const data = useDemoData()
  const [draft, setDraft] = useState('')
  const tail = useRef<HTMLDivElement>(null)

  useEffect(() => {
    tail.current?.scrollIntoView({ block: 'end' })
  }, [turns, pending])

  if (!open) return null

  const submit = () => {
    ask(draft)
    setDraft('')
  }

  /**
   * Listeners go on `window`, not the handle, so the drag survives the pointer
   * outrunning a 7px target — which it always does. Width is measured from the
   * right edge because the panel is docked there and the sidebar's own width
   * must not enter the sum.
   */
  const startResize = (e: React.PointerEvent) => {
    e.preventDefault()
    const move = (ev: PointerEvent) => setWidth(window.innerWidth - ev.clientX)
    const stop = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', stop)
      document.body.style.userSelect = ''
    }
    // Without this a drag selects the page text it passes over.
    document.body.style.userSelect = 'none'
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', stop)
  }

  return (
    <aside
      className="relative flex flex-none flex-col border-l border-ink/10 bg-cream"
      /*
       * A dot grid, so the panel reads as a different surface from the page
       * rather than a paler copy of it. Inline because a two-value gradient plus
       * a background-size is exactly the case `tint` exists for — going through
       * the custom property keeps the dots tied to --color-ink instead of
       * freezing a fourth grey into the file.
       */
      style={{
        width,
        backgroundImage: `radial-gradient(${tint('ink', 14)} 1px, transparent 1px)`,
        backgroundSize: '13px 13px',
      }}
    >
      <div
        onPointerDown={startResize}
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize panel"
        className="absolute top-0 left-0 z-10 h-full w-[7px] -translate-x-[3px] cursor-col-resize hover:bg-teal/30"
      />

      <div className="flex h-[70px] flex-none items-center gap-2 border-b border-ink/10 bg-white px-[18px]">
        <span className="text-[13px] leading-none font-bold text-ink">Ask</span>
        <span className="truncate text-[11px] leading-none text-ink/45">grounded in this cohort</span>
        <div className="ml-auto flex flex-none items-center gap-3">
          {turns.length > 0 && (
            <button
              onClick={clear}
              className="cursor-pointer text-[11px] leading-none text-ink/45 hover:text-ink"
            >
              Clear
            </button>
          )}
          <button
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="cursor-pointer text-[15px] leading-none text-ink/45 hover:text-ink"
          >
            ×
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-[18px] py-[16px]">
        {turns.length === 0 ? (
          <div>
            {/* Precise about which half is computed. Explain answers are model
                prose, so the old blanket "nothing here is written by the model"
                stopped being true the moment they were added. */}
            <p className="text-[11.5px] leading-[1.5] text-ink/55">
              Ask who is in this cohort, or how the 6D Profile works. Counts and scores are computed
              from the same data the screens use — the model never supplies a figure.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => ask(s)}
                  className="cursor-pointer rounded-md bg-white px-3 py-[9px] text-left text-[11.5px] leading-[1.35] text-ink inset-ring inset-ring-ink/12 hover:bg-vellum"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {turns.map((t) => (
              <Turn key={t.id} turn={t} data={data} />
            ))}
          </div>
        )}
        {pending && <p className="mt-4 text-[11px] text-ink/45">Working…</p>}
        <div ref={tail} />
      </div>

      {/* One composer surface with the button inside it, so the input reads as a
          single control rather than a field with an appliance bolted alongside. */}
      <div className="flex-none border-t border-ink/10 p-[14px]">
        <div className="rounded-lg bg-white inset-ring inset-ring-ink/18 focus-within:inset-ring-teal/45">
          <textarea
            value={draft}
            rows={2}
            placeholder="Show me students who…"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                submit()
              }
            }}
            className="block w-full resize-none bg-transparent px-3 pt-2.5 pb-1 text-[12px] leading-[1.4] text-ink outline-none placeholder:text-ink/35"
          />
          <div className="flex items-center justify-end px-2 pb-2">
            <button
              onClick={submit}
              disabled={pending || !draft.trim()}
              aria-label="Ask"
              className="flex size-[27px] cursor-pointer items-center justify-center rounded-full bg-brass text-ink hover:opacity-90 disabled:cursor-default disabled:opacity-30"
            >
              <svg width="13" height="13" viewBox="0 0 13 13" aria-hidden>
                <path
                  d="M6.5 10.6V2.9M3.3 6.1l3.2-3.2 3.2 3.2"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}

/**
 * The question is a short right-aligned bubble; the answer is a full-width card.
 *
 * Asymmetric on purpose. A question is an utterance and sizes to its content; an
 * answer is a panel of evidence — a rule, a count, a list of people — and reads
 * as one object when it has an edge around it. The label names who is speaking
 * without the card having to look like speech.
 *
 * Teal, not brass: the label is 9.5px, and `globals.css` is explicit that the
 * palette's paler swatches are fills only. Brass lands near 2:1 on white, which
 * this codebase already rules out for text.
 */
function Turn({ turn, data }: { turn: AskTurn; data: DemoData }) {
  return (
    <div>
      <div className="flex justify-end">
        <p className="max-w-[86%] rounded-xl rounded-br-sm bg-ink/8 px-[11px] py-[7px] text-[12px] leading-[1.4] text-ink">
          {turn.question}
        </p>
      </div>
      <div className="mt-2.5 rounded-lg bg-white px-[13px] py-[11px] inset-ring inset-ring-ink/10">
        <p className="mb-2 font-mono text-[9.5px] leading-none tracking-[.09em] text-teal uppercase">
          Ask
        </p>
        <Answer turn={turn} data={data} />
      </div>
    </div>
  )
}

function Answer({ turn, data }: { turn: AskTurn; data: DemoData }) {
  if (turn.error) return <Note>{turn.error}</Note>
  if (!turn.json) return null

  const parsed = parseAsk(turn.json)

  /*
   * One message for every failure, with the technical reason on hover.
   *
   * "not valid JSON" is true and completely useless to a dean — and it appeared
   * on screen during testing, which is exactly where it must not. The reason
   * still reaches whoever is debugging, via `title`.
   */
  if (!parsed.ok) {
    return (
      <Note title={parsed.reason}>
        I can only answer about this cohort or about the 6D Profile itself. Try asking for a list
        of students, or what one of the six dimensions measures.
      </Note>
    )
  }

  if (parsed.kind === 'explain') return <Prose text={parsed.say} />

  // Re-run on every render rather than stored with the turn, so a rehydrated
  // answer reflects the cohort as it is now.
  const result = runQuery(data, parsed.spec)

  return (
    <div>
      {parsed.say && (
        <div className="mb-2">
          <Prose text={parsed.say} />
        </div>
      )}
      <p className="font-mono text-[9.5px] leading-[1.4] tracking-[.06em] text-ink/45">{result.rule}</p>
      <p className="mt-1.5 text-[12px] leading-[1.4] text-ink">
        <span className="font-bold">{result.total}</span>
        {result.total === 1 ? ' student' : ' students'}
        {result.rows.length < result.total && (
          <span className="text-ink/45"> · showing {result.rows.length}</span>
        )}
      </p>

      {result.total === 0 ? (
        <Note>Nothing matched that.</Note>
      ) : (
        <ul className="mt-2">
          {result.rows.map((row) => (
            <Row key={row.id} columns={result.columns} cells={row.cells} />
          ))}
        </ul>
      )}
    </div>
  )
}

/**
 * Stacked rather than tabulated. Four columns of a table do not fit 400px, and
 * "Orientation follow-up, week 4" is a sentence, not a cell — a table here
 * clips exactly the part that makes the answer actionable.
 *
 * Divided, not carded: these now sit inside the white response card, where a
 * second white surface would read as a seam rather than a row.
 */
function Row({ columns, cells }: { columns: readonly string[]; cells: string[] }) {
  const at = (name: string) => {
    const i = columns.indexOf(name)
    return i < 0 ? null : cells[i]
  }
  const name = at('name')
  const action = at('action')
  const meta = columns
    .map((c, i) => (c === 'name' || c === 'action' ? null : cells[i]))
    .filter((v): v is string => v !== null && v !== '—')

  return (
    <li className="border-t border-ink/8 py-[7px] first:border-t-0 first:pt-0">
      {name && <p className="text-[11.5px] leading-[1.3] font-bold text-ink">{name}</p>}
      {meta.length > 0 && (
        <p className="mt-0.5 text-[10.5px] leading-[1.35] text-ink/55">{meta.join(' · ')}</p>
      )}
      {action && action !== '—' && (
        <p className="mt-1 text-[10.5px] leading-[1.35] text-teal">{action}</p>
      )}
    </li>
  )
}

/**
 * Enough Markdown for what the model actually emits: bold, italic, inline code,
 * bullet and numbered lists, and headings flattened to bold lines.
 *
 * Hand-rolled rather than `react-markdown`, which would put four runtime
 * packages into a repo that has three, to format at most four sentences. The
 * important part is that it builds React elements and never touches
 * `dangerouslySetInnerHTML` — this text arrives from an external API, so
 * rendering it as HTML would be an injection hole for the sake of italics.
 */
/*
 * `_underscore_` emphasis is deliberately absent. Supporting it turned
 * `snake_case_word` into "snake·case·word", and a renderer whose only job is to
 * not mangle text should not introduce a way to mangle text. `*italic*` covers
 * the case at no risk.
 */
const INLINE = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*\n]+\*)/g
const BULLET = /^\s*([-*•]|\d+[.)])\s+/

function inline(text: string) {
  return text
    .split(INLINE)
    .filter((p) => p !== '')
    .map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**'))
        return (
          <strong key={i} className="font-bold">
            {part.slice(2, -2)}
          </strong>
        )
      if (part.startsWith('`') && part.endsWith('`'))
        return (
          <code key={i} className="font-mono text-[11px]">
            {part.slice(1, -1)}
          </code>
        )
      if (part.length > 2 && part.startsWith('*') && part.endsWith('*'))
        return <em key={i}>{part.slice(1, -1)}</em>
      return part
    })
}

function Prose({ text }: { text: string }) {
  const blocks = text.trim().split(/\n{2,}/)
  return (
    <div className="flex flex-col gap-2 text-[12px] leading-[1.55] text-ink/80">
      {blocks.map((block, bi) => {
        const lines = block.split('\n').filter((l) => l.trim() !== '')
        if (lines.length > 0 && lines.every((l) => BULLET.test(l))) {
          return (
            <ul key={bi} className="flex flex-col gap-1 pl-[15px]">
              {lines.map((l, li) => (
                <li key={li} className="list-disc">
                  {inline(l.replace(BULLET, ''))}
                </li>
              ))}
            </ul>
          )
        }
        const heading = block.match(/^#{1,4}\s+(.+)$/)
        if (heading)
          return (
            <p key={bi} className="font-bold text-ink">
              {inline(heading[1])}
            </p>
          )
        // Single newlines inside a paragraph are wrapping, not structure.
        return <p key={bi}>{inline(block.replace(/\s*\n\s*/g, ' '))}</p>
      })}
    </div>
  )
}

const Note = ({ children, title }: { children: React.ReactNode; title?: string }) => (
  <p title={title} className="text-[11.5px] leading-[1.45] text-ink/55">
    {children}
  </p>
)
