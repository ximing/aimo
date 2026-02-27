import type { Config, PendingItem } from '../types';

// Storage keys
const CONFIG_KEY = 'aimo_config';
const PENDING_ITEMS_KEY = 'aimo_pending_items';
const SETTINGS_KEY = 'aimo_settings';

/**
 * Extension settings interface
 */
export interface Settings {
  defaultCategoryId?: string;
  saveSourceUrl?: boolean;
}

/**
 * Get settings from local storage
 * @returns Settings object or default settings
 */
export async function getSettings(): Promise<Settings> {
  try {
    const result = await chrome.storage.local.get(SETTINGS_KEY);
    return result[SETTINGS_KEY] ?? {};
  } catch (error) {
    throw new StorageError(
      `Failed to get settings: ${error instanceof Error ? error.message : String(error)}`,
      'getSettings'
    );
  }
}

/**
 * Save settings to local storage
 * @param settings - Settings to save
 */
export async function setSettings(settings: Settings): Promise<void> {
  try {
    await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
  } catch (error) {
    throw new StorageError(
      `Failed to save settings: ${error instanceof Error ? error.message : String(error)}`,
      'setSettings'
    );
  }
}

/**
 * Storage error class for better error handling
 */
export class StorageError extends Error {
  constructor(
    message: string,
    public readonly operation: string
  ) {
    super(message);
    this.name = 'StorageError';
  }
}

/**
 * Get configuration from local storage
 * @returns Config object or null if not found
 */
export async function getConfig(): Promise<Config | null> {
  try {
    const result = await chrome.storage.local.get(CONFIG_KEY);
    return result[CONFIG_KEY] ?? null;
  } catch (error) {
    throw new StorageError(
      `Failed to get config: ${error instanceof Error ? error.message : String(error)}`,
      'getConfig'
    );
  }
}

/**
 * Save configuration to local storage
 * @param url - AIMO server URL
 * @param token - JWT authentication token
 * @param username - Optional username for display
 */
export async function setConfig(url: string, token: string, username?: string): Promise<void> {
  try {
    const config: Config = { url, token, username };
    await chrome.storage.local.set({ [CONFIG_KEY]: config });
  } catch (error) {
    throw new StorageError(
      `Failed to save config: ${error instanceof Error ? error.message : String(error)}`,
      'setConfig'
    );
  }
}

/**
 * Clear configuration from local storage
 */
export async function clearConfig(): Promise<void> {
  try {
    await chrome.storage.local.remove(CONFIG_KEY);
  } catch (error) {
    throw new StorageError(
      `Failed to clear config: ${error instanceof Error ? error.message : String(error)}`,
      'clearConfig'
    );
  }
}

/**
 * Get all pending items from session storage
 * @returns Array of pending items
 */
export async function getPendingItems(): Promise<PendingItem[]> {
  try {
    const result = await chrome.storage.session.get(PENDING_ITEMS_KEY);
    return result[PENDING_ITEMS_KEY] ?? [];
  } catch (error) {
    throw new StorageError(
      `Failed to get pending items: ${error instanceof Error ? error.message : String(error)}`,
      'getPendingItems'
    );
  }
}

/**
 * Add a pending item to session storage
 * @param item - Pending item to add (without id and createdAt)
 * @returns The created pending item with id and createdAt
 */
export async function addPendingItem(
  item: Omit<PendingItem, 'id' | 'createdAt'>
): Promise<PendingItem> {
  try {
    const items = await getPendingItems();
    const newItem: PendingItem = {
      ...item,
      id: generateId(),
      createdAt: Date.now(),
    };
    items.push(newItem);
    await chrome.storage.session.set({ [PENDING_ITEMS_KEY]: items });
    return newItem;
  } catch (error) {
    throw new StorageError(
      `Failed to add pending item: ${error instanceof Error ? error.message : String(error)}`,
      'addPendingItem'
    );
  }
}

/**
 * Remove a pending item by id
 * @param id - ID of the item to remove
 */
export async function removePendingItem(id: string): Promise<void> {
  try {
    const items = await getPendingItems();
    const filteredItems = items.filter((item) => item.id !== id);
    await chrome.storage.session.set({ [PENDING_ITEMS_KEY]: filteredItems });
  } catch (error) {
    throw new StorageError(
      `Failed to remove pending item: ${error instanceof Error ? error.message : String(error)}`,
      'removePendingItem'
    );
  }
}

/**
 * Clear all pending items from session storage
 */
export async function clearPendingItems(): Promise<void> {
  try {
    await chrome.storage.session.remove(PENDING_ITEMS_KEY);
  } catch (error) {
    throw new StorageError(
      `Failed to clear pending items: ${error instanceof Error ? error.message : String(error)}`,
      'clearPendingItems'
    );
  }
}

/**
 * Update a pending item (e.g., to add attachmentId after upload)
 * @param id - ID of the item to update
 * @param updates - Partial updates to apply
 */
export async function updatePendingItem(
  id: string,
  updates: Partial<Omit<PendingItem, 'id' | 'createdAt'>>
): Promise<PendingItem | null> {
  try {
    const items = await getPendingItems();
    const index = items.findIndex((item) => item.id === id);

    if (index === -1) {
      return null;
    }

    items[index] = { ...items[index], ...updates };
    await chrome.storage.session.set({ [PENDING_ITEMS_KEY]: items });
    return items[index];
  } catch (error) {
    throw new StorageError(
      `Failed to update pending item: ${error instanceof Error ? error.message : String(error)}`,
      'updatePendingItem'
    );
  }
}

/**
 * Get the count of pending items (useful for badge updates)
 * @returns Number of pending items
 */
export async function getPendingItemsCount(): Promise<number> {
  try {
    const items = await getPendingItems();
    return items.length;
  } catch (error) {
    console.error('Failed to get pending items count:', error);
    return 0;
  }
}

/**
 * Generate a unique ID for pending items
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
