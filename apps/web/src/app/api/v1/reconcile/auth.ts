/**
 * Mock authentication library for the assessment.
 * In a real application, this would use NextAuth.js or a similar provider.
 */

export interface Session {
  user: {
    id: string
    name: string
    email: string
  }
}

/**
 * Returns the current user session.
 * This is a mock implementation for the technical assessment.
 */
export async function getSession(): Promise<Session | null> {
  // In a real app, this would check cookies/headers
  // For the assessment, we'll return a mock session to allow the route to function
  return {
    user: {
      id: 'user_123',
      name: 'Assessment User',
      email: 'user@example.com',
    },
  }
}
