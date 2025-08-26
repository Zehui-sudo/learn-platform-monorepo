// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { PageLayout } from "@/components/PageLayout";
import { SemanticModelPreloader } from "@/components/SemanticModelPreloader";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Project Dashboard",
  description: "My awesome project dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className={inter.className}>
        <PageLayout>{children}</PageLayout>
        <SemanticModelPreloader />
      </body>
    </html>
  );
}
