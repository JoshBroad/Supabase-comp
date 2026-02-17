import { BuildSession, BuildEvent } from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_BASE_URL;
const API_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${API_KEY}`,
};

export interface VibeIntakeData {
  vibeText: string;
  template: string;
  options: {
    enableAnalytics: boolean;
    enableDriftSentinel: boolean;
  };
}

export const api = {
  createSession: async (data: VibeIntakeData): Promise<{ sessionId: string }> => {
    const response = await fetch(`${API_BASE_URL}/sessions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || 'Failed to create session');
    }
    return response.json();
  },
  
  getSession: async (sessionId: string): Promise<BuildSession> => {
    const response = await fetch(`${API_BASE_URL}/sessions?id=${sessionId}`, { headers });
    if (!response.ok) {
      throw new Error('Failed to get session');
    }
    return response.json();
  },
  
  getEvents: async (sessionId: string): Promise<BuildEvent[]> => {
    const response = await fetch(`${API_BASE_URL}/events?session_id=${sessionId}`, { headers });
    if (!response.ok) {
      throw new Error('Failed to get events');
    }
    return response.json();
  }
};
