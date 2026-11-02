import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { TimelineGameClient } from "@/components/LazyScreens";
import { getI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  // A hidden page: not linked from the site, and kept out of search results.
  return { title: t.meta.timelineTitle, robots: { index: false, follow: false } };
}

export default async function TimelinePage() {
  const { t } = await getI18n();
  return (
    <>
      <Header title={t.timeline.name} path="/timeline" />
      <TimelineGameClient />
    </>
  );
}
