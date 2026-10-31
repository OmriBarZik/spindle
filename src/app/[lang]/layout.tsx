import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Heebo } from "next/font/google";
import { notFound } from "next/navigation";
import { lang as langParam } from "next/root-params";
import { dirOf, hasLocale, LOCALES } from "@/i18n/config";
import { I18nProvider } from "@/i18n/I18nProvider";
import { MESSAGES } from "@/i18n/messages";
import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Hebrew glyphs. Listed after Geist in the font stack, so Latin text keeps Geist.
const heebo = Heebo({
  variable: "--font-hebrew",
  subsets: ["hebrew"],
});

export async function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata(): Promise<Metadata> {
  const lang = await langParam();
  if (!hasLocale(lang)) return {};
  const t = MESSAGES[lang];
  return {
    title: t.meta.title,
    description: t.meta.description,
    alternates: {
      languages: Object.fromEntries(LOCALES.map((l) => [l, `/${l}`])),
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#0b0b10",
};

export default async function RootLayout({ children }: LayoutProps<"/[lang]">) {
  const lang = await langParam();
  if (!hasLocale(lang)) notFound();
  return (
    <html
      lang={lang}
      dir={dirOf(lang)}
      className={`${geistSans.variable} ${geistMono.variable} ${heebo.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <I18nProvider lang={lang}>{children}</I18nProvider>
      </body>
    </html>
  );
}
