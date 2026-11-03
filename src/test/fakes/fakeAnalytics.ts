const events: [string, Record<string, unknown>][] = [];

/** Stands in for the Google Analytics snippet's `window.gtag`. */
export function installFakeAnalytics() {
  events.length = 0;
  window.gtag = (_command, name, params) => {
    events.push([name, params]);
  };
}

/** The analytics events sent so far, as `[name, params]`. */
export function trackedEvents() {
  return [...events];
}
