import "@/styles/globals.css";

import { Inter } from "next/font/google";

import { TRPCReactProvider } from "@/trpc/react";
import { Header } from "@/components/header";
import { Toaster } from "sonner";
import { Footer } from "@/components/footer";
import { SpeedInsights } from "@vercel/speed-insights/next"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata = {
  title: "Wub - Link Shortener",
  description: "Short links that change the world.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`font-sans ${inter.variable}`}>
        <TRPCReactProvider>
          <>
            <div className="flex flex-col min-h-[100dvh]">
              <Header />
              <main className="flex-1 bg-gray-50">
                {children}
              </main>
            </div>
            <Toaster />
          </>
        </TRPCReactProvider>
        <Footer />
        <SpeedInsights />
      </body>
    </html >
  );
}
