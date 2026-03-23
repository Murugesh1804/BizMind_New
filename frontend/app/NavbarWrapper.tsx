'use client';

import Navbar from '@/components/Navbar';
import { usePathname } from 'next/navigation';

export function NavbarWrapper() {
  const pathname = usePathname();
  const isDashboard = pathname?.startsWith('/dashboard');
  
  return !isDashboard ? <Navbar /> : null;
}
