import { Metadata } from 'next';
import { AuthError } from 'next-auth';
import { signIn } from '@/auth';
import { getAuthConfig } from '@/lib/auth/config';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { SignInForm, type SignInState } from './sign-in-form';

export const metadata: Metadata = {
  title: 'Connexion',
};

const authConfig = getAuthConfig();
const hasGoogleProvider = Boolean(authConfig.oauth.google);

export default function SignInPage() {
  async function handleEmailSignIn(_prevState: SignInState, formData: FormData): Promise<SignInState> {
    'use server';

    const emailValue = formData.get('email');
    if (!emailValue || typeof emailValue !== 'string') {
      return {
        status: 'error',
        message: 'Adresse email invalide. Verifiez le format.',
      };
    }

    const email = emailValue.trim().toLowerCase();

    try {
      const result = await signIn('email', {
        email,
        redirectTo: '/dashboard',
        redirect: false,
      });

      if (isSignInResponse(result) && result.error) {
        return {
          status: 'error',
          message: getReadableErrorMessage(result.error),
        };
      }

      return {
        status: 'success',
        message:
          'Si un compte correspond a cette adresse, vous recevrez un lien de connexion dans les prochaines minutes.',
      };
    } catch (error) {
      if (error instanceof AuthError) {
        return {
          status: 'error',
          message: getReadableErrorMessage(error.type),
        };
      }

      console.error('[auth] Unexpected email sign-in error', error);
      return {
        status: 'error',
        message: 'Une erreur inattendue est survenue. Veuillez reessayer dans quelques instants.',
      };
    }
  }

  async function handleGoogleSignIn() {
    'use server';
    await signIn('google', { redirectTo: '/dashboard' });
  }

  return (
    <main className="flex flex-1 items-center justify-center py-24">
      <Card className="w-full max-w-md space-y-6 text-left">
        <div className="space-y-2">
          <CardTitle>Ravi de vous revoir</CardTitle>
          <CardDescription>
            Recevez un lien magique par email pour acceder a votre espace MUZO.
          </CardDescription>
        </div>
        <SignInForm
          action={handleEmailSignIn}
          hasGoogleProvider={hasGoogleProvider}
          googleAction={hasGoogleProvider ? handleGoogleSignIn : undefined}
        />
      </Card>
    </main>
  );
}

function isSignInResponse(value: unknown): value is { error?: string | null } {
  return typeof value === 'object' && value !== null && 'error' in value;
}

function getReadableErrorMessage(code?: string | null) {
  switch (code) {
    case 'AccessDenied':
      return 'Acces refuse pour cette adresse. Contactez le support si le probleme persiste.';
    case 'Verification':
      return 'Impossible de generer le lien de connexion. Reessayez dans quelques instants.';
    case 'OAuthAccountNotLinked':
      return 'Cette adresse est deja liee a un autre fournisseur. Utilisez le meme mode de connexion.';
    case 'Configuration':
      return "La configuration de l'authentification semble incomplete. Reessayez plus tard.";
    case 'CredentialsSignin':
      return 'Identifiants invalides.';
    case 'AdapterError':
      return "Le service d'authentification est indisponible temporairement. Reessayez un peu plus tard.";
    default:
      return "Une erreur s'est produite lors de l'envoi du lien. Reessayez dans quelques instants.";
  }
}
