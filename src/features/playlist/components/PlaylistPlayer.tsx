'use client';

// Design Ref: §5.1 — 플리 상세의 플레이어 슬롯 + 트랙리스트
// v2 리팩터: 자체 iframe 제거, PersistentPlayer (layout mount)로 위임.
// Plan SC: R1 — iframe은 세션 1회만 마운트. 페이지 이동 시 재생 지속.
// Phase 3: 데스크톱(>=sm)에선 우측 패널이 영상+상세를 표시하므로 페이지 자체는 홈으로 redirect.
//          모바일은 기존 페이지 그대로 유지.

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import type { Playlist, Track } from '@/types';
import { usePlayerStore } from '@/features/player/store';
import ExpandedView from '@/features/player/components/ExpandedView';

interface PlaylistPlayerProps {
  playlist: Playlist;
  tracks: Track[];
  children?: React.ReactNode;
}

function formatDuration(sec: number | null) {
  if (!sec) return '--:--';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// v1 로직 재현: start_sec 우선, 없으면 duration_sec 누적합
function resolveStartSec(tracks: Track[], index: number): number {
  if (index < 0 || index >= tracks.length) return 0;
  let acc = 0;
  for (let i = 0; i < index; i++) {
    const t = tracks[i];
    if (t.start_sec != null) acc = t.start_sec + (t.duration_sec ?? 0);
    else acc += t.duration_sec ?? 0;
  }
  const target = tracks[index];
  return target.start_sec ?? acc;
}

export default function PlaylistPlayer({ playlist, tracks, children }: PlaylistPlayerProps) {
  const playlistId = usePlayerStore((s) => s.playlistId);
  const currentTrackIndex = usePlayerStore((s) => s.currentTrackIndex);
  const load = usePlayerStore((s) => s.load);
  const seekToTrack = usePlayerStore((s) => s.seekToTrack);
  const router = useRouter();
  const locale = useLocale();

  // 마운트 시 해당 플리 로드 (이미 같은 플리 재생 중이면 skip — 재생 지속)
  useEffect(() => {
    if (playlistId !== playlist.id) {
      load(playlist, tracks);
    }
    // Phase 3: 데스크톱은 패널이 상세를 표시하므로 홈으로 redirect (URL 정리 + 홈 그리드 노출)
    // 모바일은 기존 페이지 유지
    if (typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches) {
      router.replace(`/${locale}`);
    }
    // 의도적으로 tracks/load는 의존에서 제외 — playlist.id만으로 재로드 판단
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playlist.id]);

  return (
    <div>
      {/* 플레이어 슬롯 (aspect-video 공간 예약) — iframe은 PersistentPlayer가 fixed top에 렌더 */}
      <ExpandedView />

      {children}

      {/* 트랙리스트 */}
      {tracks.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-3">
            트랙리스트
          </h2>
          <div className="overflow-hidden">
            <table className="w-full text-sm table-fixed">
              <colgroup>
                <col className="w-8" />
                <col />
                <col className="hidden md:table-column w-[25%]" />
                <col className="w-14" />
              </colgroup>
              <tbody>
                {tracks.map((track, index) => {
                  const isActive =
                    playlistId === playlist.id && currentTrackIndex === index;
                  return (
                    <tr
                      key={track.id}
                      onClick={() => {
                        // 같은 플리면 단순 seek, 다른 플리면 load 먼저
                        if (playlistId !== playlist.id) {
                          load(playlist, tracks);
                          // load 직후 _player는 아직 loadVideoById 중 — 다음 tick에 seek
                          setTimeout(() => seekToTrack(index), 100);
                        } else {
                          seekToTrack(index);
                        }
                      }}
                      className={`border-b border-[var(--border)] last:border-0 cursor-pointer transition-colors ${
                        isActive ? 'bg-[var(--muted)]' : 'hover:bg-[var(--muted)]'
                      }`}
                    >
                      <td className="py-3.5 pr-3 text-right">
                        {isActive ? (
                          <span className="text-[var(--accent)] text-xs">▶</span>
                        ) : (
                          <span className="text-white font-bold tabular-nums">{track.position}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-2 overflow-hidden">
                        <p className="font-bold truncate">{track.title}</p>
                        {track.artist && (
                          <p className="md:hidden text-xs text-[var(--text-secondary)] truncate mt-0.5">{track.artist}</p>
                        )}
                      </td>
                      <td className="hidden md:table-cell py-3.5 px-2 text-[var(--text-secondary)] overflow-hidden">
                        <p className="truncate">{track.artist ?? ''}</p>
                      </td>
                      <td className="py-3.5 pl-3 pr-3 text-[var(--text-secondary)] tabular-nums text-right whitespace-nowrap">
                        {formatDuration(track.duration_sec)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// resolveStartSec는 추후 UI에서 사용 가능하도록 export (현재는 store 내부 로직과 동일)
export { resolveStartSec };
