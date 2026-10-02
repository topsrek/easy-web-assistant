import { randomUUID } from 'node:crypto';
import type { Offer, Profile } from '../shared/schema.js';
import { ApprovalGate, detailsFor, type ApprovalBinding, type IssuedApproval } from './approval.js';
import { BrowserSession } from './browser.js';

export interface PreparedAction {
  binding: ApprovalBinding;
  approval: IssuedApproval;
  transmittedFields: Array<{ label: string; value: string }>;
  actionLabel: string;
  consequences: string[];
}

export type FixtureAction = 'test_booking' | 'test_appointment_request' | 'test_service_request' | 'test_enrollment_request';
export interface ProviderActionMetadata {
  actionLabel: string;
  consequences: string[];
}
type Grant = { capability: string; sessionId: string; offerId: string; action: FixtureAction; inputs: Record<string, string>; consumed: boolean };
type SubmitResult = { state: 'confirmed' | 'unclear'; reference?: string; outcome?: 'booking_confirmed' | 'request_received' };
const actionForKind: Record<Offer['kind'], FixtureAction> = {
  event: 'test_booking', journey: 'test_booking', appointment: 'test_booking',
  government: 'test_appointment_request', service: 'test_service_request', leisure: 'test_enrollment_request',
};
const defaultActionLabel: Record<Offer['kind'], string> = {
  event: 'Confirm test booking', journey: 'Request this test journey', appointment: 'Request this test appointment',
  government: 'Send test request', service: 'Send test service request', leisure: 'Request a test place',
};

/** Sole finalizer for a single explicitly approved controlled-fixture mutation. */
export class ToolBroker {
  private stopped = false;
  private submitting = false;
  private generation = 0;
  private grant?: Grant;
  private active?: Promise<SubmitResult>;

  constructor(private readonly browser: BrowserSession, private readonly gate: ApprovalGate) {}

  async prepare(offer: Offer, version: number, profile: Profile, provider?: ProviderActionMetadata): Promise<PreparedAction> {
    if (this.submitting) throw new Error('An action is already in progress.');
    this.stopped = false;
    this.grant = undefined;
    this.gate.invalidate();
    const preparationGeneration = this.generation;
    const liveOffers = await this.browser.readOffers(offer.kind);
    if (preparationGeneration !== this.generation || this.stopped) throw new Error('This review is no longer current. Please choose your option again.');
    const live = liveOffers.find((candidate) => candidate.id === offer.id && candidate.kind === offer.kind);
    // The controller places the exact normalized offer into the session fixture.
    // Compare the whole canonical snapshot in both directions so removals and additions
    // to fees, facts, conditions, images, provenance, or amounts all invalidate review.
    if (!live || canonical(live) !== canonical(offer)) {
      throw new Error('That option is no longer current. Please search again.');
    }
    const action = actionForKind[offer.kind];
    if (provider && (!provider.actionLabel?.trim() || !provider.consequences?.length)) throw new Error('Provider action details are incomplete.');
    const inputs = detailsFor(offer.kind, profile);
    const binding: ApprovalBinding = {
      action, site: this.browser.fixtureOrigin, offerId: offer.id, inputs,
      amounts: { price: offer.price, currency: offer.currency, unknownCosts: [...offer.unknownCosts] }, version,
    };
    const approval = this.gate.issue(binding);
    return {
      binding, approval,
      transmittedFields: Object.entries(inputs).map(([label, value]) => ({ label, value })),
      actionLabel: provider?.actionLabel ?? defaultActionLabel[offer.kind],
      consequences: provider?.consequences ?? [
        `This will place one test booking with ${offer.provider}.`,
        offer.price === null ? 'The provider has not confirmed a price.' : `Listed amount: ${offer.currency} ${offer.price}.`,
        ...offer.unknownCosts.map((item) => `Unknown: ${item}`),
        'This is fictional test data; no real payment will be taken.',
      ],
    };
  }

  submit(token: string, binding: ApprovalBinding): Promise<SubmitResult> {
    if (this.submitting) return Promise.reject(new Error('An action is already in progress.'));
    if (this.stopped) return Promise.reject(new Error('The action was stopped before submission.'));
    let issued: IssuedApproval;
    try { issued = this.gate.consume(token, binding); }
    catch (error) { return Promise.reject(error); }
    if (issued.digest.length !== 64 || binding.site !== this.browser.fixtureOrigin || !isFixtureAction(binding.action)) {
      return Promise.reject(new Error('This review is no longer current. Please choose your option again.'));
    }
    this.submitting = true;
    const grant: Grant = { capability: randomUUID(), sessionId: this.browser.sessionId, offerId: binding.offerId,
      action: binding.action, inputs: { ...binding.inputs }, consumed: false };
    this.grant = grant;
    const operation = this.performSubmit(binding, grant);
    this.active = operation;
    void operation.finally(() => {
      if (this.active === operation) this.active = undefined;
      this.submitting = false;
      if (this.grant === grant) this.grant = undefined;
    }).catch(() => undefined);
    return operation;
  }

  /** Called only by the local fixture POST before it records any mutation. */
  authorizeFixtureSubmission(sessionId: string, offerId: string, inputs: Record<string, string>, capability?: string, action?: string): boolean {
    const grant = this.grant;
    if (!grant || grant.consumed || !capability || capability !== grant.capability || this.stopped ||
        sessionId !== grant.sessionId || !this.browser.ownsSession(sessionId) || offerId !== grant.offerId || action !== grant.action || !sameRecord(inputs, grant.inputs)) return false;
    grant.consumed = true;
    return true;
  }

  /** Stop prevents an action that has not started. In-flight outcomes stay subject to verification. */
  stop() {
    this.generation += 1;
    this.stopped = true;
    this.gate.invalidate();
    if (!this.submitting) this.grant = undefined;
  }

  async reset() {
    this.stop();
    const active = this.active;
    if (active) await active.catch(() => undefined);
    this.grant = undefined;
    this.submitting = false;
    this.stopped = false;
  }

  private async performSubmit(binding: ApprovalBinding, grant: Grant): Promise<SubmitResult> {
    // The capability is created for this one call and never returned to the controller/UI.
    if (this.stopped) return { state: 'unclear' };
    try {
      const result = await this.browser.submitPrepared(binding, grant.capability);
      if (result.reference && result.outcome === expectedOutcome(binding.action) &&
          await this.browser.checkResult(binding, result.reference, result.outcome, grant.capability)) {
        return { state: 'confirmed', reference: result.reference, outcome: result.outcome };
      }
    } catch {
      // A failed response may follow a committed POST. Continue with a read-only state check.
    }
    // One read-only lookup resolves a lost response if the provider recorded the action.
    try {
      const current = await this.browser.checkCurrentResult(binding, grant.capability);
      if (current && current.outcome === expectedOutcome(binding.action) &&
          await this.browser.checkResult(binding, current.reference, current.outcome, grant.capability)) {
        return { state: 'confirmed', reference: current.reference, outcome: current.outcome };
      }
    } catch { /* Failure to verify remains unclear; never send another POST. */ }
    return { state: 'unclear' };
  }
}

function isFixtureAction(action: string): action is FixtureAction {
  return ['test_booking', 'test_appointment_request', 'test_service_request', 'test_enrollment_request'].includes(action);
}
function expectedOutcome(action: string): 'booking_confirmed' | 'request_received' {
  return action === 'test_booking' ? 'booking_confirmed' : 'request_received';
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

function sameRecord(left: Record<string, string>, right: Record<string, string>) {
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  return leftKeys.length === rightKeys.length && leftKeys.every((key, index) => key === rightKeys[index] && left[key] === right[key]);
}
