import type { Metadata } from "next";
import { DJProvider } from "@/context/DJContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { VoiceProvider } from "@/context/VoiceContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "DJ Claude | v 0.1.18",
  description: "AI-powered live coding DJ - watch Claude write music in real-time",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🪩</text></svg>",
  },
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
