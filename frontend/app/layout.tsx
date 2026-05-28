import "./globals.css";

import { AppChrome } from "@/components/AppChrome";
import { inter } from "@/app/ui/fonts";

export const metadata = {
  title: "Speculo",
  description: "Speculo turns video into a searchable, account-based workspace."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <div className="mx-auto min-h-screen max-w-[1120px] px-4 py-3 lg:px-6">
          <AppChrome />
          {children}
        </div>
      </body>
    </html>
  );
}
