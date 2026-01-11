/**
 * Database Query Functions
 *
 * This file contains functions for querying the Supabase database.
 * These are NOT server actions - they're plain async functions that can be
 * called from both server components and API routes.
 *
 * Why separate from actions.ts?
 * - Server actions (marked with 'use server') have special Next.js behavior
 * - They can be called directly from client components
 * - But they have limitations when called from API routes
 * - So we keep read-only queries here, and mutations in actions.ts
 */

import { supabase } from './supabase'
import type { Workout, GymVisit } from '@/types'

/**
 * Fetches all workouts from the database, sorted by most recent first.
 *
 * @returns Array of Workout objects
 *
 * Why order by created_at descending?
 * - Users want to see their most recent workouts first
 * - This is a common UX pattern for activity feeds/logs
 */
export async function getWorkouts(): Promise<Workout[]> {
  const { data, error } = await supabase
    .from('workouts')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

/**
 * Fetches workouts from the past N days.
 * Used to provide context to the AI about the user's recent activity.
 *
 * @param days - Number of days to look back (default: 14)
 * @returns Array of recent Workout objects
 *
 * Why 14 days as default?
 * - Covers roughly 2 weeks of training
 * - Long enough to see patterns (e.g., weekly split)
 * - Short enough to be relevant and not overwhelming for the AI
 */
export async function getRecentWorkouts(days: number = 14): Promise<Workout[]> {
  // Calculate the date N days ago
  const since = new Date()
  since.setDate(since.getDate() - days)

  const { data, error } = await supabase
    .from('workouts')
    .select('*')
    // gte = "greater than or equal" - gets workouts ON or AFTER this date
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

/**
 * Fetches gym visits for the current week.
 *
 * @returns Array of GymVisit objects for this week
 *
 * Why fetch the whole week?
 * - We display a 7-day grid (Mon-Sun)
 * - Need to know which days are already checked
 */
export async function getWeeklyGymVisits(): Promise<GymVisit[]> {
  // Get the start of the current week (Monday)
  const today = new Date()
  const dayOfWeek = today.getDay()
  // Adjust so Monday = 0, Sunday = 6
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1

  const monday = new Date(today)
  monday.setDate(today.getDate() - daysFromMonday)
  monday.setHours(0, 0, 0, 0)

  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)

  const { data, error } = await supabase
    .from('gym_visits')
    .select('*')
    .gte('visited_date', monday.toISOString().split('T')[0])
    .lte('visited_date', sunday.toISOString().split('T')[0])

  if (error) {
    throw new Error(error.message)
  }

  return data || []
}
