/**
 * WeeklyAttendance Component
 *
 * A visual grid showing gym attendance for the current week.
 * Each day is a clickable box that toggles between:
 * - White/empty: Haven't gone to the gym
 * - Green: Went to the gym
 *
 * How it works:
 * - Displays Mon-Sun for the current week
 * - Fetches existing visits from the database
 * - Clicking a day toggles the visit in the database
 */

'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toggleGymVisit } from '@/lib/actions'
import type { GymVisit } from '@/types'

interface WeeklyAttendanceProps {
  initialVisits: GymVisit[]
}

// Days of the week starting from Monday
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function WeeklyAttendance({ initialVisits }: WeeklyAttendanceProps) {
  // Track which dates have been visited (as Set for fast lookup)
  const [visitedDates, setVisitedDates] = useState<Set<string>>(
    new Set(initialVisits.map((v) => v.visited_date))
  )
  // Track which day is currently being toggled (for loading state)
  const [togglingDate, setTogglingDate] = useState<string | null>(null)

  /**
   * Get the dates for the current week (Monday to Sunday)
   *
   * Returns an array of { dayName: 'Mon', date: '2024-01-15', isToday: true }
   */
  function getWeekDates() {
    const today = new Date()
    const dayOfWeek = today.getDay()
    // Adjust so Monday = 0, Sunday = 6
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1

    const monday = new Date(today)
    monday.setDate(today.getDate() - daysFromMonday)

    return DAYS.map((dayName, index) => {
      const date = new Date(monday)
      date.setDate(monday.getDate() + index)

      // Format as YYYY-MM-DD for database
      const dateString = date.toISOString().split('T')[0]

      // Check if this is today
      const isToday = date.toDateString() === today.toDateString()

      return { dayName, date: dateString, isToday }
    })
  }

  /**
   * Handle clicking on a day to toggle attendance
   */
  async function handleToggle(date: string) {
    setTogglingDate(date)

    try {
      await toggleGymVisit(date)

      // Update local state optimistically
      setVisitedDates((prev) => {
        const next = new Set(prev)
        if (next.has(date)) {
          next.delete(date)
        } else {
          next.add(date)
        }
        return next
      })
    } catch (error) {
      console.error('Failed to toggle gym visit:', error)
    } finally {
      setTogglingDate(null)
    }
  }

  const weekDates = getWeekDates()

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">This Week</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-2">
          {weekDates.map(({ dayName, date, isToday }) => {
            const isVisited = visitedDates.has(date)
            const isToggling = togglingDate === date

            return (
              <button
                key={date}
                onClick={() => handleToggle(date)}
                disabled={isToggling}
                className={`
                  flex flex-col items-center justify-center
                  p-2 rounded-lg border-2 transition-all
                  ${isVisited
                    ? 'bg-green-500 border-green-600 text-white'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                  }
                  ${isToday ? 'ring-2 ring-blue-400 ring-offset-1' : ''}
                  ${isToggling ? 'opacity-50' : 'cursor-pointer'}
                `}
              >
                <span className="text-xs font-medium">{dayName}</span>
                <span className="text-lg">
                  {isVisited ? '✓' : '○'}
                </span>
              </button>
            )
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-3 text-center">
          Click a day to mark gym attendance
        </p>
      </CardContent>
    </Card>
  )
}
