import { useEffect, useState } from 'react';
import { supabase } from './supabase.js';

// A custom hook: any screen can call useSession() to know who's signed in.
// Like a shared @Observable object in SwiftUI.
export function useSession() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Is someone already signed in? (Supabase remembers between visits)
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    // 2. Keep listening: sign-in link clicked, or signed out
    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    // 3. Stop listening when the screen goes away
    return () => data.subscription.unsubscribe();
  }, []);

  return { session, user: session?.user ?? null, loading };
}