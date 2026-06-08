import type { Metadata } from "next";
import { Sarabun } from "next/font/google";
import "./globals.css";

const sarabun = Sarabun({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "700"],
  variable: "--font-sarabun",
});

export const metadata: Metadata = {
  title: "FB Automation",
  description: "Facebook Feed & Chat Automation",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={sarabun.variable}>
      <body className="bg-gray-950 text-gray-100 min-h-screen">
        <nav className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center gap-6">
          <span className="text-blue-400 font-bold text-lg">📘 FB Automation</span>
          <a href="/" className="text-sm text-gray-300 hover:text-white transition">Dashboard</a>
          <a href="/settings" className="text-sm text-gray-300 hover:text-white transition">⚙️ Settings</a>
          <a href="/settings/criteria" className="text-sm text-gray-300 hover:text-white transition">🎲 Comment Criteria</a>
        </nav>
        <main className="max-w-4xl mx-auto p-6">{children}</main>
      </body>
    </html>
  );
}
