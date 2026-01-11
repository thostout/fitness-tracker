/**
 * Home Page - Main Application Entry Point
 *
 * This is a Server Component - it runs on the server, not in the browser.
 * This allows us to:
 * - Fetch data directly (no useEffect needed)
 * - Keep sensitive operations on the server
 * - Send less JavaScript to the browser
 *
 * Layout:
 * - Two-column layout on large screens (lg:grid-cols-2)
 * - Single column on mobile (grid-cols-1)
 * - Left: Workout form + history
 * - Right: AI chat
 *
 * Data flow:
 * 1. Server fetches workouts from Supabase
 * 2. Passes them as props to WorkoutList
 * 3. Client components handle user interactions
 */

import { WorkoutForm } from '@/components/workout-form'
import { WorkoutList } from '@/components/workout-list'
import { WeeklyAttendance } from '@/components/weekly-attendance'
import { AIChat } from '@/components/ai-chat'
import { getWorkouts, getWeeklyGymVisits } from '@/lib/queries'

/**
 * Force dynamic rendering for this page
 *
 * Why?
 * - By default, Next.js tries to static render pages at build time
 * - Our page fetches from a database, so it needs to be dynamic
 * - 'force-dynamic' tells Next.js to always render fresh on each request
 *
 * Alternative: You could use revalidate to cache for X seconds
 */
export const dynamic = 'force-dynamic'

/**
 * Home page component
 *
 * This is an async function because Server Components can use async/await
 * directly - no useEffect or loading states needed!
 */
export default async function Home() {
  // Fetch data directly - this runs on the server before sending HTML
  const workouts = await getWorkouts()
  const gymVisits = await getWeeklyGymVisits()

  return (
    <main className="min-h-screen bg-background">
      {/* Container with responsive padding */}
      <div className="container mx-auto py-8 px-4">
        {/* Page title */}
        <h1 className="text-3xl font-bold mb-6">Workout Tracker</h1>

        {/*
         * Responsive grid layout:
         * - grid-cols-1: One column by default (mobile)
         * - lg:grid-cols-2: Two columns on large screens (1024px+)
         * - gap-8: 32px spacing between columns
         */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left column: Workout logging tools */}
          <div className="space-y-8">
            {/* Weekly attendance grid - click days to mark gym visits */}
            <WeeklyAttendance initialVisits={gymVisits} />
            {/* Form for adding new workouts */}
            <WorkoutForm />
            {/* Table showing workout history - receives data as props */}
            <WorkoutList workouts={workouts} />
          </div>

          {/* Right column: AI assistant */}
          <div>
            <AIChat />
          </div>
        </div>
      </div>
    </main>
  )
}
