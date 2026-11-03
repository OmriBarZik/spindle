import { ExternalLink } from "@/components/site/ExternalLink";
import { getI18n } from "@/i18n/server";

/** The site footer: sits at the bottom of the screen when the page is shorter than it. */
export async function Footer() {
  const { t } = await getI18n();
  return (
    <footer className="mt-auto border-t border-line">
      <div className="mx-auto flex w-full max-w-page flex-col items-center gap-50 px-200 py-300 text-center text-xs text-muted lg:max-w-wide lg:flex-row lg:justify-between lg:text-start">
        <p>{t.home.footer}</p>
        <ExternalLink
          href="https://github.com/OmriBarZik/spindle"
          className="underline hover:text-ink"
        >
          {t.home.github}
        </ExternalLink>
      </div>
    </footer>
  );
}
