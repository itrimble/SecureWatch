import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { Toaster } from "@/components/ui/sonner"
import { Header } from "@/components/header"

export const metadata: Metadata = {
  title: "SecureWatch SIEM Platform",
  description: "Comprehensive Security Information and Event Management Platform",
  generator: "v0.dev",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Header />
        <main>{children}</main>
        <Toaster />
      </body>
    </html>
  )
}
