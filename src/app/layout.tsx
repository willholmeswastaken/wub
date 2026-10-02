import "@/styles/globals.css";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { ProjectUrlProvider } from "@/components/project-url-provider";
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
  description: "Short links that change the world.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
            <div className="flex min-h-[100dvh] flex-col">
              <Header />
              <main className="flex-1 bg-gray-50">{children}</main>
              <Footer />
            </div>
            <Toaster />
          </TRPCReactProvider>
        </ProjectUrlProvider>
      </body>
    </html>
  );
}
