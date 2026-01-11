/**
 * Type Exports
 *
 * This file serves as the central export point for all TypeScript types
 * used in the application. By re-exporting from here, we can:
 *
 * 1. Import from one place: import { Workout, ChatMessage } from '@/types'
 * 2. Hide internal structure: consumers don't need to know about database.ts
 * 3. Add application-specific types alongside database types
 *
 * Organization pattern:
 * - database.ts: Types that match the database schema
 * - This file: App-level types (chat, UI state, etc.)
 */

// Re-export all database types
export * from './database'

/**
 * ChatMessage Type
 *
 * Represents a single message in the AI chat conversation.
 *
 * Used by:
 * - AIChat component (stores array of these in state)
 * - Chat API route (receives history as array of these)
 *
 * Why role is 'user' | 'assistant'?
 * - Matches Anthropic's API message format
 * - Makes it easy to send history directly to Claude
 * - Type narrowing helps with conditional rendering (user vs AI bubble)
 */
export type ChatMessage = {
  id: string // Unique identifier for React key prop
  role: 'user' | 'assistant' // Who sent this message
  content: string // The message text
}

/**
 * WorkoutSuggestion Type
 *
 * Represents a workout exercise suggested by the AI.
 * Parsed from the AI's response text when it includes
 * exercises in the expected format.
 *
 * Used for:
 * - Quick-add buttons in the chat
 * - Converting AI suggestions to database records
 *
 * Note: This is similar to WorkoutInsert but without
 * the database-specific fields (id, created_at)
 */
export type WorkoutSuggestion = {
  exercise: string // Name of the exercise
  sets: number // Number of sets
  reps: number // Reps per set
  weight: number // Weight in lbs
  notes?: string // Optional notes/tips
}
