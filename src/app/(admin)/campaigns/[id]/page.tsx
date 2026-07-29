import { CampaignDetail } from './CampaignDetail'

// Only the three seeded campaigns exist, so the route prerenders rather than
// server-rendering on demand — the deploy target is static assets.
export function generateStaticParams() {
  return [{ id: 'A' }, { id: 'B' }, { id: 'C' }]
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <CampaignDetail id={id} />
}
