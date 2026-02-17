import { BuildSession, BuildEvent } from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_BASE_URL;
const AGENT_URL = process.env.NEXT_PUBLIC_AGENT_URL || 'http://localhost:3001';

export const api = {
  createSession: async (fileKeys: string[]): Promise<{ sessionId: string }> => {
    const response = await fetch(`${API_BASE_URL}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileKeys }),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || 'Failed to create session');
    }
    return response.json();
  },

  triggerAgent: async (sessionId: string, fileKeys: string[]): Promise<void> => {
    const response = await fetch(`${AGENT_URL}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, fileKeys }),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || 'Failed to trigger agent');
    }
  },

  getSession: async (sessionId: string): Promise<BuildSession> => {
    const response = await fetch(`${API_BASE_URL}/sessions?id=${sessionId}`);
    if (!response.ok) {
      throw new Error('Failed to get session');
    }
    return response.json();
  },

  getEvents: async (sessionId: string): Promise<BuildEvent[]> => {
    const response = await fetch(`${API_BASE_URL}/events?session_id=${sessionId}`);
    if (!response.ok) {
      throw new Error('Failed to get events');
    }
    return response.json();
  }
};
