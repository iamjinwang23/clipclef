// Design Ref: §5.4 — 트랙리스트 테이블 (순번/제목/아티스트/재생시간)
import type { Track } from '@/types';

interface TrackListProps {
  tracks: Track[];
}

function formatDuration(sec: number | null) {
  if (!sec) return '--:--';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function TrackList({ tracks }: TrackListProps) {
  if (tracks.length === 0) return null;

  return (
    <div className="overflow-hidden">
      <table className="w-full text-sm">
        <tbody>
          {tracks.map((track) => (
            <tr key={track.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--muted)] transition-colors">
              <td className="py-2.5 pr-3 text-[var(--text-secondary)] tabular-nums w-8 text-right">
                {track.position}
              </td>
              <td className="py-2.5 px-2 flex-1">
                <p className="font-medium text-[var(--foreground)] line-clamp-1">{track.title}</p>
                {track.artist && (
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">{track.artist}</p>
                )}
              </td>
              <td className="py-2.5 pl-3 text-[var(--text-secondary)] tabular-nums text-right whitespace-nowrap">
                {formatDuration(track.duration_sec)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
