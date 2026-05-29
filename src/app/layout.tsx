import type { Metadata } from "next";
import "./globals.css";
import { KeysProvider } from "@/components/KeysProvider";

export const metadata: Metadata = {
  title: "Culqi Test Store",
  description: "Tienda de prueba para validar la integración con Culqi",
  icons: {
    shortcut: "https://culqi.com/assets/images/brand/p-os-brand.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const envFallback = {
    pkTest: process.env.NEXT_PUBLIC_CULQI_PUBLIC_KEY?.startsWith("pk_test_")
      ? process.env.NEXT_PUBLIC_CULQI_PUBLIC_KEY
      : "",
    pkLive: process.env.NEXT_PUBLIC_CULQI_PUBLIC_KEY?.startsWith("pk_live_")
      ? process.env.NEXT_PUBLIC_CULQI_PUBLIC_KEY
      : "",
  };

  return (
    <html lang="es">
      <body className="min-h-screen antialiased">
        <KeysProvider envFallback={envFallback}>{children}</KeysProvider>
      </body>
    </html>
  );
}
