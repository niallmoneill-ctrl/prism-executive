import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Prism Executive | Neuroscience-Based Executive Search',
  description: 'Ireland\'s award-winning executive search partner combining 30 years of recruitment expertise with neuroscience-backed behavioural assessment. Founded by Orla Brennan.',
  keywords: 'executive search, recruitment, Ireland, neuroscience, behavioural assessment, C-Suite, leadership',
  openGraph: {
    title: 'Prism Executive | Hire With Science',
    description: 'Neuroscience-backed executive search and behavioural assessment platform.',
    url: 'https://prismexecutivesearch.com',
    siteName: 'Prism Executive',
    locale: 'en_IE',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
