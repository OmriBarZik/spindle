/** Replaces the clipboard with a fake and returns everything copied to it so far. */
export function fakeClipboard(): string[] {
  const copied: string[] = [];
  const writeText = (text: string) => {
    copied.push(text);
    return Promise.resolve();
  };
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  return copied;
}
