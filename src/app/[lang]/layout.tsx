import "../globals.css";
import type { Metadata, Viewport } from "next";
import { Heebo, Roboto, Roboto_Mono } from "next/font/google";
import { notFound } from "next/navigation";
import { lang as langParam } from "next/root-params";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import { dirOf, hasLocale, LOCALES } from "@/i18n/config";
import { I18nProvider } from "@/i18n/I18nProvider";
import { MESSAGES } from "@/i18n/messages";

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
});

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
});

// Roboto has no Hebrew glyphs. Heebo is Roboto's Hebrew companion design, listed after
// Roboto in the font stack so Latin text keeps Roboto and Hebrew text uses Heebo.
const heebo = Heebo({
  variable: "--font-hebrew",
  subsets: ["hebrew"],
});

export function generateStaticParams() {
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
      className={`${roboto.variable} ${robotoMono.variable} ${heebo.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <GoogleAnalytics />
        <I18nProvider lang={lang}>{children}</I18nProvider>
      </body>
    </html>
  );
}
