import "@/styles/globals.css";
import { AppChrome } from "@/components/app-chrome";
import { Footer } from "@/components/footer";
import { GuestLinkClaimer } from "@/components/guest-link-claimer";
import { Header } from "@/components/header";
import { ProjectUrlProvider } from "@/components/project-url-provider";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";
import { getServerAuthSession } from "@/server/auth";
import { TRPCReactProvider } from "@/trpc/react";
import { Fraunces, IBM_Plex_Mono, Onest } from "next/font/google";
import { headers } from "next/headers";

const sans = Onest({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const display = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata = {
  title: "Wub - Link Shortener",
  description:
    "Paste a long link, get a short one. Free, open source, with click analytics.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerAuthSession();
  const headerList = await headers();
  const host =
    headerList.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    headerList.get("host")?.trim() ||
    undefined;
  const protocol = headerList.get("x-forwarded-proto")?.split(",")[0]?.trim();

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`font-sans ${sans.variable} ${display.variable} ${mono.variable}`}
      >
        <Providers>
          <ProjectUrlProvider host={host} protocol={protocol}>
            <TRPCReactProvider>
              <AppChrome header={<Header />} footer={<Footer />}>
                {children}
              </AppChrome>
              {session && <GuestLinkClaimer />}
              <Toaster position="bottom-center" />
            </TRPCReactProvider>
          </ProjectUrlProvider>
        </Providers>
      </body>
    </html>
  );
}
