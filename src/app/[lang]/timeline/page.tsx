import type { Metadata } from "next";
import Header from "@/components/Header";
import { TimelineGameClient } from "@/components/ClientOnly";
import { getI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.meta.timelineTitle };
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
