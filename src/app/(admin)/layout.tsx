import { Sidebar } from '@/components/Sidebar'

/** Admin chrome. The student-facing flow at /t deliberately sits outside this. */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      {/* Each screen renders its own <Header>, then a scrolling body. */}
      <main className="flex min-w-0 flex-1 flex-col bg-white">{children}</main>
    </div>
  )
}
