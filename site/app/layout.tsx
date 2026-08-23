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

/** Dev-only corner badge naming the active Tailwind breakpoint. Ported from openindex. */
function Breakpoint() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed top-0.5 right-0.5 z-[9999] rounded bg-black/55 px-1.5 py-0.5 font-mono text-[10px] leading-none tracking-tight text-white/55"
    >
      <span className="sm:hidden">xs</span>
      <span className="hidden sm:inline md:hidden">sm</span>
      <span className="hidden md:inline lg:hidden">md</span>
      <span className="hidden lg:inline xl:hidden">lg</span>
      <span className="hidden xl:inline 2xl:hidden">xl</span>
      <span className="hidden 2xl:inline">2xl</span>
    </div>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: boot }} />
      </head>
      <body className="min-h-screen">
        <TooltipProvider>{children}</TooltipProvider>
        {process.env.NODE_ENV === "development" && <Agentation />}
        {process.env.NODE_ENV === "development" && <Breakpoint />}
      </body>
    </html>
  );
}
