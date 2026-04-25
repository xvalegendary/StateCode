import type { Metadata } from "next";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { BannedRedirect } from "@/components/layout/banned-redirect";
import { BootLoader } from "@/components/layout/boot-loader";
import { Navbar } from "@/components/layout/navbar";
import "./globals.css";
import { cn } from "@/lib/utils";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans"
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono"
});

export const metadata: Metadata = {
  title: "StateCode",
  description: "StateCode online judge control surface and competition workspace."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(spaceGrotesk.variable, jetbrainsMono.variable)}
    >
      <body className={`${spaceGrotesk.variable} ${jetbrainsMono.variable}`}>
        <BannedRedirect />
        <BootLoader />
        <Navbar />
        {children}
      </body>
    </html>
  );
}
