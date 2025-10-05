import { Metadata } from 'next';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Lien envoye',
};

export default function VerifyRequestPage() {
  return (
    <main className="flex flex-1 items-center justify-center py-24">
      <Card className="w-full max-w-md space-y-3 text-left">
        <CardTitle>Verifiez votre boite mail</CardTitle>
        <CardDescription>
          Nous venons d&apos;envoyer un lien de connexion. Ouvrez-le depuis votre boite mail pour acceder a votre espace MUZO.
        </CardDescription>
      </Card>
    </main>
  );
}

