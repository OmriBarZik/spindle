export default function SongReveal({
  title,
  artist,
  youtubeId,
}: {
  title: string;
  artist: string;
  youtubeId: string;
}) {
  return (
    <div className="min-w-0">
      <div className="truncate font-semibold">{title}</div>
      <div className="truncate text-sm text-muted">
        {artist} ·{" "}
        <a
          href={`https://www.youtube.com/watch?v=${youtubeId}`}
          target="_blank"
          rel="noreferrer"
          className="underline decoration-dotted underline-offset-2 hover:text-white"
        >
          watch
        </a>
      </div>
    </div>
  );
}
