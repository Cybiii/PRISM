import '@/app/ui/global.css';
import { inter } from '@/app/ui/fonts'
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'PUMA Dashboard'
}

export const viewport = {
  width: 'device-width',
  initialScale: 1
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>{children}</body>
    </html>
  );
}
