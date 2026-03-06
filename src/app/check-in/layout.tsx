import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Event Check-In',
  description: 'Check in to your event',
};

export default function CheckInLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
