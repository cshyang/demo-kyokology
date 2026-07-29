import { redirect } from 'next/navigation'

// ponytail: Overview is not built yet, so Segments is the landing screen.
// Point this at /overview once that screen exists.
export default function Home() {
  redirect('/segments')
}
