import type { Dim } from './generator.ts'

/**
 * The 6D Profile item bank, lifted verbatim from the Claude Design prototype.
 * Six items per dimension, in dimension order: sa, e, so, se, c, sp.
 */
export const QUESTIONS: { text: string; dim: Dim }[] = [
  { text: 'I look for ways to stretch beyond what is asked of me.', dim: 'sa' },
  { text: 'I have a clear sense of what I want to become.', dim: 'sa' },
  { text: 'I finish things I start, even when the novelty wears off.', dim: 'sa' },
  { text: 'I set my own standards rather than borrow other people’s.', dim: 'sa' },
  { text: 'I would rather do difficult work well than easy work quickly.', dim: 'sa' },
  { text: 'I know my strengths and use them deliberately.', dim: 'sa' },

  { text: 'I notice quickly when something is unfair to me.', dim: 'e' },
  { text: 'I find it hard to let a slight go.', dim: 'e' },
  { text: 'I prefer arrangements that suit me, even if others adjust.', dim: 'e' },
  { text: 'I like being recognised by name for what I contribute.', dim: 'e' },
  { text: 'Criticism stays with me for a while afterwards.', dim: 'e' },
  { text: 'I keep track of what I am owed.', dim: 'e' },

  { text: 'I adjust my own plans to keep a group together.', dim: 'so' },
  { text: 'I notice when someone in a group has gone quiet.', dim: 'so' },
  { text: 'I would rather share credit than hold it.', dim: 'so' },
  { text: 'I speak up for people who are not in the room.', dim: 'so' },
  { text: 'I enjoy work that only makes sense with other people in it.', dim: 'so' },
  { text: 'I check how a decision lands on others before I commit.', dim: 'so' },

  { text: 'I like to know the plan before I begin.', dim: 'se' },
  { text: 'Sudden change unsettles me more than it excites me.', dim: 'se' },
  { text: 'I prefer familiar routes to new ones.', dim: 'se' },
  { text: 'I keep something in reserve in case things go wrong.', dim: 'se' },
  { text: 'I feel steadier when expectations are written down.', dim: 'se' },
  { text: 'I ask for reassurance when the ground shifts.', dim: 'se' },

  { text: 'I am drawn to problems with no obvious answer.', dim: 'c' },
  { text: 'I can hold two opposing ideas at once.', dim: 'c' },
  { text: 'I read around a subject beyond what is required.', dim: 'c' },
  { text: 'I would rather a hard question than a tidy answer.', dim: 'c' },
  { text: 'I look for the pattern underneath the detail.', dim: 'c' },
  { text: 'I change my mind when the evidence changes.', dim: 'c' },

  { text: 'I want my work to mean something beyond myself.', dim: 'sp' },
  { text: 'I think about what I am for, not just what I do.', dim: 'sp' },
  { text: 'Quiet reflection is part of how I decide.', dim: 'sp' },
  { text: 'I feel connected to something larger than my own plans.', dim: 'sp' },
  { text: 'I judge success by more than outcomes.', dim: 'sp' },
  { text: 'I return to questions about purpose often.', dim: 'sp' },
]

export const SCALE = [
  { v: 1, label: 'Not at all like me' },
  { v: 2, label: 'A little like me' },
  { v: 3, label: 'Somewhat like me' },
  { v: 4, label: 'Mostly like me' },
  { v: 5, label: 'Very much like me' },
]

export const PER_PAGE = 6
