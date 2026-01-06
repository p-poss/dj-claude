import type { Metadata } from "next";
import { DJProvider } from "@/context/DJContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { VoiceProvider } from "@/context/VoiceContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "Koto Demo #3",
  description: "AI-powered live coding DJ - watch Claude write music in real-time",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased crt-screen">
        <ThemeProvider>
          <VoiceProvider>
            <DJProvider>
              {children}
            </DJProvider>
          </VoiceProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
