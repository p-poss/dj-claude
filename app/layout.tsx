import type { Metadata } from "next";
import { DJProvider } from "@/context/DJContext";
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
      <body className="antialiased">
        <DJProvider>
          {children}
        </DJProvider>
      </body>
    </html>
  );
}
