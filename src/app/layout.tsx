import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { Header, TopNav } from "@/components/layout"
import { Footer } from "@/components/layout/Footer"
import { Providers } from "@/components/layout/Providers"
import { PublicFontMain } from "@/components/layout/PublicFontMain"
import { PublicOnly } from "@/components/layout/PublicChrome"
import { BackToTop } from "@/components/layout/BackToTop"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "MJADC - Miah Jinnah Alam Degree College",
  description: "Official website of Miah Jinnah Alam Degree College",
  icons: { icon: "/college_logo.png" },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body className="flex min-h-screen flex-col antialiased">
        <Providers>
          {/* public banner, menu and footer are hidden on dashboard (panel) routes */}
          <PublicOnly>
            <Header />
            <TopNav />
          </PublicOnly>
          <PublicFontMain>{children}</PublicFontMain>
          <PublicOnly>
            <Footer />
            <BackToTop />
          </PublicOnly>
        </Providers>
      </body>
    </html>
  )
}
