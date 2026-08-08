import React, { createContext, useContext, useState, useCallback } from 'react';

interface CreditsContextValue {
  credits: number;
  /**
   * Local, non-authoritative pre-flight check only - lets the UI bail out
   * immediately with a friendly message instead of waiting on a network
   * round trip. The ai-proxy Edge Function is the real source of truth and
   * enforces the actual spend server-side; this can't be bypassed by editing
   * client JS the way the old direct-RPC version could.
   */
  spend: (amount?: number) => Promise<boolean>;
  /** Reconcile local display with the authoritative balance the server returned. */
  sync: (newBalance: number) => void;
}

const CreditsContext = createContext<CreditsContextValue>({
  credits: 0,
  spend: async () => false,
  sync: () => {},
});

export const useCredits = () => useContext(CreditsContext);

export const CreditsProvider: React.FC<{
  userId: string;
  initialCredits: number;
  onCreditsChange?: (newCredits: number) => void;
  children: React.ReactNode;
}> = ({ userId, initialCredits, onCreditsChange, children }) => {
  const [credits, setCredits] = useState(initialCredits);

  const spend = useCallback(async (amount: number = 1): Promise<boolean> => {
    if (credits < amount) {
      alert("You're out of AI credits! Please contact an admin to top up your account.");
      return false;
    }
    return true;
  }, [credits]);

  const sync = useCallback((newBalance: number) => {
    setCredits(newBalance);
    onCreditsChange?.(newBalance);
  }, [onCreditsChange]);

  return (
    <CreditsContext.Provider value={{ credits, spend, sync }}>
      {children}
    </CreditsContext.Provider>
  );
};
