import { SplashScreen } from "@/components/brand/splash-screen";
import { CategoriesProvider } from "@/components/categories/categories-provider";
import { TransactionsProvider } from "@/components/dashboard/transactions-provider";
import { GoalsProvider } from "@/components/goals/goals-provider";
import { TargetsProvider } from "@/components/targets/targets-provider";
import { AppToaster } from "@/components/brand/app-toaster";
import { SmoothScroll } from "@/components/layout/smooth-scroll";
import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter, Noto_Sans_Bengali } from "next/font/google";
import "lenis/dist/lenis.css";
import "./globals.css";

/*
 * Type: on Apple devices the app uses the system fonts — SF Pro for text and
 * SF Pro Rounded for big numbers (see --font-sans / --font-display in
 * globals.css). Apple doesn't license SF for embedding, so nothing is
 * downloaded for it; Inter, its closest open match, stands in elsewhere.
 */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

/*
 * Only here for the taka sign (৳), which SF Pro and Inter don't include —
 * without it the browser borrows a mismatched glyph. Not preloaded: it is
 * fetched only when a ৳ actually renders.
 */
const bengali = Noto_Sans_Bengali({
  variable: "--font-bengali",
  subsets: ["bengali"],
  preload: false,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pulse",
  description: "Track your income and spending at a glance.",
  appleWebApp: {
    title: "Pulse",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  // Matches the top of the hero so the status bar blends into it.
  themeColor: "#0d2a6b",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  // Draw edge to edge, under the status bar and home indicator. Every screen
  // pads itself with env(safe-area-inset-*) so nothing ends up beneath them.
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      // `app-loading` keeps the page blurred behind the splash screen until it
      // reveals it (see .reveal-target in globals.css).
      className={`dark app-loading ${inter.variable} ${bengali.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
      style={{ colorScheme: "dark" }}
    >
      <body className="min-h-full flex flex-col">
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
        >
          <div className="absolute -top-32 -left-24 size-96 rounded-full bg-white/7 blur-2xl" />
          <div className="absolute top-1/3 -right-32 size-112 rounded-full bg-white/5 blur-2xl" />
          <div className="absolute bottom-0 left-1/4 size-80 rounded-full bg-white/6 blur-2xl" />
        </div>
        <CategoriesProvider>
          <TransactionsProvider>
            <SplashScreen />
            <TargetsProvider>
              <GoalsProvider>
                <SmoothScroll>{children}</SmoothScroll>
              </GoalsProvider>
            </TargetsProvider>
          </TransactionsProvider>
        </CategoriesProvider>
        <AppToaster />
      </body>
    </html>
  );
}
