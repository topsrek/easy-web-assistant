import { emptyProfile, profileSchema, type Profile } from '../../shared/schema';
import { z } from 'zod/v3';

export const PROFILE_STORAGE_KEY = 'easy-web-assistant.profile';
const STORAGE_VERSION = 1;

const profileEnvelopeSchema = z.object({
  version: z.literal(STORAGE_VERSION),
  completed: z.boolean(),
  profile: profileSchema,
}).strict();

export type ProfileReadResult = {
  profile: Profile;
  completed: boolean;
  error: string | null;
};

function browserStorage(): Storage {
  if (typeof window === 'undefined') {
    throw new Error('Browser storage is unavailable.');
  }

  return window.localStorage;
}

export function readLocalProfile(storage?: Storage): ProfileReadResult {
  try {
    const saved = (storage ?? browserStorage()).getItem(PROFILE_STORAGE_KEY);
    if (saved === null) return { profile: emptyProfile, completed: false, error: null };

    const envelopeResult = profileEnvelopeSchema.safeParse(JSON.parse(saved));
    if (!envelopeResult.success) {
      return {
        profile: emptyProfile,
        completed: false,
        error: 'Saved profile data is invalid or from an unsupported version. Review it before saving a replacement.',
      };
    }

    return { profile: envelopeResult.data.profile, completed: envelopeResult.data.completed, error: null };
  } catch {
    return {
      profile: emptyProfile,
      completed: false,
      error: 'Your browser could not read the saved profile. It has not been changed.',
    };
  }
}

export function writeLocalProfile(profile: Profile, storage?: Storage): boolean {
  const parsed = profileSchema.safeParse(profile);
  if (!parsed.success) return false;

  try {
    const serialized = JSON.stringify({ version: STORAGE_VERSION, completed: true, profile: parsed.data });
    const target = storage ?? browserStorage();
    target.setItem(PROFILE_STORAGE_KEY, serialized);
    return target.getItem(PROFILE_STORAGE_KEY) === serialized;
  } catch {
    return false;
  }
}

export function removeLocalProfile(storage?: Storage): boolean {
  try {
    const target = storage ?? browserStorage();
    target.removeItem(PROFILE_STORAGE_KEY);
    return target.getItem(PROFILE_STORAGE_KEY) === null;
  } catch {
    return false;
  }
}
