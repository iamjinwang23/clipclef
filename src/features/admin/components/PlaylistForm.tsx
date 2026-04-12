'use client';
// Design Ref: §5.4 — 관리자 플레이리스트 등록/수정 폼

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAdminPlaylists } from '../hooks/useAdminPlaylists';
import { GENRE_OPTIONS, MOOD_OPTIONS, PLACE_OPTIONS, ERA_OPTIONS } from '@/types';
import type { Playlist } from '@/types';

interface TrackRow {
  position: number;
  title: string;
  artist: string;
  start_sec: number | null;
  duration_sec: number | null;
  youtube_video_id: string | null;
}

function secondsToTimestamp(sec: number | null): string {
  if (sec === null || sec === undefined) return '';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function timestampToSeconds(ts: string): number | null {
  const trimmed = ts.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(':').map(Number);
  if (parts.some(isNaN)) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return null;
}

// 숫자만 입력 시 자동 포맷: 1234 → "12:34", 12345 → "1:23:45"
function autoFormatDigits(raw: string): string {
  const d = raw.replace(/\D/g, '');
  if (!d) return '';
  const len = d.length;
  if (len <= 2) return `0:${d.padStart(2, '0')}`;
  if (len === 3) return `${d[0]}:${d.slice(1)}`;
  if (len === 4) return `${d.slice(0, 2)}:${d.slice(2)}`;
  if (len === 5) return `${d[0]}:${d.slice(1, 3)}:${d.slice(3)}`;
  return `${d.slice(0, len - 4)}:${d.slice(len - 4, len - 2)}:${d.slice(len - 2)}`;
}

interface ParsedPlaylist {
  youtube_id: string;
  title: string;
  channel_name: string;
  channel_id: string;
  thumbnail_url: string;
  description: string | null;
  view_count: number;
  tracks: TrackRow[];
}

interface PlaylistFormProps {
  // 수정 모드: 대상 플리 + 기존 트랙
  editTarget?: { playlist: Playlist; tracks: TrackRow[] };
  onComplete?: () => void;
  // 일반 회원 업로드 모드: 업로더 user_id + locale 전달 (성공 시 상세 페이지 이동)
  uploadedBy?: string;
  locale?: string;
}

function TagSelect({ label, options, selected, onChange }: {
  label: string;
  options: readonly string[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (v: string) =>
    onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
  return (
    <div className="mb-4">
      <p className="text-xs font-medium text-[var(--text-secondary)] mb-1.5">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
              selected.includes(opt)
                ? 'bg-[var(--foreground)] text-[var(--background)] border-transparent'
                : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--muted)]'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function TrackEditor({ tracks, onChange }: { tracks: TrackRow[]; onChange: (t: TrackRow[]) => void }) {
  // 제어 입력을 위한 로컬 시간 표시 상태 (state와 별도로 입력 문자열 관리)
  const [timeInputs, setTimeInputs] = useState<string[]>(() =>
    tracks.map((t) => secondsToTimestamp(t.start_sec))
  );

  // 트랙 수 변경(추가/삭제) 시 display state 동기화
  useEffect(() => {
    setTimeInputs(tracks.map((t) => secondsToTimestamp(t.start_sec)));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracks.length]);

  const handleTimeChange = (i: number, raw: string) => {
    // 숫자와 ':' 만 허용
    const filtered = raw.replace(/[^0-9:]/g, '');
    setTimeInputs((prev) => prev.map((v, idx) => (idx === i ? filtered : v)));
  };

  const handleTimeBlur = (i: number) => {
    const raw = timeInputs[i];
    // ':' 없이 숫자만 입력한 경우 자동 포맷 (예: "1234" → "12:34")
    const formatted = raw.includes(':') ? raw : autoFormatDigits(raw);
    const sec = timestampToSeconds(formatted);
    onChange(tracks.map((t, idx) => (idx === i ? { ...t, start_sec: sec } : t)));
    setTimeInputs((prev) =>
      prev.map((v, idx) => (idx === i ? secondsToTimestamp(sec) : v))
    );
  };

  const updateTrack = (i: number, field: 'title' | 'artist', value: string) => {
    onChange(tracks.map((t, idx) => idx === i ? { ...t, [field]: value } : t));
  };
  const deleteTrack = (i: number) => {
    onChange(tracks.filter((_, idx) => idx !== i).map((t, idx) => ({ ...t, position: idx + 1 })));
  };
  const addTrack = () => {
    onChange([...tracks, { position: tracks.length + 1, title: '', artist: '', start_sec: null, duration_sec: null, youtube_video_id: null }]);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-[var(--text-secondary)]">트랙리스트 ({tracks.length}개)</p>
        <button type="button" onClick={addTrack} className="text-xs text-[var(--text-secondary)] hover:text-[var(--foreground)] underline">
          + 트랙 추가
        </button>
      </div>
      <div className="border border-[var(--border)] rounded-lg overflow-hidden">
        {tracks.length === 0 ? (
          <p className="py-4 text-center text-xs text-[var(--text-secondary)]">트랙이 없습니다</p>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-[var(--muted)]">
              <tr>
                <th className="py-1.5 px-2 text-left text-[var(--text-secondary)] w-8">#</th>
                <th className="py-1.5 px-2 text-left text-[var(--text-secondary)] w-20">
                  시작
                  <span className="ml-1 font-normal text-[var(--subtle)]">(m:ss)</span>
                </th>
                <th className="py-1.5 px-2 text-left text-[var(--text-secondary)]">제목</th>
                <th className="py-1.5 px-2 text-left text-[var(--text-secondary)]">아티스트</th>
                <th className="py-1.5 w-8" />
              </tr>
            </thead>
            <tbody>
              {tracks.map((track, i) => (
                <tr key={track.position} className="border-t border-[var(--border)]">
                  <td className="py-1 px-2 text-[var(--text-secondary)]">{track.position}</td>
                  <td className="py-1 px-2">
                    <input
                      inputMode="numeric"
                      value={timeInputs[i] ?? ''}
                      onChange={(e) => handleTimeChange(i, e.target.value)}
                      onBlur={() => handleTimeBlur(i)}
                      className="w-full text-xs bg-transparent focus:outline-none focus:bg-[var(--muted)] px-1 py-0.5 rounded tabular-nums text-[var(--text-secondary)]"
                      placeholder="--:--"
                    />
                  </td>
                  <td className="py-1 px-2">
                    <input
                      value={track.title}
                      onChange={(e) => updateTrack(i, 'title', e.target.value)}
                      className="w-full text-xs bg-transparent focus:outline-none focus:bg-[var(--muted)] px-1 py-0.5 rounded text-[var(--foreground)]"
                      placeholder="제목"
                    />
                  </td>
                  <td className="py-1 px-2">
                    <input
                      value={track.artist ?? ''}
                      onChange={(e) => updateTrack(i, 'artist', e.target.value)}
                      className="w-full text-xs bg-transparent focus:outline-none focus:bg-[var(--muted)] px-1 py-0.5 rounded text-[var(--text-secondary)]"
                      placeholder="아티스트"
                    />
                  </td>
                  <td className="py-1 px-2">
                    <button type="button" onClick={() => deleteTrack(i)} className="text-[var(--subtle)] hover:text-red-400 transition-colors">×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default function PlaylistForm({ editTarget, onComplete, uploadedBy, locale }: PlaylistFormProps) {
  const t = useTranslations('admin');
  const router = useRouter();
  const { createPlaylist, updatePlaylist } = useAdminPlaylists();
  const isEditMode = !!editTarget;

  const [url, setUrl] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState('');
  const [parsed, setParsed] = useState<ParsedPlaylist | null>(null);
  const [tracks, setTracks] = useState<TrackRow[]>([]);
  const [genre, setGenre] = useState<string[]>([]);
  const [mood, setMood] = useState<string[]>([]);
  const [place, setPlace] = useState<string[]>([]);
  const [era, setEra] = useState<string[]>([]);
  const [isAi, setIsAi] = useState(false);
  const [editorNote, setEditorNote] = useState('');
  const [toast, setToast] = useState(false);

  // 수정 모드 초기값 세팅
  useEffect(() => {
    if (editTarget) {
      const { playlist, tracks: t } = editTarget;
      setParsed({
        youtube_id: playlist.youtube_id,
        title: playlist.title,
        channel_name: playlist.channel_name,
        channel_id: playlist.channel_id,
        thumbnail_url: playlist.thumbnail_url,
        description: playlist.description,
        view_count: playlist.view_count,
        tracks: t,
      });
      setTracks(t);
      setGenre(playlist.genre);
      setMood(playlist.mood);
      setPlace(playlist.place);
      setEra(playlist.era);
      setIsAi(playlist.is_ai);
      setEditorNote(playlist.editor_note ?? '');
    }
  }, [editTarget]);

  const handleParse = async () => {
    if (!url.trim()) return;
    setIsParsing(true);
    setParseError('');
    setParsed(null);
    setTracks([]);
    try {
      const res = await fetch('/api/youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Parse failed');
      setParsed(data);
      setTracks(data.tracks);
    } catch (e: any) {
      setParseError(e.message);
    } finally {
      setIsParsing(false);
    }
  };

  const handleReset = () => {
    setUrl(''); setParsed(null); setTracks([]);
    setGenre([]); setMood([]); setPlace([]); setEra([]); setIsAi(false); setEditorNote('');
    setParseError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parsed) return;
    try {
      if (isEditMode && editTarget) {
        await updatePlaylist.mutateAsync({
          id: editTarget.playlist.id,
          genre, mood, place, era, is_ai: isAi,
          editor_note: editorNote.trim() || null,
          is_active: editTarget.playlist.is_active,
          tracks,
        });
        onComplete?.();
      } else {
        const created = await createPlaylist.mutateAsync({
          ...parsed,
          genre, mood, place, era,
          is_ai: isAi,
          editor_note: editorNote.trim() || null,
          is_active: true,
          track_count: tracks.length,
          tracks,
          uploaded_by: uploadedBy ?? null,
        });
        if (locale && created?.id) {
          setToast(true);
          setTimeout(() => {
            router.push(`/${locale}/playlist/${created.id}`);
          }, 1500);
        } else {
          handleReset();
        }
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const isPending = isEditMode ? updatePlaylist.isPending : createPlaylist.isPending;

  return (
    <>
    {/* 업로드 성공 스낵바 */}
    {toast && (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl bg-[var(--foreground)] text-[var(--background)] text-sm font-medium shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-300">
        플레이리스트가 업로드 되었어요
      </div>
    )}
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 등록 모드: URL 입력 */}
      {!isEditMode && (
        <div>
          <label className="block text-sm font-medium mb-1.5">{t('urlLabel')}</label>
          <div className="flex gap-2">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="flex-1 text-sm border border-[var(--border)] rounded-lg px-3 py-2 bg-[var(--card)] focus:outline-none focus:ring-1 focus:ring-[var(--subtle)]"
            />
            <button
              type="button"
              onClick={handleParse}
              disabled={isParsing || !url.trim()}
              className="px-4 py-2 text-sm font-medium bg-[var(--foreground)] text-[var(--background)] rounded-lg disabled:opacity-40 hover:opacity-80 transition-opacity"
            >
              {isParsing ? t('parsing') : t('parse')}
            </button>
          </div>
          {parseError && <p className="text-xs text-red-500 mt-1">{parseError}</p>}
        </div>
      )}

      {parsed && (
        <>
          {/* 영상 미리보기 */}
          <div className="flex gap-4 p-4 bg-[var(--muted)] rounded-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={parsed.thumbnail_url} alt="" className="w-24 h-16 object-cover rounded flex-shrink-0" />
            <div>
              <p className="font-medium text-sm">{parsed.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{parsed.channel_name}</p>
            </div>
          </div>

          {/* AI 콘텐츠 체크 */}
          <label className="flex items-center gap-2.5 cursor-pointer select-none w-fit">
            <input
              type="checkbox"
              checked={isAi}
              onChange={(e) => setIsAi(e.target.checked)}
              className="w-4 h-4 rounded border-[var(--border)] accent-violet-600"
            />
            <span className="text-sm font-medium">AI 생성 콘텐츠</span>
            <span className="text-xs bg-violet-600 text-white font-bold px-1.5 py-0.5 rounded">AI</span>
          </label>

          {/* 에디터 노트 */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              에디터 노트 <span className="text-[var(--subtle)] font-normal">(선택 — 상세 페이지에 큐레이터 코멘트로 표시)</span>
            </label>
            <textarea
              value={editorNote}
              onChange={(e) => setEditorNote(e.target.value)}
              maxLength={300}
              rows={3}
              placeholder="이 플레이리스트를 고른 이유, 분위기, 어울리는 순간을 한두 문장으로 적어주세요"
              className="w-full text-sm border border-[var(--border)] rounded-lg px-3 py-2 bg-[var(--card)] text-[var(--foreground)] placeholder:text-[var(--subtle)] focus:outline-none focus:ring-1 focus:ring-[var(--subtle)] resize-none"
            />
            <p className="text-right text-[11px] text-[var(--text-secondary)] mt-0.5">{editorNote.length}/300</p>
          </div>

          {/* 트랙리스트 편집 */}
          <TrackEditor tracks={tracks} onChange={setTracks} />

          {/* 태그 */}
          <div>
            <p className="text-sm font-medium mb-3">{t('tagsLabel')}</p>
            <TagSelect label="장르" options={GENRE_OPTIONS} selected={genre} onChange={setGenre} />
            <TagSelect label="분위기" options={MOOD_OPTIONS} selected={mood} onChange={setMood} />
            <TagSelect label="장소" options={PLACE_OPTIONS} selected={place} onChange={setPlace} />
            <TagSelect label="시대" options={ERA_OPTIONS} selected={era} onChange={setEra} />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 py-2.5 text-sm font-medium bg-[var(--foreground)] text-[var(--background)] rounded-lg disabled:opacity-40 hover:opacity-80 transition-opacity"
            >
              {isPending ? (isEditMode ? '저장 중...' : t('registering')) : (isEditMode ? '수정 저장' : t('register'))}
            </button>
            {isEditMode && (
              <button
                type="button"
                onClick={onComplete}
                className="px-5 py-2.5 text-sm font-medium border border-[var(--border)] rounded-lg hover:bg-[var(--muted)] transition-colors"
              >
                취소
              </button>
            )}
          </div>
        </>
      )}
    </form>
    </>
  );
}
