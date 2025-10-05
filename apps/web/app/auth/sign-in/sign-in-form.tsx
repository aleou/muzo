'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export type SignInState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
};

const INITIAL_STATE: SignInState = {
  status: 'idle',
};

interface SignInFormProps {
  action: (state: SignInState, formData: FormData) => Promise<SignInState>;
  hasGoogleProvider: boolean;
  googleAction?: () => Promise<void>;
}

export function SignInForm({ action, hasGoogleProvider, googleAction }: SignInFormProps) {
  const [state, formAction] = useFormState(action, INITIAL_STATE);

  return (
    <>
      <form action={formAction} className="space-y-4">
        {state.status !== 'idle' && state.message ? (
          <p
            role="status"
            className={`rounded-md border px-4 py-2 text-sm ${
              state.status === 'success'
                ? 'border-emerald-500/70 bg-emerald-500/10 text-emerald-100'
                : 'border-rose-500/70 bg-rose-500/10 text-rose-100'
            }`}
          >
            {state.message}
          </p>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" placeholder="vous@example.com" required disabled={state.status === 'success'} />
        </div>
        <SubmitButton disabled={state.status === 'success'} />
      </form>
      {hasGoogleProvider && googleAction ? (
        <form action={googleAction} className="pt-2">
          <Button type="submit" variant="secondary" className="w-full">
            Se connecter avec Google
          </Button>
        </form>
      ) : null}
    </>
  );
}

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full" disabled={disabled || pending}>
      {pending ? 'Envoi en cours...' : 'Recevoir le lien de connexion'}
    </Button>
  );
}
