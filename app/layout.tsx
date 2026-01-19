import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Providers } from '@/app/providers';
import { EcosystemClient } from '@/app/components/EcosystemClient';

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: 'Whisperr ID - Premium Identity Management',
  description: 'The root of your digital identity. Manage your secure access and passkeys with professional reliability.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`}>
      <head>
        <link rel="preconnect" href="https://fra.cloud.appwrite.io" />
      </head>
      <body className="antialiased">
        <EcosystemClient nodeId="id" />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

