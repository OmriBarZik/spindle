import Script from "next/script";

/**
 * Google Analytics 4. The ID is public (it ships in every page), so it lives here rather
 * than in an environment variable. GA4's enhanced measurement counts client-side
 * navigations as page views through browser history events.
 */
const GA_MEASUREMENT_ID = "G-EJN20HSMCH";

/**
 * The init snippet runs before hydration, so `window.gtag` exists before any game screen
 * mounts and sends its first event (`track()` in `src/lib/analytics.ts`). gtag queues
 * calls in `dataLayer` until the library itself, loaded after hydration, processes them.
 */
export default function GoogleAnalytics() {
  return (
    <>
      {/*
        The rule predates the App Router, where `beforeInteractive` belongs in the root
        layout, which is the only place this is rendered (see the Script docs in node_modules/next).
      */}
      {/* oxlint-disable-next-line nextjs/no-before-interactive-script-outside-document */}
      <Script id="ga-init" strategy="beforeInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_MEASUREMENT_ID}');`}
      </Script>
      <Script
        id="ga"
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
      />
    </>
  );
}
