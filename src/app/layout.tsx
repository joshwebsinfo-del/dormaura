import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Toaster } from "react-hot-toast";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "DormAura — Your Boarding House Ecosystem",
  description:
    "Connect with your dorm mates — posts, polls, live calls, marketplace & more. Your private boarding house social platform.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "DormAura",
  },
  keywords: ["boarding house", "student platform", "DormAura", "dorm social", "house call"],
  openGraph: {
    title: "DormAura",
    description: "Your private boarding house ecosystem",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#050508",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="DormAura" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function(err) {
                    console.log('SW registration failed:', err);
                  });
                });
              }
            `,
          }}
        />
      </head>
      <body
        className={`${inter.variable} ${outfit.variable} font-sans antialiased bg-nest-black min-h-screen overflow-x-hidden`}
      >
        <Providers>
          {children}
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: "rgba(13,13,26,0.95)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(0,245,255,0.2)",
                color: "#ffffff",
                borderRadius: "12px",
                padding: "12px 16px",
                fontSize: "14px",
              },
              success: {
                iconTheme: {
                  primary: "#00f5ff",
                  secondary: "#050508",
                },
              },
              error: {
                iconTheme: {
                  primary: "#f43f5e",
                  secondary: "#050508",
                },
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
