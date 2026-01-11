/**
 * AIChat Component
 *
 * An interactive chat interface for talking to an AI fitness coach.
 * The AI can see the user's recent workout history and give personalized advice.
 *
 * Features:
 * - Send messages to the AI
 * - See responses streamed in real-time
 * - View conversation history
 * - Quick-add individual exercises from AI suggestions
 *
 * Architecture:
 * - Messages are stored in local state (not persisted)
 * - API calls go to /api/chat route
 * - Responses are streamed using the Fetch API + ReadableStream
 */

'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { addWorkout } from '@/lib/actions'
import type { ChatMessage, WorkoutInsert } from '@/types'

export function AIChat() {
  // Array of all messages in the conversation
  const [messages, setMessages] = useState<ChatMessage[]>([])
  // Current text in the input field
  const [input, setInput] = useState('')
  // Whether we're waiting for an AI response
  const [isLoading, setIsLoading] = useState(false)
  // For showing "Saved!" feedback
  const [savedExercise, setSavedExercise] = useState<string | null>(null)

  // Ref to scroll to the bottom of messages
  const messagesEndRef = useRef<HTMLDivElement>(null)

  /**
   * Auto-scroll to bottom when new messages arrive
   *
   * useEffect runs after render when dependencies change.
   * Here it runs whenever messages array changes.
   *
   * Why smooth scrolling?
   * - Less jarring than instant scroll
   * - Better UX as AI response streams in
   */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  /**
   * Parse workout exercises from AI response
   *
   * Looks for patterns like:
   * **Exercise Name**
   * - Sets: 3
   * - Reps: 10
   * - Weight: 135 lbs
   *
   * Returns array of parseable workout objects
   */
  function parseExercisesFromMessage(content: string): Array<{
    exercise: string
    sets: number
    reps: number
    weight: number
  }> {
    const exercises: Array<{
      exercise: string
      sets: number
      reps: number
      weight: number
    }> = []

    // Split by ** to find exercise headers
    const sections = content.split(/\*\*([^*]+)\*\*/)

    for (let i = 1; i < sections.length; i += 2) {
      const exerciseName = sections[i]?.trim()
      const details = sections[i + 1] || ''

      // Extract sets, reps, weight using regex
      const setsMatch = details.match(/Sets?:\s*(\d+)/i)
      const repsMatch = details.match(/Reps?:\s*(\d+)/i)
      const weightMatch = details.match(/Weight:\s*(\d+)/i)

      if (exerciseName && setsMatch && repsMatch && weightMatch) {
        exercises.push({
          exercise: exerciseName,
          sets: parseInt(setsMatch[1]),
          reps: parseInt(repsMatch[1]),
          weight: parseInt(weightMatch[1]),
        })
      }
    }

    return exercises
  }

  /**
   * Quick-add a single exercise from AI suggestion
   */
  async function handleQuickAdd(exercise: {
    exercise: string
    sets: number
    reps: number
    weight: number
  }) {
    try {
      const workoutData: WorkoutInsert = {
        exercise: exercise.exercise,
        sets: exercise.sets,
        reps: exercise.reps,
        weight: exercise.weight,
        notes: 'Added from AI suggestion',
      }
      await addWorkout(workoutData)
      setSavedExercise(exercise.exercise)
      // Clear the "saved" indicator after 2 seconds
      setTimeout(() => setSavedExercise(null), 2000)
    } catch (error) {
      console.error('Failed to save exercise:', error)
    }
  }

  /**
   * Handle form submission - send message to AI
   *
   * Process:
   * 1. Add user message to state immediately (optimistic update)
   * 2. Create empty assistant message placeholder
   * 3. Stream AI response and update placeholder progressively
   * 4. Handle errors gracefully
   */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Don't submit if empty or already loading
    if (!input.trim() || isLoading) return

    // Create the user message object
    const userMessage: ChatMessage = {
      id: Date.now().toString(), // Simple unique ID using timestamp
      role: 'user',
      content: input.trim(),
    }

    // Add user message to the conversation immediately
    // This is an "optimistic update" - we show the message before API confirms
    setMessages((prev) => [...prev, userMessage])
    setInput('') // Clear the input
    setIsLoading(true)

    // Create a placeholder for the assistant's response
    // We'll update this as the response streams in
    const assistantId = (Date.now() + 1).toString()
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: 'assistant', content: '' },
    ])

    try {
      // Make the API request
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          history: messages, // Send conversation history for context
        }),
      })

      // Check for HTTP errors
      if (!response.ok) {
        throw new Error('Failed to get response')
      }

      /**
       * Stream the response using ReadableStream
       *
       * Why streaming?
       * - User sees text appear word-by-word
       * - More engaging and feels faster
       * - Works with Claude's streaming API
       *
       * How it works:
       * 1. Get a reader from the response body
       * 2. Read chunks as they arrive
       * 3. Decode bytes to text
       * 4. Append to the assistant message
       */
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (reader) {
        // Keep reading until done
        while (true) {
          const { done, value } = await reader.read()
          if (done) break // Exit loop when stream ends

          // Decode the chunk (Uint8Array -> string)
          const text = decoder.decode(value)

          // Update the assistant message by appending the new text
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantId
                ? { ...msg, content: msg.content + text }
                : msg
            )
          )
        }
      }
    } catch (error) {
      console.error('Chat error:', error)
      // Update the assistant message with an error
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantId
            ? { ...msg, content: 'Sorry, I encountered an error. Please try again.' }
            : msg
        )
      )
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Handle keyboard shortcuts
   *
   * Enter = Submit (without Shift)
   * Shift+Enter = New line (default textarea behavior)
   *
   * Why this pattern?
   * - Familiar from chat apps like Slack, Discord
   * - Quick to send without moving to button
   */
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault() // Stop the newline from being added
      handleSubmit(e)
    }
  }

  return (
    <Card className="flex flex-col h-[600px]">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <span className="text-xl">AI Workout Planner</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col overflow-hidden">
        {/* Messages area - scrollable */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
          {/* Empty state with suggestions */}
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <p className="mb-2">Ask me to help plan your workouts!</p>
              <p className="text-sm">Try:</p>
              <ul className="text-sm space-y-1 mt-2">
                <li>&quot;Make me a push day workout&quot;</li>
                <li>&quot;I only have 30 minutes, what should I do?&quot;</li>
                <li>&quot;I&apos;m sore from yesterday, suggest something light&quot;</li>
              </ul>
            </div>
          ) : (
            // Render each message
            messages.map((message) => {
              // Parse exercises from assistant messages
              const exercises =
                message.role === 'assistant'
                  ? parseExercisesFromMessage(message.content)
                  : []

              return (
                <div key={message.id}>
                  <div
                    className={`flex ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg px-4 py-2 ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground' // User messages: blue
                          : 'bg-muted' // Assistant messages: gray
                      }`}
                    >
                      {/* Message content with line breaks preserved */}
                      <div className="whitespace-pre-wrap text-sm">
                        {message.content || (
                          <span className="animate-pulse">Thinking...</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Quick-add buttons for exercises in AI response */}
                  {exercises.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2 justify-start">
                      {exercises.map((ex, i) => (
                        <Button
                          key={i}
                          variant="outline"
                          size="sm"
                          onClick={() => handleQuickAdd(ex)}
                          className="text-xs"
                        >
                          {savedExercise === ex.exercise ? (
                            'Saved!'
                          ) : (
                            <>+ Add {ex.exercise}</>
                          )}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })
          )}
          {/* Invisible element to scroll to */}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about workouts..."
            className="min-h-[60px] resize-none"
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            {isLoading ? '...' : 'Send'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
