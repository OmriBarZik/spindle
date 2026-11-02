"use client";

import { clsx } from "clsx";
import { useState } from "react";
import { isRecordFlying } from "@/hooks/recordFlight";
import { useI18n } from "@/i18n/I18nProvider";

/** Shown while a screen's code loads. */
export function GameLoading() {
  const { t } = useI18n();
  // While the home record is flying in, it stands in for the loading text.
  const [flying] = useState(isRecordFlying);
  return (
    <p className={clsx("p-400 text-center text-muted", flying && "invisible")}>
      {t.common.loadingGame}
    </p>
  );
}
