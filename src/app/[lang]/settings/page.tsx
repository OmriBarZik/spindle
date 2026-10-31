import type { Metadata } from "next";
import { SettingsClient } from "@/components/ClientOnly";
import Header from "@/components/Header";
import { getI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.meta.settingsTitle };
}

export default async function SettingsPage() {
  const { t } = await getI18n();
  return (
    <>
      <Header title={t.settings.name} path="/settings" />
      <SettingsClient />
    </>
  );
}
