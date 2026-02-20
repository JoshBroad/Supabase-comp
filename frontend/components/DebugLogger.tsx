'use client';
import { useEffect } from 'react';

export function DebugLogger() {
  useEffect(() => {
    console.log('✅ Frontend Application Mounted');
    window.addEventListener('error', (event) => {
      console.error('❌ Global Error:', event.error);
    });
    window.addEventListener('unhandledrejection', (event) => {
      console.error('❌ Unhandled Promise Rejection:', event.reason);
    });
  }, []);
  return null;
}
