import type { Metadata } from 'next';
import { IBM_Plex_Sans, Manrope } from 'next/font/google';
import './globals.css';

const body = IBM_Plex_Sans({ variable: '--font-body', subsets: ['latin'] });
const display = Manrope({ variable: '--font-display', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'E-commerce B2B | Confident cross-border buying',
  description:
    'A modern buying foundation for businesses importing from Dubai to Ethiopia.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${body.variable} ${display.variable}`}>{children}</body>
    </html>
  );
}
