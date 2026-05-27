import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
