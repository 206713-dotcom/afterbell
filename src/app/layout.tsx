import type { Metadata } from "next";
import { cookies } from "next/headers";
import { AppProvider } from "@/components/store";
import localFont from "next/font/local";
import "./globals.css";
import "./refresh.css";
import "./navigation.css";
import "./places-social.css";
import "./polish.css";
import "./typography.css";
const sans = localFont({
  src: "./fonts/dm-sans.ttf",
  variable: "--font-sans",
  display: "swap",
  weight: "100 1000",
});
const editorial = localFont({
  src: "./fonts/instrument-serif-italic.ttf",
  variable: "--font-editorial",
  display: "swap",
  weight: "400",
  style: "italic",
});
export const metadata: Metadata = {
  title: {
    default: "afterbell. — Find your people. Make it happen.",
    template: "%s | afterbell.",
  },
  description:
    "A little spark can bring people together. Discover study circles, badminton, and community activities across Malaysia — and unlock what makes them possible.",
};
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jar = await cookies();
  const demo =
    process.env.NEXT_PUBLIC_ENABLE_DEMO !== "false" &&
    jar.get("afterbell-demo")?.value === "1";
  return (
    <html lang="en-MY" className={`${sans.variable} ${editorial.variable}`}>
      <body>
        <AppProvider demo={demo}>{children}</AppProvider>
      </body>
    </html>
  );
}
