/**
 * WorkoutList Component
 *
 * Displays the user's workout history in a table format.
 * This is a Client Component because it needs:
 * - useState for tracking which workout is being deleted
 * - Event handlers for delete button clicks
 *
 * Props:
 * - workouts: Array of Workout objects passed from the server component (page.tsx)
 *
 * Why pass workouts as props instead of fetching here?
 * - The page.tsx is a Server Component that can fetch data directly
 * - This component just displays data, doesn't need to fetch
 * - Keeps data fetching at the top of the component tree (better pattern)
 */

'use client' // Required for useState and onClick handlers

import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { deleteWorkout } from '@/lib/actions'
import type { Workout } from '@/types'

/**
 * TypeScript interface for component props
 *
 * Why define this?
 * - Documents what the component expects
 * - Provides autocomplete when using the component
 * - Catches errors if wrong data is passed
 */
interface WorkoutListProps {
  workouts: Workout[]
}

export function WorkoutList({ workouts }: WorkoutListProps) {
  // Track which workout is being deleted (for loading state on that row)
  // null means nothing is being deleted
  const [deletingId, setDeletingId] = useState<string | null>(null)

  /**
   * Handle workout deletion
   *
   * Why track deletingId?
   * - Shows loading state only on the specific row being deleted
   * - Prevents double-clicking the same delete button
   * - Better UX than disabling all delete buttons
   */
  async function handleDelete(id: string) {
    setDeletingId(id) // Mark this workout as "deleting"
    try {
      await deleteWorkout(id) // Call server action
    } catch (err) {
      // Log error but don't crash - the workout just stays in the list
      console.error('Failed to delete workout:', err)
    } finally {
      setDeletingId(null) // Clear deleting state
    }
  }

  /**
   * Format a date string into a human-readable format
   *
   * @param dateString - ISO date string from the database
   * @returns Formatted string like "Jan 5, 2:30 PM"
   *
   * Why use toLocaleDateString?
   * - Automatically handles user's locale
   * - Built-in browser API, no library needed
   */
  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short', // "Jan" instead of "January"
      day: 'numeric', // "5" instead of "05"
      hour: 'numeric', // "2 PM" format
      minute: '2-digit', // "30" with leading zero if needed
    })
  }

  // Empty state - show helpful message when no workouts logged
  if (workouts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Workout History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No workouts logged yet. Add your first workout above!
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workout History</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Table component from shadcn/ui - responsive and accessible */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Exercise</TableHead>
              {/* text-center aligns the numbers in these columns */}
              <TableHead className="text-center">Sets</TableHead>
              <TableHead className="text-center">Reps</TableHead>
              <TableHead className="text-center">Weight</TableHead>
              <TableHead>Notes</TableHead>
              {/* Empty header for delete button column, fixed width */}
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Map over workouts to create a row for each */}
            {workouts.map((workout) => (
              <TableRow key={workout.id}>
                {/* Date column - muted color for less visual importance */}
                <TableCell className="text-muted-foreground text-sm">
                  {formatDate(workout.created_at)}
                </TableCell>
                {/* Exercise name - bold for emphasis */}
                <TableCell className="font-medium">{workout.exercise}</TableCell>
                <TableCell className="text-center">{workout.sets}</TableCell>
                <TableCell className="text-center">{workout.reps}</TableCell>
                <TableCell className="text-center">{workout.weight} lbs</TableCell>
                {/* Notes with truncation for long text */}
                <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                  {workout.notes || '-'} {/* Show dash if no notes */}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost" // Subtle button style
                    size="sm"
                    onClick={() => handleDelete(workout.id)}
                    disabled={deletingId === workout.id} // Only disable THIS button while deleting
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    {/* Show "..." while deleting for this specific row */}
                    {deletingId === workout.id ? '...' : 'Delete'}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
