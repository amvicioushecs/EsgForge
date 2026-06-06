// src/app/layout.tsx
import React from "react";
import type { Metadata } from "next";
import { Manrope, Fraunces } from "next/font/google";
import "./globals.css";
import { ScriptExecutor } from "@/components/ScriptExecutor";
import { DevToolsHandler } from "@/components/DevToolsHandler";
import { GlobalErrorCatcher } from "@/components/GlobalErrorCatcher";
import { files } from "@/assets/files";

const manrope = Manrope({ variable: "--font-sans-brand", subsets: ["latin"], weight: ["300", "400", "500", "600", "700", "800"] });
const fraunces = Fraunces({ variable: "--font-serif-brand", subsets: ["latin"], weight: ["300", "400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "Verdant — ESG Compliance Automation for Shopify Plus",
  description: "Automate your sustainability compliance effortlessly. Audit-ready ESG reporting for Shopify Plus merchants.",
  icons: {
    icon: files.appIcon.url,
    shortcut: files.appIcon.url,
    apple: files.appIcon.url,
  },
};

// SUPER IMPORTANT: NOT EDIT THE FOLLOWING 2 LINES TO FORCE NEXT.JS TO RENDER DYNAMICALLY
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${manrope.variable} ${fraunces.variable} antialiased`}>
        <GlobalErrorCatcher />
        <ScriptExecutor />
        <DevToolsHandler />
        <div className="min-h-screen flex flex-col">
          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
