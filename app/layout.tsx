import type { Metadata } from "next";
import { DJProvider } from "@/context/DJContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { VoiceProvider } from "@/context/VoiceContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "DJ Claude — AI-powered live coding music",
  description:
    "Watch AI write music in real-time. DJ Claude generates live Strudel patterns in your browser — 5 club themes, disco mode, voice DJ commentary. No API key or install needed.",
  metadataBase: new URL("https://claude.dj"),
  openGraph: {
    title: "DJ Claude — AI-powered live coding music",
    description:
      "Watch AI write music in real-time. Live Strudel patterns, 5 club themes, disco mode, voice DJ. No API key needed.",
    url: "https://claude.dj",
    siteName: "DJ Claude",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DJ Claude — AI-powered live coding music",
    description:
      "Watch AI write music in real-time. Live Strudel patterns, 5 club themes, disco mode, voice DJ. No API key needed.",
  },
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🪩</text></svg>",
  },
  keywords: [
    "dj claude",
    "ai music",
    "live coding",
    "strudel",
    "claude",
    "ai dj",
    "music generation",
    "anthropic",
  ],
  authors: [{ name: "Patrick Poss", url: "https://patrickposs.com" }],
  creator: "Patrick Poss",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "DJ Claude",
  url: "https://claude.dj",
  description:
    "The live music engine for AI agents. Multi-agent jam sessions, conductor mode, 22 presets. No API key or install needed.",
  applicationCategory: "MultimediaApplication",
  operatingSystem: "Any",
  author: {
    "@type": "Person",
    name: "Patrick Poss",
    url: "https://patrickposs.com",
  },
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  license: "https://opensource.org/licenses/MIT",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preload" href="https://unpkg.com/@strudel/repl@latest" as="script" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="antialiased">
        <ThemeProvider>
          <VoiceProvider>
            <DJProvider>
              <main>{children}</main>
            </DJProvider>
          </VoiceProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
