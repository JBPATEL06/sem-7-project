import { useState, useEffect, useCallback } from 'react';

export interface KeyEntry {
  isConfigured: boolean;
  masked: string;
  source: 'encrypted_storage' | 'environment' | 'none';
}

export interface SettingsKeysResponse {
  hasEncryptedStorage: boolean;
  keys: {
    groq: KeyEntry;
    github: KeyEntry;
    openai: KeyEntry;
  };
}

export function useSettings() {
  const [keysData, setKeysData] = useState<SettingsKeysResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [revealedValues, setRevealedValues] = useState<{ [key: string]: string }>({});
  const [revealingKey, setRevealingKey] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);

  const fetchKeys = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/settings/keys');
      if (!res.ok) throw new Error(`Failed to load keys (HTTP ${res.status})`);
      const data: SettingsKeysResponse = await res.json();
      setKeysData(data);
    } catch (err: any) {
      console.error('[useSettings] Error:', err);
      setError(err.message || 'Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const toggleReveal = async (keyType: 'groq' | 'github' | 'openai') => {
    // If currently revealed, hide it immediately and purge from memory
    if (revealedValues[keyType]) {
      setRevealedValues((prev) => {
        const next = { ...prev };
        delete next[keyType];
        return next;
      });
      return;
    }

    // Otherwise, fetch plaintext on-demand
    setRevealingKey(keyType);
    try {
      const res = await fetch(`/api/settings/keys/${keyType}/reveal`);
      if (!res.ok) {
        throw new Error(`Failed to reveal key (HTTP ${res.status})`);
      }
      const data = await res.json();
      if (data.value) {
        setRevealedValues((prev) => ({ ...prev, [keyType]: data.value }));
      }
    } catch (err: any) {
      console.error('[useSettings/toggleReveal] Error:', err);
      alert(`Could not reveal key: ${err.message}`);
    } finally {
      setRevealingKey(null);
    }
  };

  const saveKey = async (keyType: 'groq' | 'github' | 'openai', keyValue: string) => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/settings/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyType, keyValue })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save key');
      }

      // Purge any revealed plaintext cache for this key
      setRevealedValues((prev) => {
        const next = { ...prev };
        delete next[keyType];
        return next;
      });

      await fetchKeys();
      return { success: true, message: data.message };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to save key' };
    } finally {
      setIsSaving(false);
    }
  };

  const verifyKey = async (keyType: 'groq' | 'github' | 'openai', keyValue?: string) => {
    try {
      const res = await fetch('/api/settings/keys/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyType, keyValue })
      });

      const data = await res.json();
      return data;
    } catch (err: any) {
      return { valid: false, error: err.message || 'Failed to verify key' };
    }
  };

  const resetAllData = async () => {
    setIsResetting(true);
    try {
      const res = await fetch('/api/settings/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to reset indexed data');
      }

      return { success: true, message: data.message };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to reset indexed data' };
    } finally {
      setIsResetting(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  return {
    keysData,
    isLoading,
    isSaving,
    isResetting,
    revealingKey,
    error,
    revealedValues,
    toggleReveal,
    saveKey,
    verifyKey,
    resetAllData,
    refetch: fetchKeys
  };
}
