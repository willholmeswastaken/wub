import "@/styles/globals.css";
import { AppChrome } from "@/components/app-chrome";
import { Footer } from "@/components/footer";
import { GuestLinkClaimer } from "@/components/guest-link-claimer";
import { Header } from "@/components/header";
import { ProjectUrlProvider } from "@/components/project-url-provider";
import { getServerAuthSession } from "@/server/auth";
import { TRPCReactProvider } from "@/trpc/react";
import { Inter } from "next/font/google";
import { headers } from "next/headers";
import { Toaster } from "sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
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
    <html lang="en">
      <body className={`font-sans ${inter.variable}`}>
        <ProjectUrlProvider host={host} protocol={protocol}>
          <TRPCReactProvider>
            <AppChrome header={<Header />} footer={<Footer />}>
              {children}
            </AppChrome>
            {session && <GuestLinkClaimer />}
            <Toaster />
          </TRPCReactProvider>
        </ProjectUrlProvider>
      </body>
    </html>
  );
}
