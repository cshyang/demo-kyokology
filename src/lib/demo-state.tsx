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

const DEFAULT_TEMPLATES: Record<TemplateKind, Template> = {
  invite: {
    subject: 'Your KYKOLOGY 6D Profile — 15 minutes, {{student_name}}',
    body: `Hi {{student_name}},

Your faculty is running the {{test_name}} this term. It takes about 15 minutes and there are no right answers.

Your results are shared with your institution so we can point support and opportunities at the right people. You can see your own profile as soon as you finish.

Deadline: {{deadline}}

— Student Services`,
  },
  reminder: {
    subject: 'Still open: {{test_name}} closes {{deadline}}',
    body: `Hi {{student_name}},

You haven't started the {{test_name}} yet. It takes about 15 minutes and it closes on {{deadline}}.

If you started and got interrupted, your link picks up where you left off.

— Student Services`,
  },
  thanks: {
    subject: 'Your 6D Profile is ready',
    body: `Hi {{student_name}},

Thanks for completing the {{test_name}}. Your profile is ready to view.

Nothing here is a verdict — it is a description of how you tend to operate, and it changes.

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
  resetTemplates: () => void
}

const Ctx = createContext<DemoState | null>(null)

export function DemoStateProvider({ children }: { children: React.ReactNode }) {
  const [newPeople, setNewPeople] = useState<NewPerson[]>([])
  const [newCampaigns, setNewCampaigns] = useState<NewCampaign[]>([])
  const [templates, setTemplates] = useState(DEFAULT_TEMPLATES)

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
      resetTemplates: () => setTemplates(DEFAULT_TEMPLATES),
    }),
    [newPeople, newCampaigns, templates],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useDemoState() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useDemoState must be used inside DemoStateProvider')
  return ctx
}

export { DEFAULT_TEMPLATES }
