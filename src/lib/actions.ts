/**
 * Server Actions
 *
 * This file contains Next.js Server Actions - special functions that run on
 * the server but can be called directly from client components.
 *
 * Key concepts:
 * - 'use server' directive marks these as server actions
 * - They can safely access databases, APIs, and secrets
 * - They automatically handle the HTTP layer (no manual fetch needed)
 * - revalidatePath() tells Next.js to refresh cached data after mutations
 *
 * Why use server actions?
 * - Simpler than creating API routes for basic CRUD operations
 * - Type-safe across the client/server boundary
 * - Built-in security (can't be called from external sources)
 */

'use server'

import { supabase } from './supabase'
import { revalidatePath } from 'next/cache'
import type { WorkoutInsert } from '@/types'

/**
 * Adds a new workout to the database.
 *
 * @param data - The workout data to insert
 * @throws Error if the database insert fails
 *
 * Why we use revalidatePath('/')?
 * - Next.js caches page data for performance
 * - After adding a workout, we need to "bust" that cache
 * - revalidatePath tells Next.js to re-fetch the data for '/'
 * - This makes the new workout appear immediately without a page refresh
 */
export async function addWorkout(data: WorkoutInsert) {
  const { error } = await supabase.from('workouts').insert(data)

  if (error) {
    // Throwing an error here will be caught by the client component
    // and can be displayed to the user
    throw new Error(error.message)
  }

  // Revalidate the home page so the workout list updates
  revalidatePath('/')
}

/**
 * Deletes a workout by its ID.
 *
 * @param id - The UUID of the workout to delete
 * @throws Error if the database delete fails
 *
 * Why use .eq('id', id)?
 * - Supabase uses a chainable query builder
 * - .eq() adds a WHERE clause: WHERE id = ?
 * - This ensures we only delete the specific workout
 */
export async function deleteWorkout(id: string) {
  const { error } = await supabase
    .from('workouts')
    .delete()
    .eq('id', id) // Only delete the row with this exact ID

  if (error) {
    throw new Error(error.message)
  }

  // Revalidate so the deleted workout disappears from the list
  revalidatePath('/')
}

/**
 * Adds multiple workouts at once (batch insert).
 * Used when saving AI-generated workout plans.
 *
 * @param workouts - Array of workout data to insert
 * @throws Error if the database insert fails
 *
 * Why batch insert?
 * - When AI suggests a workout with 5-6 exercises, we want to save them all
 * - Single database call is more efficient than 5-6 separate inserts
 * - If one fails, they all fail (atomicity)
 */
export async function addWorkouts(workouts: WorkoutInsert[]) {
  const { error } = await supabase.from('workouts').insert(workouts)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/')
}
