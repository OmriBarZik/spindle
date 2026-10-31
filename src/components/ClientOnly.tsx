"use client";

import dynamic from "next/dynamic";
import { useI18n } from "@/i18n/I18nProvider";

function Loading() {
  const { t } = useI18n();
  return <p className="p-8 text-center text-muted">{t.common.loadingGame}</p>;
}

export const SortGameClient = dynamic(() => import("@/components/SortGame"), {
  ssr: false,
  loading: Loading,
});

export const TimelineGameClient = dynamic(() => import("@/components/TimelineGame"), {
  ssr: false,
  loading: Loading,
});

export const SettingsClient = dynamic(() => import("@/components/Settings"), {
  ssr: false,
  loading: Loading,
});
