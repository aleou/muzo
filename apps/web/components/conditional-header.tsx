'use client';

import { usePathname } from 'next/navigation';
import type { Session } from 'next-auth';
import { SiteHeader } from './site-header';

type ConditionalHeaderProps = {
  session: Session | null;
};

export function ConditionalHeader({ session }: ConditionalHeaderProps) {
  const pathname = usePathname();
  
  // Show landing navigation only on the home page
  const showLandingNav = pathname === '/';

  return <SiteHeader showLandingNav={showLandingNav} session={session} />;
}
