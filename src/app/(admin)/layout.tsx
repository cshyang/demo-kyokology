import { AskDrawer } from '@/components/AskDrawer'
import { Sidebar } from '@/components/Sidebar'
import { AskStateProvider } from '@/lib/ask-state'

/** Admin chrome. The student-facing flow at /t deliberately sits outside this. */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    // The provider wraps the chrome, not the page, so the thread survives
    // navigation — a route change swaps `children` and leaves the drawer alone.
    <AskStateProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        {/* Each screen renders its own <Header>, then a scrolling body. */}
        <main className="flex min-w-0 flex-1 flex-col bg-white">{children}</main>
        <AskDrawer />
      </div>
    </AskStateProvider>
  )
}
