/**
 * WorkoutForm Component
 *
 * A form for logging individual workouts to the database.
 * This is a Client Component because it needs:
 * - useState for loading/error states
 * - Event handlers for form submission
 *
 * How it works:
 * 1. User fills in the form fields
 * 2. On submit, we prevent default (no page reload)
 * 3. Extract data from FormData API
 * 4. Call the server action to insert into database
 * 5. Reset form on success, show error on failure
 */

'use client' // Required for components with interactivity

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { addWorkout } from '@/lib/actions'

export function WorkoutForm() {
  // Track whether form is submitting (for loading state)
  const [isLoading, setIsLoading] = useState(false)
  // Track any error messages to display
  const [error, setError] = useState<string | null>(null)

  /**
   * Handle form submission
   *
   * Why async?
   * - We need to await the server action
   * - This allows us to show loading state and handle errors
   *
   * Why e.preventDefault()?
   * - Default form behavior would reload the page
   * - We want to handle submission with JavaScript instead
   */
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault() // Stop the browser's default form submission
    setIsLoading(true)
    setError(null) // Clear any previous errors

    // FormData API extracts values from form inputs by their 'name' attribute
    const formData = new FormData(e.currentTarget)

    // Build the workout object to insert
    // Note: formData.get() returns string | null, so we cast and parse
    const data = {
      exercise: formData.get('exercise') as string,
      sets: parseInt(formData.get('sets') as string),
      reps: parseInt(formData.get('reps') as string),
      weight: parseFloat(formData.get('weight') as string),
      notes: (formData.get('notes') as string) || null, // Empty string becomes null
    }

    try {
      // Call the server action - this runs on the server!
      await addWorkout(data)
      // Reset the form to empty state on success
      e.currentTarget.reset()
    } catch (err) {
      // Safely extract error message
      setError(err instanceof Error ? err.message : 'Failed to add workout')
    } finally {
      // Always stop loading, whether success or failure
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Log Workout</CardTitle>
      </CardHeader>
      <CardContent>
        {/* onSubmit triggers handleSubmit when form is submitted */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Exercise Name Input */}
          <div className="space-y-2">
            <Label htmlFor="exercise">Exercise</Label>
            <Input
              id="exercise"
              name="exercise" // This name is used by FormData.get()
              placeholder="e.g., Bench Press"
              required // HTML5 validation - form won't submit if empty
            />
          </div>

          {/* Sets, Reps, Weight - displayed in a row on larger screens */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sets">Sets</Label>
              <Input
                id="sets"
                name="sets"
                type="number"
                min="1" // HTML5 validation - must be at least 1
                placeholder="3"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reps">Reps</Label>
              <Input
                id="reps"
                name="reps"
                type="number"
                min="1"
                placeholder="10"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weight">Weight (lbs)</Label>
              <Input
                id="weight"
                name="weight"
                type="number"
                min="0"
                step="0.5" // Allows half-pound increments (2.5, 5, etc.)
                placeholder="135"
                required
              />
            </div>
          </div>

          {/* Optional Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="How did it feel? Any PRs?"
              rows={2}
            />
          </div>

          {/* Display error message if there is one */}
          {error && <p className="text-sm text-red-500">{error}</p>}

          {/* Submit button - disabled while loading to prevent double-submit */}
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? 'Saving...' : 'Log Workout'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
