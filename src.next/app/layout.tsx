import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Superheroo Admin',
  description: 'Internal admin console for Superheroo',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
