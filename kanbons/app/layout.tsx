import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { currentPerson } from "@/lib/auth/session";
import { scheduleDailyNoteIfDue } from "@/lib/agent-note";
import { DbStatus } from "./db-status";
import { AppNav } from "./nav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kanbons",
  description: "Stock and packing lists",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const person = await currentPerson();
  if (person) await scheduleDailyNoteIfDue();
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AppNav person={person} />
        <DbStatus>{children}</DbStatus>
      </body>
    </html>
  );
}
