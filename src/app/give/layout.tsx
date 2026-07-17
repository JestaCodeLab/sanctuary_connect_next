import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Give Online',
  description: 'Give your tithe, offering, or project donation online',
};

export default function GiveLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
