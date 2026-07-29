import type { NextConfig } from 'next'

/*
 * Static export.
 *
 * Every route in this app prerenders — there is no server code, no database,
 * no auth. Exporting gives a 4 MB `out/` directory that Cloudflare Workers
 * static assets serves on the free plan, with no OpenNext adapter and no 3 MiB
 * Worker-script limit to fight.
 *
 * THE CONSTRAINT THIS IMPOSES: no server components that fetch, no route
 * handlers, no server actions, no next/image optimization, no middleware.
 * Next.js documentation and most training data assume those exist, so it is
 * easy to write code here that builds locally and fails at export.
 *
 * When the demo graduates — D1, real email, auth — delete this one line and
 * add @opennextjs/cloudflare. That is a deploy change, not a migration: the
 * app is already full Next.js App Router, which is why the framework was
 * chosen over a Vite SPA in the first place. Budget Workers Paid ($5/mo) at
 * that point, because an OpenNext bundle of this app exceeds the free 3 MiB.
 */
const nextConfig: NextConfig = {
  output: 'export',
}

export default nextConfig
