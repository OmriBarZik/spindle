import type { Metadata } from "next";
import Header from "@/components/Header";
import { SortGameClient } from "@/components/ClientOnly";
import { getI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.meta.sortTitle };
}

export default async function SortPage() {
  const { t } = await getI18n();
  return (
    <>
      <Header title={t.sort.name} path="/sort" />
      <SortGameClient />
    </>
  );
}
