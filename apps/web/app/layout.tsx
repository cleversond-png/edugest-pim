import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { PlaceholderInjector } from "./placeholder-injector";
import "./globals.css";
import "./placeholder.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EduGest PIM | Análise de Oportunidades",
  description: "Sistema de análise e recomendação de soluções para vendas",
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
      <body className="min-h-full flex flex-col">
        <PlaceholderInjector />
        {children}
      </body>
    </html>
  );
}
