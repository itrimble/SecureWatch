import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from '@/components/layout/Header'; // Adjusted path
import Sidebar from '@/components/layout/Sidebar'; // Adjusted path
import Breadcrumbs from '@/components/layout/Breadcrumbs'; // Import Breadcrumbs
import { Toaster } from '@/components/ui/sonner'; // Import Sonner Toaster

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EventLog Tutorial ThriveDX",
  description: "Learn Windows Event Log analysis and SIEM query generation for cybersecurity monitoring",
  keywords: "cybersecurity, event logs, SIEM, Windows security, MITRE ATT&CK, threat detection",
  authors: [{ name: "Ian Trimble" }],
  openGraph: {
    title: "EventLog Tutorial ThriveDX",
    description: "Master Windows Event Log analysis with hands-on SIEM query generation",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-900 text-gray-100`} // Dark theme base
      >
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-y-auto">
            <Header />
            <Breadcrumbs /> {/* Add Breadcrumbs component here */}
            <main className="flex-1 p-6 bg-gray-800"> {/* Main content bg slightly lighter */}
              {children}
            </main>
          </div>
        </div>
        {/* Sonner Toaster for notifications */}
        <Toaster />
      </body>
    </html>
  );
}