import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://personalmoneygoal.in"),
  title: "FinGoal — Will Your Life Math Work?",
  description:
    "Plan your wedding, house, kids, education, retirement — all on one salary. See if the math works and get your exact monthly money moves.",
  openGraph: {
    title: "FinGoal — Will Your Life Math Work?",
    description:
      "Plan your wedding, house, kids, education, retirement — all on one salary. See if the math works and get your exact monthly money moves.",
    url: "https://personalmoneygoal.in",
    siteName: "FinGoal",
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FinGoal — Will Your Life Math Work?",
    description:
      "Plan your wedding, house, kids, education, retirement — all on one salary. See if the math works and get your exact monthly money moves.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground" suppressHydrationWarning>
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
