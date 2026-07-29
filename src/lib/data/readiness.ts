import type { Dim } from './generator.ts'

/**
 * The educator half of "one framework, two views".
 *
 * Four facet bundles plus the pressure model. Bundle composition was measured,
 * not guessed: `facetsOf` derives facets FROM the dimension score and re-centres
 * them on it, so a bundle drawn from one dimension is that dimension renamed.
 * Leadership therefore spans three dimensions (0.69 against its closest) rather
 * than leaning on Egocentricity, whose platform meaning is grievance where the
 * printed report's is agency. Team compatibility deliberately does not span: it
 * correlates 0.98 with Sociocentricity because it honestly IS sociocentricity,
 * and manufacturing independence would be inventing a construct to look tidy.
 *
 * Every tile prints its own facet names, so this is disclosed on screen rather
 * than buried here. See the spec's §3.2.
 */
export interface Read {
  key: string
  name: string
  /** Plain-language gloss, used where a tile has no facet list to show. */
  blurb: string
  /** null marks the pressure read, which is a swing magnitude, not a score. */
  facets: readonly (readonly [Dim, string])[] | null
}

export const READS: readonly Read[] = [
  {
    key: 'lead',
    name: 'Leadership potential',
    blurb: 'Taking charge, carrying other people, and finishing what was started.',
    facets: [
      ['e', 'Lead & Take Charge'],
      ['c', 'Inspiring & Influencing'],
      ['sa', 'Achievement & Results'],
    ],
  },
  {
    key: 'team',
    name: 'Team compatibility & dynamics',
    blurb: 'How readily a student works through other people rather than around them.',
    facets: [
      ['so', 'Collaboration & Teamwork'],
      ['so', 'Empathy & Understanding'],
      ['so', 'Human & Interpersonal Relationships'],
    ],
  },
  {
    key: 'resil',
    name: 'Emotional resilience',
    blurb: 'Holding steady when the work gets hard and the ground moves.',
    facets: [
      ['e', 'Persistence & Mental Toughness'],
      ['sp', 'Inner Peace & Harmony'],
      ['c', 'Adaptability & Flexibility'],
    ],
  },
  {
    key: 'work',
    name: 'Workplace readiness',
    blurb: 'Delivering to a standard, on a deadline, with the reasoning shown.',
    facets: [
      ['sa', 'Achievement & Results'],
      ['se', 'Meticulous, Precision & Accuracy'],
      ['c', 'Analytical & Strategic Thinking'],
    ],
  },
  {
    key: 'press',
    name: 'Behaviour under pressure',
    blurb: 'The widest shift a student shows when a situation stops being controlled.',
    facets: null,
  },
] as const
