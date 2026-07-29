'use client'

import { createContext, useContext, useMemo, useState } from 'react'

/**
 * Every mutation the demo allows lives here, in React state.
 *
 * NOT in a module-scope object: client components render on the server too, so
 * a module-level mutable store would be shared across every viewer of the
 * deployed demo — two people clicking at once would see each other's imports
 * and campaigns. Context is per-render-tree, so it cannot leak that way.
 *
 * State resets on reload, which is the correct behaviour for a pitch demo: the
 * next meeting starts clean without anyone remembering to reset it.
 */
export interface NewPerson {
  id: string
  name: string
  email: string
  faculty: string
  intakeYear: number
}

export interface NewCampaign {
  id: string
  name: string
  audience: string
  size: number
  sentLabel: string
}

export interface Template {
  subject: string
  body: string
}

export type TemplateKind = 'invite' | 'reminder' | 'thanks'

/*
 * Verbatim from the design project. {{test_name}} resolves to "the KYKOLOGY 6D
 * Profile" — article included — so the copy must not supply its own "the", or
 * the preview reads "running the the KYKOLOGY 6D Profile".
 */
const DEFAULT_TEMPLATES: Record<TemplateKind, Template> = {
  invite: {
    subject: 'Your KYKOLOGY 6D Profile — 15 minutes, {{student_name}}',
    body: `Hi {{student_name}},

Your faculty is running {{test_name}} this term. It takes about 15 minutes and there are no right answers.

Your results are shared with your institution so we can point support and opportunities at the right people. You can see your own profile as soon as you finish.

Deadline: {{deadline}}

— Student Services`,
  },
  reminder: {
    subject: 'Still open: {{test_name}} closes {{deadline}}',
    body: `Hi {{student_name}},

You haven't started {{test_name}} yet. It's 15 minutes, and it closes on {{deadline}}.

If you started and got interrupted, the link picks up where you left off.

— Student Services`,
  },
  thanks: {
    subject: 'Thanks, {{student_name}} — your profile is ready',
    body: `Hi {{student_name}},

That's {{test_name}} done. Your profile is ready whenever you want to look at it.

Nothing here is a fixed label. Behaviour moves — this is a starting point for a conversation with your tutor.

— Student Services`,
  },
}

interface DemoState {
  newPeople: NewPerson[]
  addPeople: (people: Omit<NewPerson, 'id'>[]) => void
  newCampaigns: NewCampaign[]
  addCampaign: (c: Omit<NewCampaign, 'id'>) => string
  templates: Record<TemplateKind, Template>
  setTemplate: (kind: TemplateKind, next: Template) => void
  /**
   * The invite modal is rendered once, in the header, but opened from two places:
   * the header button and every row of the People directory (prefilled with that
   * person's address). So its open state lives here rather than inside the modal.
   */
  invite: { open: boolean; email: string }
  openInvite: (email?: string) => void
  closeInvite: () => void
  setInviteEmail: (email: string) => void
}

const Ctx = createContext<DemoState | null>(null)

export function DemoStateProvider({ children }: { children: React.ReactNode }) {
  const [newPeople, setNewPeople] = useState<NewPerson[]>([])
  const [newCampaigns, setNewCampaigns] = useState<NewCampaign[]>([])
  const [templates, setTemplates] = useState(DEFAULT_TEMPLATES)
  const [invite, setInvite] = useState({ open: false, email: '' })

  const value = useMemo<DemoState>(
    () => ({
      newPeople,
      addPeople: (people) =>
        setNewPeople((prev) => [
          ...prev,
          ...people.map((p, i) => ({ ...p, id: `N${String(prev.length + i + 1).padStart(4, '0')}` })),
        ]),
      newCampaigns,
      addCampaign: (c) => {
        const id = `D${newCampaigns.length + 1}`
        setNewCampaigns((prev) => [...prev, { ...c, id }])
        return id
      },
      templates,
      setTemplate: (kind, next) => setTemplates((prev) => ({ ...prev, [kind]: next })),
      invite,
      openInvite: (email = '') => setInvite({ open: true, email }),
      closeInvite: () => setInvite({ open: false, email: '' }),
      setInviteEmail: (email) => setInvite((prev) => ({ ...prev, email })),
    }),
    [newPeople, newCampaigns, templates, invite],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useDemoState() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useDemoState must be used inside DemoStateProvider')
  return ctx
}

export { DEFAULT_TEMPLATES }
