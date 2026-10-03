import { Library, LibrarySerialized } from '../types/library.ts';

export const PRIMARY_STORAGE_KEY = 'smart-library-v8';
export const BACKUP_STORAGE_KEY = 'smart-library-v8-backup';
export const USER_STORAGE_KEY = 'smart-library-user';
export const TAB_STORAGE_KEY = 'smart-library-tab';
export const THEME_STORAGE_KEY = 'smart-library-theme';

export type AppTheme = 'light' | 'dark';

/**
 * Manually saves user explicit theme selection ('light' or 'dark'), overriding system preference.
 */
export function saveTheme(theme: AppTheme): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {
    console.warn('Storage: Could not save theme override', e);
  }
}

/**
 * Loads manual theme preference if set, otherwise checks system media query.
 */
export function loadTheme(): AppTheme {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY) as AppTheme | null;
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  } catch {
    return 'light';
  }
}

export interface StorageLoadResult {
  lib: Library;
  savedAt: number;
  source: 'primary' | 'backup' | 'seed';
}

/**
 * Validates whether parsed object contains required library data structures.
 */
function isValidLibraryPayload(data: any): data is LibrarySerialized {
  return (
    data &&
    typeof data === 'object' &&
    Array.isArray(data.books) &&
    data.books.length > 0 &&
    Array.isArray(data.members) &&
    data.members.length > 0 &&
    Array.isArray(data.loans)
  );
}

/**
 * Clean legacy test transactions if present
 */
function cleanLoans(loans: any[]): any[] {
  const legacyIds = new Set(['T101', 'T102', 'T103', 'T104']);
  return (loans || []).filter((l: any) => !legacyIds.has(l.id));
}

/**
 * Robustly saves library data to browser localStorage (both primary & backup keys)
 * and asynchronously syncs to backend server.
 */
export function saveLibraryToStorage(lib: Library): { success: boolean; savedAt: number } {
  try {
    if (!lib || !Array.isArray(lib.books) || !Array.isArray(lib.members)) {
      console.warn('Storage: Aborted save due to invalid library instance');
      return { success: false, savedAt: 0 };
    }

    const payload = lib.toJSON();
    payload.savedAt = Date.now();
    const serialized = JSON.stringify(payload);

    // 1. Primary browser storage
    localStorage.setItem(PRIMARY_STORAGE_KEY, serialized);

    // 2. Redundant backup key for crash recovery
    try {
      localStorage.setItem(BACKUP_STORAGE_KEY, serialized);
    } catch (backupErr) {
      // Non-fatal if backup fails
    }

    // 3. Asynchronously sync to backend persistence file
    fetch('/api/library', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: serialized,
    }).catch((err) => {
      // Running offline or dev server without backend route
      console.debug('Storage: Backend sync offline notice:', err.message);
    });

    return { success: true, savedAt: payload.savedAt };
  } catch (error) {
    console.error('Storage: Critical error saving library to localStorage:', error);
    return { success: false, savedAt: 0 };
  }
}

/**
 * Robustly loads library data from local browser storage.
 * Evaluates primary key, falls back to backup key, and gracefully seeds if uninitialized.
 */
export function loadLibraryFromStorage(): StorageLoadResult {
  // 1. Attempt loading from primary storage key
  try {
    const primaryRaw = localStorage.getItem(PRIMARY_STORAGE_KEY);
    if (primaryRaw) {
      const parsed = JSON.parse(primaryRaw);
      if (isValidLibraryPayload(parsed)) {
        parsed.loans = cleanLoans(parsed.loans);
        const libInstance = new Library(parsed);
        return {
          lib: libInstance,
          savedAt: parsed.savedAt || Date.now(),
          source: 'primary',
        };
      }
    }
  } catch (err) {
    console.warn('Storage: Primary key read error, checking backup...', err);
  }

  // 2. Fallback: Attempt loading from backup key
  try {
    const backupRaw = localStorage.getItem(BACKUP_STORAGE_KEY);
    if (backupRaw) {
      const parsed = JSON.parse(backupRaw);
      if (isValidLibraryPayload(parsed)) {
        parsed.loans = cleanLoans(parsed.loans);
        const libInstance = new Library(parsed);
        // Resave to primary key to restore integrity
        saveLibraryToStorage(libInstance);
        return {
          lib: libInstance,
          savedAt: parsed.savedAt || Date.now(),
          source: 'backup',
        };
      }
    }
  } catch (err) {
    console.warn('Storage: Backup key read error, falling back to seed...', err);
  }

  // 3. Fallback: Fresh seed
  const seedLib = Library.seed();
  saveLibraryToStorage(seedLib);
  return {
    lib: seedLib,
    savedAt: Date.now(),
    source: 'seed',
  };
}

/**
 * User session persistence
 */
export function saveActiveUser(userId: string | null): void {
  try {
    if (userId) {
      localStorage.setItem(USER_STORAGE_KEY, userId);
    } else {
      localStorage.removeItem(USER_STORAGE_KEY);
    }
  } catch (e) {
    console.warn('Storage: Could not save active user', e);
  }
}

export function loadActiveUser(): string | null {
  try {
    return localStorage.getItem(USER_STORAGE_KEY) || null;
  } catch {
    return null;
  }
}

/**
 * Tab state persistence
 */
export function saveActiveTab(tab: string): void {
  try {
    localStorage.setItem(TAB_STORAGE_KEY, tab);
  } catch (e) {
    console.warn('Storage: Could not save active tab', e);
  }
}

export function loadActiveTab(defaultTab = 'dash'): string {
  try {
    return localStorage.getItem(TAB_STORAGE_KEY) || defaultTab;
  } catch {
    return defaultTab;
  }
}

/**
 * Synchronize with backend API safely without overwriting newer local state.
 */
export async function syncWithServer(
  currentLib: Library,
  lastLocalSavedAt: number,
  onServerNewer: (remoteLib: Library, remoteSavedAt: number) => void
): Promise<void> {
  try {
    const res = await fetch('/api/library');
    if (!res.ok) return;

    const remoteData = await res.json();
    if (!isValidLibraryPayload(remoteData)) return;

    const remoteSavedAt = remoteData.savedAt || 0;

    if (remoteSavedAt > lastLocalSavedAt) {
      // Server has newer updates (from another browser or device)
      remoteData.loans = cleanLoans(remoteData.loans);
      const newLib = new Library(remoteData);

      // Persist to local browser storage immediately so it survives refresh
      try {
        const serialized = JSON.stringify(remoteData);
        localStorage.setItem(PRIMARY_STORAGE_KEY, serialized);
        localStorage.setItem(BACKUP_STORAGE_KEY, serialized);
      } catch (err) {
        console.warn('Storage: Failed updating local storage from remote sync', err);
      }

      onServerNewer(newLib, remoteSavedAt);
    } else if (lastLocalSavedAt > remoteSavedAt && lastLocalSavedAt > 0) {
      // Local changes are newer: push local state to server
      const payload = currentLib.toJSON();
      payload.savedAt = lastLocalSavedAt;
      fetch('/api/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {});
    }
  } catch (err) {
    // Offline / silent notice
  }
}

/**
 * Registers browser event listeners to guarantee state persistence across page unloads
 * and multi-tab synchronization.
 */
export function registerPersistenceGuards(
  getCurrentLib: () => Library,
  onStorageSync: (newLib: Library) => void
): () => void {
  // 1. Guarantee flush on tab close/refresh
  const handleBeforeUnload = () => {
    try {
      const current = getCurrentLib();
      if (current) {
        saveLibraryToStorage(current);
      }
    } catch (e) {
      // ignore in unload
    }
  };

  // 2. Realtime cross-tab synchronization
  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === PRIMARY_STORAGE_KEY && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        if (isValidLibraryPayload(parsed)) {
          parsed.loans = cleanLoans(parsed.loans);
          const synchronizedLib = new Library(parsed);
          onStorageSync(synchronizedLib);
        }
      } catch (err) {
        console.warn('Storage: Error syncing from other tab', err);
      }
    }
  };

  window.addEventListener('beforeunload', handleBeforeUnload);
  window.addEventListener('storage', handleStorageEvent);

  return () => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
    window.removeEventListener('storage', handleStorageEvent);
  };
}
