import { BuildSession, BuildEvent } from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_BASE_URL;
const AGENT_URL = process.env.NEXT_PUBLIC_AGENT_URL || 'http://localhost:3001';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabaseHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
if (SUPABASE_ANON_KEY) {
  supabaseHeaders['apikey'] = SUPABASE_ANON_KEY;
  supabaseHeaders['Authorization'] = `Bearer ${SUPABASE_ANON_KEY}`;
}

export const api = {
  createSession: async (fileKeys: string[]): Promise<{ sessionId: string }> => {
    console.log('API: Creating session with files:', fileKeys);
    try {
      const response = await fetch(`${API_BASE_URL}/sessions`, {
        method: 'POST',
        headers: supabaseHeaders,
        body: JSON.stringify({ fileKeys }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('API: Failed to create session:', error);
        throw new Error(error.error || 'Failed to create session');
      }
      const data = await response.json();
      console.log('API: Session created:', data);
      return data;
    } catch (e) {
      console.error('API: Network error creating session:', e);
      throw e;
    }
  },

  triggerAgent: async (sessionId: string, fileKeys: string[]): Promise<void> => {
    console.log('API: Triggering agent for session:', sessionId);
    try {
      const response = await fetch(`${AGENT_URL}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, fileKeys }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('API: Failed to trigger agent:', error);
        throw new Error(error.error || 'Failed to trigger agent');
      }
      console.log('API: Agent triggered successfully');
    } catch (e) {
      console.error('API: Network error triggering agent:', e);
      throw e;
    }
  },

  getSession: async (sessionId: string): Promise<BuildSession> => {
    // console.log('API: Fetching session:', sessionId);
    try {
      const response = await fetch(`${API_BASE_URL}/sessions?id=${sessionId}`, {
        headers: supabaseHeaders,
      });
      if (!response.ok) {
        console.error('API: Failed to get session:', response.statusText);
        throw new Error('Failed to get session');
      }
      return response.json();
    } catch (e) {
      console.error('API: Network error getting session:', e);
      throw e;
    }
  },

  getEvents: async (sessionId: string): Promise<BuildEvent[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/events?session_id=${sessionId}`, {
        headers: supabaseHeaders,
      });
      if (!response.ok) {
        console.error('API: Failed to get events:', response.statusText);
        throw new Error('Failed to get events');
      }
      return response.json();
    } catch (e) {
      console.error('API: Network error getting events:', e);
      throw e;
    }
  }
};
