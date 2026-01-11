/**
 * AI Chat API Route (Using Groq)
 *
 * This uses Groq's free API with Llama models instead of Claude.
 * Groq is extremely fast and has a generous free tier.
 *
 * How it works:
 * 1. User sends a message from the frontend
 * 2. We fetch their recent workout history from the database
 * 3. We include that history in the system prompt for context
 * 4. Groq/Llama generates a personalized response
 * 5. We stream the response back to the user in real-time
 */

import Groq from 'groq-sdk'
import { getRecentWorkouts } from '@/lib/queries'
import type { Workout } from '@/types'

// Initialize the Groq client
// Get your free API key at: https://console.groq.com/keys
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

/**
 * Formats workout data into a human-readable string for the AI.
 */
function formatWorkoutsForContext(workouts: Workout[]): string {
  if (workouts.length === 0) {
    return "The user hasn't logged any workouts in the past 2 weeks."
  }

  const formatted = workouts.map((workout) => {
    const date = new Date(workout.created_at).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
    const notesSection = workout.notes ? ` (${workout.notes})` : ''
    return `- ${date}: ${workout.exercise} - ${workout.sets}x${workout.reps} @ ${workout.weight}lbs${notesSection}`
  })

  return `Recent workouts (last 2 weeks):\n${formatted.join('\n')}`
}

/**
 * System prompt that defines the AI's personality and behavior.
 *
 * Note: We don't suggest specific weights because everyone's strength
 * level is different. Instead, we give guidance on how to choose weights.
 */
const SYSTEM_PROMPT = `You are a knowledgeable and supportive personal fitness coach. Your role is to help users plan their workouts, give advice on exercises, and create personalized workout plans based on their history.

When suggesting workouts, format them clearly like this:
**Exercise Name**
- Sets: X
- Reps: X
- Weight: (see below)
- Notes: Any tips or form cues

IMPORTANT WEIGHT GUIDELINES:
- Do NOT suggest specific weights (like "135 lbs") - everyone's strength is different
- Instead, give guidance like:
  - "Choose a weight where the last 2 reps feel challenging"
  - "Start light and increase each set until it feels hard"
  - "Use a weight you can control with good form for all reps"
- If the user has logged that exercise before, you can reference it: "Try the same weight as last time, or add 5 lbs if it felt easy"
- For bodyweight exercises, just say "Bodyweight" or suggest modifications (easier/harder)

Guidelines:
- Be encouraging but realistic
- Consider the user's recent workout history when making suggestions
- If they've worked certain muscle groups recently, suggest complementary exercises or rest
- Ask clarifying questions if needed (e.g., equipment available, time constraints, fitness goals)
- Keep responses concise but helpful
- If suggesting a full workout, organize it logically (warmup, main lifts, accessories, cooldown)

IMPORTANT: When you suggest exercises that could be logged, format them in a way that's clear and actionable. The user can save these to their workout log.`

/**
 * POST handler for chat messages.
 */
export async function POST(req: Request) {
  try {
    const { message, history } = await req.json()

    if (!message || typeof message !== 'string') {
      return Response.json({ error: 'Message is required' }, { status: 400 })
    }

    // Fetch the user's recent workouts to give the AI context
    const recentWorkouts = await getRecentWorkouts(14)
    const workoutContext = formatWorkoutsForContext(recentWorkouts)

    // Combine the base system prompt with the user's workout data
    const systemPrompt = `${SYSTEM_PROMPT}\n\n${workoutContext}`

    // Build the messages array for the API call
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
      // Include conversation history
      ...(history || []).map((msg: { role: string; content: string }) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      // Add the current user message
      { role: 'user', content: message },
    ]

    // Call Groq's API with streaming enabled
    // Using llama-3.3-70b-versatile - fast and capable
    const stream = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages,
      max_tokens: 1024,
      stream: true,
    })

    // Create a ReadableStream to send the response incrementally
    const encoder = new TextEncoder()

    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          // Extract the text content from the chunk
          const text = chunk.choices[0]?.delta?.content || ''
          if (text) {
            controller.enqueue(encoder.encode(text))
          }
        }
        controller.close()
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return Response.json(
      { error: 'Failed to generate response' },
      { status: 500 }
    )
  }
}
