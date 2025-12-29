import type { Metadata } from "next";
import { DJProvider } from "@/context/DJContext";
import { ThemeProvider } from "@/context/ThemeContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "DJ Claude",
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
          <DJProvider>
            {children}
          </DJProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
