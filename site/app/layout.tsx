import "./globals.css";
import { Inter } from "next/font/google";
import type { Metadata } from "next";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Agentation } from "agentation";

export const metadata: Metadata = {
  title: "mdtation, a terminal markdown viewer for the agentic era",
  description:
    "Read markdown full-screen in your terminal, leave inline comments, and copy a structured reference block straight into your CLI agent.",
  openGraph: {
    title: "mdtation",
    description: "Read. Comment. Paste into your agent.",
  },
};

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

/** Runs before paint so a saved dark choice never flashes. Light is the default. */
const boot = `(function(){try{if(localStorage.theme==="dark")document.documentElement.classList.add("dark")}catch(e){}})()`;

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: boot }} />
      </head>
      <body className="min-h-screen">
        <TooltipProvider>{children}</TooltipProvider>
        {process.env.NODE_ENV === "development" && <Agentation />}
      </body>
    </html>
  );
}
