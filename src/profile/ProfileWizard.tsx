import { useState, type FormEvent } from 'react';
import { emptyProfile, profileSchema, type Profile } from '../../shared/schema';
import './profile.css';

type ProfileWizardProps = {
  initialProfile: Profile;
  onSave(profile: Profile): boolean;
  onClose?: () => void;
  storageError?: string | null;
};

const steps = ['About you', 'Your addresses', 'Your preferences'] as const;

export function ProfileWizard({ initialProfile, onSave, onClose, storageError = null }: ProfileWizardProps) {
  const [initial] = useState(() => profileSchema.safeParse(initialProfile ?? emptyProfile));
  const [profile, setProfile] = useState<Profile>(() => initial.success ? initial.data : emptyProfile);
  const [step, setStep] = useState(0);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(() => initial.success ? null : 'Some saved details are invalid. Review them before saving.');
  const [saved, setSaved] = useState(false);

  function update(field: keyof Profile, value: string) {
    setProfile((current) => ({ ...current, [field]: value }));
    setSaved(false);
    setSaveMessage(null);
    setFormError(null);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step < steps.length - 1) {
      setStep((current) => current + 1);
      return;
    }

    const validation = profileSchema.safeParse(profile);
    if (!validation.success) {
      setSaved(false);
      setFormError('Some details could not be used. Check each field and try again.');
      return;
    }

    let success = false;
    try {
      success = onSave(validation.data);
    } catch {
      success = false;
    }
    setSaved(success);
    setSaveMessage(success
      ? 'Your profile is saved in this browser. It does not authorize sharing your details with a website.'
      : 'Your profile could not be saved to this browser. Your changes are only available for this session.');
  }

  const input = (field: keyof Profile, label: string, options: { type?: string; optional?: boolean } = {}) => (
    <label className="profile-field" key={String(field)}>
      <span>{label}{options.optional ? ' (optional)' : ''}</span>
      <input
        type={options.type ?? 'text'}
        maxLength={field === 'email' ? 254 : 500}
        value={profile[field]}
        onChange={(event) => update(field, event.target.value)}
        autoComplete={field === 'fullName' ? 'name' : field === 'email' ? 'email' : field === 'phone' ? 'tel' : undefined}
      />
    </label>
  );

  const textarea = (field: keyof Profile, label: string) => (
    <label className="profile-field" key={String(field)}>
      <span>{label} (optional)</span>
      <textarea rows={3} maxLength={500} value={profile[field]} onChange={(event) => update(field, event.target.value)} />
    </label>
  );

  return (
    <section className="profile-wizard" aria-labelledby="profile-title">
      <header className="profile-wizard__header">
        <div>
          <p className="profile-wizard__eyebrow">Your details</p>
          <h2 id="profile-title">Set up your profile</h2>
        </div>
        {onClose && <button className="profile-button profile-button--quiet" type="button" onClick={onClose}>Close</button>}
      </header>

      <p className="profile-wizard__privacy">
        When you save, these details are stored in this browser. The assistant may process details needed for a task, and will ask before sending specific fields to a website.
      </p>

      <nav className="profile-steps" aria-label="Profile setup steps">
        {steps.map((label, index) => (
          <button
            type="button"
            key={label}
            className={`profile-steps__step${index === step ? ' is-current' : ''}${index < step ? ' is-complete' : ''}`}
            aria-current={index === step ? 'step' : undefined}
            onClick={() => setStep(index)}
          >
            <span className="profile-steps__number" aria-hidden="true">{index + 1}</span>{label}
          </button>
        ))}
      </nav>

      <form onSubmit={submit}>
      <div className="profile-fields" key={step}>
          {step === 0 && <>
            {input('fullName', 'Full name')}
            {input('email', 'Email address', { type: 'email' })}
            {input('phone', 'Phone number', { type: 'tel', optional: true })}
          </>}
          {step === 1 && <>
            <h3>Home address</h3>
            {input('street', 'Street address')}
            {input('city', 'City')}
            <div className="profile-fields__row">{input('postalCode', 'Postal code')}{input('country', 'Country')}</div>
            {textarea('deliveryAddress', 'Different delivery address')}
            {textarea('billingAddress', 'Different billing address')}
          </>}
          {step === 2 && <>
            {input('homeStation', 'Frequent departure station or stop', { optional: true })}
            {textarea('accessNeeds', 'Accessibility needs')}
            {textarea('appointmentPreference', 'Appointment preferences')}
          </>}
        </div>

        <div className="profile-storage-note">
          <strong>Stored in this browser after saving</strong>
          <span>Your profile is not shared automatically. You can change or delete it at any time.</span>
        </div>

        {(formError || storageError || saveMessage) && (
          <p className={`profile-notice${saved ? ' profile-notice--success' : ''}`} role={saved ? 'status' : 'alert'}>
            {formError ?? saveMessage ?? storageError}
          </p>
        )}

        <footer className="profile-wizard__actions">
          <button className="profile-button profile-button--quiet" type="button" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0}>
            Back
          </button>
          {step < steps.length - 1 ? (
            <button className="profile-button profile-button--primary" type="submit">Continue</button>
          ) : (
            <button className="profile-button profile-button--primary" type="submit">Save profile</button>
          )}
        </footer>
      </form>
    </section>
  );
}
