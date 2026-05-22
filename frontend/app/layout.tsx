import "./globals.css";

import { Source_Sans_3, Space_Grotesk } from "next/font/google";

import { AppChrome } from "@/components/AppChrome";

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk"
});

const body = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source-sans"
});

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        <div className="mx-auto min-h-screen max-w-[1120px] px-4 py-3 lg:px-6">
          <AppChrome />
          {children}
        </div>
      </body>
    </html>
  );
}
