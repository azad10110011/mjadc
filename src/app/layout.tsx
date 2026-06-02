import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { Header } from "@/components/layout/Header"
import { Footer } from "@/components/layout/Footer"
import { Providers } from "@/components/layout/Providers"
import { PublicFontMain } from "@/components/layout/PublicFontMain"

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
          <Header />
          <PublicFontMain>{children}</PublicFontMain>
          <Footer />
        </Providers>
      </body>
    </html>
  )
}
