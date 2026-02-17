"use client"

import { VibeIntakeForm } from "@/components/VibeIntakeForm"

export default function VibeIntakePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-24 bg-zinc-50 dark:bg-zinc-950">
      <div className="z-10 w-full max-w-5xl items-center justify-between text-sm lg:flex mb-8">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-6xl mx-auto text-center">
          Vibe Architect <span className="text-primary">v1</span>
        </h1>
      </div>

      <div className="w-full max-w-2xl">
        <VibeIntakeForm />
      </div>
      
      <div className="mt-12 text-center text-sm text-muted-foreground">
        <p>Powered by Supabase, Next.js, and Vibe Coding.</p>
      </div>
    </main>
  )
}
