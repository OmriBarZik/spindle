import Link from "next/link";

export default function Header({ title }: { title?: string }) {
  return (
    <header className="mx-auto flex w-full max-w-xl items-center justify-between px-4 py-4">
      <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
        <span className="mini-record" aria-hidden />
        Spindle
      </Link>
      {title && <span className="text-sm text-muted">{title}</span>}
    </header>
  );
}
