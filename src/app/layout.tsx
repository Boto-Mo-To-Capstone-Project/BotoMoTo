import { Metadata } from 'next'
import ClientLayout from './client-layout'

export const metadata: Metadata = {
  title: 'Boto Mo To - Secure Online Voting System',
  description: 'Boto Mo To, Boses Mo To! A secure, fast, and reliable online voting system for small organizations.',
  keywords: ['online voting', 'filipino voters', 'secure voting', 'boto-mo-to', 'boto mo to', 'election system', 'voting platform', 'boto-mo-to.online', 'boto mo to online', 'BotoMoTo'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <ClientLayout>{children}</ClientLayout>
    </html>
  );
}
