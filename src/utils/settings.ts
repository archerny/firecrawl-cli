/**
 * Persistent settings storage utility
 * Stores application settings (API key, API URL, data directory) in platform-specific config directories
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface StoredSettings {
  apiKey?: string;
  apiUrl?: string;
  dataDir?: string;
}

/**
 * Get the platform-specific config directory
 */
function getConfigDir(): string {
  const homeDir = os.homedir();
  const platform = os.platform();

  if (platform === 'win32') {
    return path.join(homeDir, 'AppData', 'Roaming', 'firecrawl-cli');
  }

  // macOS, Linux and others
  return path.join(homeDir, '.config', 'firecrawl-cli');
}

/**
 * Get the settings file path
 */
function getSettingsPath(): string {
  return path.join(getConfigDir(), 'settings.json');
}

/**
 * Ensure the config directory exists
 */
function ensureConfigDir(): void {
  const configDir = getConfigDir();
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true, mode: 0o700 }); // rwx------
  }
}

/**
 * Set file permissions to be readable/writable only by the owner
 */
function setSecurePermissions(filePath: string): void {
  try {
    fs.chmodSync(filePath, 0o600); // rw-------
  } catch (error) {
    // Ignore errors on Windows or if file doesn't exist
  }
}

/**
 * Load settings from OS storage
 */
export function loadSettings(): StoredSettings | null {
  try {
    const settingsPath = getSettingsPath();
    if (!fs.existsSync(settingsPath)) {
      return null;
    }

    const data = fs.readFileSync(settingsPath, 'utf-8');
    const settings = JSON.parse(data) as StoredSettings;
    return settings;
  } catch (error) {
    // If file is corrupted or unreadable, return null
    return null;
  }
}

/**
 * Save settings to OS storage
 */
export function saveSettings(settings: StoredSettings): void {
  try {
    ensureConfigDir();
    const settingsPath = getSettingsPath();

    // Read existing settings and merge
    const existing = loadSettings();
    const merged: StoredSettings = {
      ...existing,
      ...settings,
    };

    // Write to file
    fs.writeFileSync(settingsPath, JSON.stringify(merged, null, 2), 'utf-8');

    // Set secure permissions
    setSecurePermissions(settingsPath);
  } catch (error) {
    throw new Error(
      `Failed to save settings: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Delete stored settings
 */
export function deleteSettings(): void {
  try {
    const settingsPath = getSettingsPath();
    if (fs.existsSync(settingsPath)) {
      fs.unlinkSync(settingsPath);
    }
  } catch (error) {
    throw new Error(
      `Failed to delete settings: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get the config directory path (for informational purposes)
 */
export function getConfigDirectoryPath(): string {
  return getConfigDir();
}
