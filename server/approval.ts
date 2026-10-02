import { createHash, randomUUID } from 'node:crypto';
import type { Offer, Profile } from '../shared/schema.js';

export interface ApprovalBinding {
  action: string;
  site: string;
  offerId: string;
  inputs: Record<string, string>;
  amounts: { price: number | null; currency: string; unknownCosts: string[] };
  version: number;
}

export interface IssuedApproval {
  token: string;
  version: number;
  offerId: string;
  expiresAt: number;
  binding: ApprovalBinding;
  digest: string;
}

const TTL_MS = 5 * 60_000;

/** Authorization is an exact, one-use binding owned by the controller. */
export class ApprovalGate {
  private approval: IssuedApproval | undefined;

  invalidate() { this.approval = undefined; }

  issue(binding: ApprovalBinding, now = Date.now()): IssuedApproval {
    validateBinding(binding);
    const snapshot = cloneBinding(binding);
    const digest = bindingDigest(snapshot);
    const approval = {
      token: randomUUID(), version: snapshot.version, offerId: snapshot.offerId,
      expiresAt: now + TTL_MS, binding: snapshot, digest,
    };
    this.approval = approval;
    return cloneApproval(approval);
  }

  consume(token: string, binding: ApprovalBinding, now = Date.now()): IssuedApproval {
    const current = this.approval;
    if (!current || token !== current.token || now >= current.expiresAt || !isBinding(binding) ||
        bindingDigest(binding) !== current.digest || canonical(binding) !== canonical(current.binding)) {
      throw new Error('This review is no longer current. Please choose your option again.');
    }
    // Clear before returning so concurrent or repeated consumes cannot both succeed.
    this.approval = undefined;
    return cloneApproval(current);
  }
}

/** Explicit allowlist of fields transferred by each flow. */
export function detailsFor(kind: Offer['kind'], profile: Profile): Record<string, string> {
  const fields: Record<string, string> = { 'Full name': profile.fullName, Email: profile.email };
  if (kind === 'appointment') { fields.Phone = profile.phone; fields['Access needs'] = profile.accessNeeds; }
  if (kind === 'journey') fields['Access needs'] = profile.accessNeeds;
  if (kind === 'service') fields.Phone = profile.phone;
  return Object.fromEntries(Object.entries(fields).filter(([, value]) => value.trim()));
}

function validateBinding(binding: ApprovalBinding): void {
  if (!isBinding(binding)) throw new Error('The approved action details are invalid.');
}
function isBinding(value: unknown): value is ApprovalBinding {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const b = value as Partial<ApprovalBinding>;
  const amounts = b.amounts;
  return typeof b.action === 'string' && b.action.length > 0 && typeof b.site === 'string' && b.site.length > 0 &&
    typeof b.offerId === 'string' && b.offerId.length > 0 && Number.isSafeInteger(b.version) && (b.version as number) >= 0 &&
    !!b.inputs && typeof b.inputs === 'object' && !Array.isArray(b.inputs) &&
    Object.entries(b.inputs).every(([key, input]) => key.length <= 200 && typeof input === 'string' && input.length <= 3000) &&
    !!amounts && typeof amounts.currency === 'string' &&
    (amounts.price === null || (typeof amounts.price === 'number' && Number.isFinite(amounts.price) && amounts.price >= 0)) &&
    Array.isArray(amounts.unknownCosts) && amounts.unknownCosts.every((item) => typeof item === 'string');
}
function cloneBinding(binding: ApprovalBinding): ApprovalBinding {
  return { action: binding.action, site: binding.site, offerId: binding.offerId,
    inputs: { ...binding.inputs }, amounts: { price: binding.amounts.price, currency: binding.amounts.currency, unknownCosts: [...binding.amounts.unknownCosts] },
    version: binding.version };
}
function cloneApproval(approval: IssuedApproval): IssuedApproval {
  return { ...approval, binding: cloneBinding(approval.binding) };
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}
function bindingDigest(binding: ApprovalBinding): string {
  return createHash('sha256').update(canonical(binding)).digest('hex');
}
