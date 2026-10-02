import { describe, expect, it } from 'vitest';
import { emptyProfile, type Profile } from '../shared/schema';
import { PROFILE_STORAGE_KEY, readLocalProfile, removeLocalProfile, writeLocalProfile } from '../src/profile/storage';

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, String(value)); }
  removeItem(key: string) { this.values.delete(key); }
  clear() { this.values.clear(); }
}

const exampleProfile: Profile = {
  ...emptyProfile,
  fullName: 'Alex Morgan',
  email: 'alex@example.com',
  phone: '555-0100',
  city: 'Portland',
  homeStation: 'Central Station',
};

describe('local profile storage', () => {
  it('persists a versioned profile and reloads it', () => {
    const storage = new MemoryStorage();

    expect(writeLocalProfile(exampleProfile, storage as unknown as Storage)).toBe(true);
    expect(JSON.parse(storage.getItem(PROFILE_STORAGE_KEY)!)).toEqual({ version: 1, completed: true, profile: exampleProfile });
    expect(readLocalProfile(storage as unknown as Storage)).toEqual({ profile: exampleProfile, completed: true, error: null });
  });

  it('deletes saved profile data', () => {
    const storage = new MemoryStorage();
    writeLocalProfile(exampleProfile, storage as unknown as Storage);

    expect(removeLocalProfile(storage as unknown as Storage)).toBe(true);
    expect(storage.getItem(PROFILE_STORAGE_KEY)).toBeNull();
    expect(readLocalProfile(storage as unknown as Storage)).toEqual({ profile: emptyProfile, completed: false, error: null });
  });

  it('keeps an explicitly completed empty profile completed after reload', () => {
    const storage = new MemoryStorage();

    expect(writeLocalProfile(emptyProfile, storage as unknown as Storage)).toBe(true);
    expect(readLocalProfile(storage as unknown as Storage)).toEqual({ profile: emptyProfile, completed: true, error: null });
  });

  it.each([
    ['malformed JSON', '{'],
    ['unsupported version', JSON.stringify({ version: 99, completed: true, profile: exampleProfile })],
    ['invalid profile fields', JSON.stringify({ version: 1, completed: true, profile: { fullName: 42 } })],
  ])('reports %s without replacing the stored value', (_label, contents) => {
    const storage = new MemoryStorage();
    storage.setItem(PROFILE_STORAGE_KEY, contents);

    const result = readLocalProfile(storage as unknown as Storage);
    expect(result.profile).toEqual(emptyProfile);
    expect(result.error).toMatch(/invalid|could not read/i);
    expect(storage.getItem(PROFILE_STORAGE_KEY)).toBe(contents);
  });

  it('does not report success when storage access is blocked', () => {
    const blocked = {
      getItem() { throw new Error('blocked'); },
      setItem() { throw new Error('blocked'); },
      removeItem() { throw new Error('blocked'); },
    } as unknown as Storage;

    expect(readLocalProfile(blocked).error).toMatch(/could not read/i);
    expect(writeLocalProfile(exampleProfile, blocked)).toBe(false);
    expect(removeLocalProfile(blocked)).toBe(false);
  });

  it('does not report success when a storage write cannot be read back', () => {
    const silentStorage = {
      getItem() { return null; },
      setItem() {},
      removeItem() {},
    } as unknown as Storage;

    expect(writeLocalProfile(exampleProfile, silentStorage)).toBe(false);
  });
});
