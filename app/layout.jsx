import "./globals.css";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Suspense } from "react";
import Rail from "../components/Rail";
import LastUpdate from "../components/LastUpdate";
import RowScroll from "../components/RowScroll";

// The two faces raindrop.ai loads from Google alongside AlphaLyrae, the same
// as Raindrop OS.
const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-sans",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata = {
  title: "Raindrop GTM OS",
  description:
    "Outbound in one place: pipeline, the signals feeding it, each channel, and the replies waiting on us.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`}>
      <body style={{ "--font-display": "AlphaLyrae" }}>
        <Rail />

        <div className="pointer-events-none fixed right-4 top-[62px] z-40 hidden md:right-6 md:top-5 md:block">
          <Suspense fallback={null}>
            <LastUpdate />
          </Suspense>
        </div>

        <main className="pt-[52px] transition-[padding] duration-150 md:pl-[var(--rail-w)] md:pt-0">
          {children}
          <RowScroll />
        </main>
      </body>
    </html>
  );
}
