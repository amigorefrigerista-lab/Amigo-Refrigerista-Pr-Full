import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Amigo Refrigerista Full",
  description: "Ferramenta de aministração para técnicos de Refrigeração e Climatização.",
  openGraph: {
    title: "Amigo Refrigerista Full",
    description: "Ferramenta de aministração para técnicos de Refrigeração e Climatização.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#070e1c",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="bg-[#070e1c] text-slate-100 min-h-screen overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
