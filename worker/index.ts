/**
 * The only server in this project, and it holds no product logic.
 *
 * It exists for one reason: an API key cannot live in a static bundle. It takes
 * a question, asks the model to translate it into a `QuerySpec`, and hands the
 * JSON back. It never sees a student, never computes a figure, and keeps no
 * state — so the cohort never crosses the network and swapping model provider
 * is a base URL and a header.
 *
 * `main` in wrangler.jsonc turns the existing assets-only Worker into a Worker
 * with assets. Every path that is not this endpoint MUST fall through to
 * `env.ASSETS`, or adding one endpoint takes down eighteen working routes.
 */
import { SCHEMA_PROMPT, parseAsk, reassemble } from '../src/lib/data/query-schema.ts'

/** Minimal shapes for the two bindings used, in place of @cloudflare/workers-types. */
interface AssetFetcher {
  fetch(request: Request): Promise<Response>
}
interface RateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>
}

interface Env {
  ASSETS: AssetFetcher
  /** Z.ai key, set with `wrangler secret put ZAI_API_KEY`. Never bundled. */
  ZAI_API_KEY: string
  ASK_LIMIT?: RateLimiter
}

const ENDPOINT = '/api/ask'

/**
 * Z.ai's Anthropic-compatible route. Chosen over `/api/paas/v4` because that
 * one requires a pay-as-you-go balance, and over `/api/coding/paas/v4` because
 * thinking is on by default there and burns the whole output budget on
 * reasoning tokens, returning empty content.
 */
const MODEL_URL = 'https://api.z.ai/api/anthropic/v1/messages'
const MODEL = 'glm-5.2'

/** Observed 31–47 output tokens per query. This is headroom, not a target. */
const MAX_TOKENS = 400
/** The only input a caller controls, so it is the only thing that can blow the budget. */
const MAX_QUESTION_CHARS = 300

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...CORS },
  })

/**
 * `next dev` serves the UI on :3000 while this Worker runs on :8787, so local
 * development is cross-origin. Wide open is acceptable because the endpoint
 * holds no user data and no session — the thing being protected is the key,
 * which never leaves here, and the spend, which the rate limit guards.
 */
const CORS: Record<string, string> = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
}

/** Orientation only — never a filter. See the Context note in `SCHEMA_PROMPT`. */
const MAX_CONTEXT_CHARS = 120

async function translate(question: string, env: Env, nudge?: string): Promise<string> {
  const res = await fetch(MODEL_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': env.ZAI_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      temperature: 0,
      system: nudge ? `${SCHEMA_PROMPT}\n\n${nudge}` : SCHEMA_PROMPT,
      messages: [
        { role: 'user', content: question },
        // Prefilling the assistant turn with an open brace is what keeps the
        // reply to JSON. This route is the Anthropic Messages shape, which has
        // no `response_format`, and Z.ai's `json_object` mode does not enforce
        // shape anyway — so the brace comes back off in the caller.
        { role: 'assistant', content: '{' },
      ],
    }),
  })

  if (!res.ok) throw new Error(`model ${res.status}: ${(await res.text()).slice(0, 200)}`)

  const body = (await res.json()) as { content?: { type: string; text?: string }[] }
  return reassemble(body.content?.find((c) => c.type === 'text')?.text ?? '')
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    // Everything that is not this endpoint is a static asset. This line is why
    // the other eighteen routes keep working.
    if (url.pathname !== ENDPOINT) return env.ASSETS.fetch(request)

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })
    if (request.method !== 'POST') return json({ error: 'POST only' }, 405)

    // A missing secret is a deployment step, not a model failure. Without this
    // the key goes upstream as `undefined`, Z.ai answers 401 "token expired or
    // incorrect", and the drawer reports an expired key that was never set.
    if (!env.ZAI_API_KEY) {
      return json({ error: 'Ask is not configured on this deployment (no ZAI_API_KEY secret).' }, 503)
    }

    if (env.ASK_LIMIT) {
      const key = request.headers.get('cf-connecting-ip') ?? 'anonymous'
      const { success } = await env.ASK_LIMIT.limit({ key })
      if (!success) return json({ error: 'Too many questions just now. Try again in a moment.' }, 429)
    }

    let question: unknown
    let context: unknown
    try {
      const body = (await request.json()) as { question?: unknown; context?: unknown }
      question = body.question
      context = body.context
    } catch {
      return json({ error: 'Expected a JSON body' }, 400)
    }
    if (typeof question !== 'string' || !question.trim()) return json({ error: 'Ask a question' }, 400)
    if (question.length > MAX_QUESTION_CHARS) return json({ error: 'Question is too long' }, 400)

    // Appended to the question rather than the system prompt, so the fixed
    // prompt stays byte-identical across requests and stays cacheable.
    const asked =
      typeof context === 'string' && context.trim()
        ? `${question}\n\n(The user is currently on the ${context.trim().slice(0, MAX_CONTEXT_CHARS)} screen.)`
        : question

    try {
      let raw = await translate(asked, env)
      // One retry. Cheap at ~40 output tokens, and it converts the common
      // near-miss into an answer instead of an apology.
      if (!parseAsk(raw).ok) {
        raw = await translate(question, env, 'Your previous reply did not match the schema. Reply with JSON matching it exactly, or {"error":"unsupported"}.')
      }
      // The raw text goes back unparsed on purpose: the browser runs the same
      // `parseQuery` before touching the cohort, so validation lives next to
      // the data it protects rather than being trusted from over the wire.
      return json({ json: raw })
    } catch (err) {
      return json({ error: err instanceof Error ? err.message : 'Model unavailable' }, 502)
    }
  },
}
