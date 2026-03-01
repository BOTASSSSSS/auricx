import type { Metadata } from "next";
import { Sora } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { ToastProvider } from "@/lib/toast";
import { Header } from "@/components/Header";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AURICX — CS2 Skins Perps & Prediction Markets",
  description: "Trade CS2 skin perpetuals and prediction markets",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={sora.variable}>
      <body className="font-sora min-h-screen">
        <StoreProvider>
          <ToastProvider>
            <Header />
            <main className="mx-auto max-w-7xl px-4 lg:px-6 py-6">{children}</main>
          </ToastProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
