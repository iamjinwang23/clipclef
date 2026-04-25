'use client';

// Design Ref: §3 — 소유자 전용 수정/삭제 버튼 + 모달 + 삭제 확인 다이얼로그
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Track } from '@/types';
import { MOOD_OPTIONS, PLACE_OPTIONS, ERA_OPTIONS } from '@/types';
import { useActiveGenres } from '@/features/genre/hooks/useActiveGenres';
import { toast } from '@/lib/toast';

interface PlaylistOwnerMenuProps {
  playlistId: string;
  locale: string;
  initialData: {
    editorNote: string | null;
    genre: string[];
    mood: string[];
    place: string[];
    era: string[];
  };
  tracks: Track[];
}

// ─── 태그 멀티셀렉트 ───────────────────────────────────────────────────────────
function TagSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: readonly string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const toggle = (val: string) =>
    onChange(selected.includes(val) ? selected.filter((s) => s !== val) : [...selected, val]);

  return (
    <div className="mb-3">
      <p className="text-xs text-[var(--text-secondary)] mb-1.5">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
              selected.includes(opt)
                ? 'bg-[var(--foreground)] text-[var(--background)] border-[var(--foreground)]'
                : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--foreground)]'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── 시간 변환 유틸 (업로드 폼과 동일한 패턴) ─────────────────────────────────
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

// duration_sec = 다음 트랙 start_sec - 현재 start_sec (마지막 트랙은 기존 값 유지)
function calcDurations(tracks: Track[]): Track[] {
  return tracks.map((t, i) => {
    const next = tracks[i + 1];
    const duration_sec =
      next?.start_sec != null && t.start_sec != null
        ? next.start_sec - t.start_sec
        : t.duration_sec;
    return { ...t, duration_sec };
  });
}

// ─── 메인 컴포넌트 ─────────────────────────────────────────────────────────────
export default function PlaylistOwnerMenu({
  playlistId,
  locale,
  initialData,
  tracks: initialTracks,
}: PlaylistOwnerMenuProps) {
  const router = useRouter();
  // DB `genres` 테이블이 장르 태그의 단일 소스
  const { data: genreOptions = [] } = useActiveGenres();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [editorNote, setEditorNote] = useState(initialData.editorNote ?? '');
  const [genre, setGenre] = useState<string[]>(initialData.genre);
  const [mood, setMood] = useState<string[]>(initialData.mood);
  const [place, setPlace] = useState<string[]>(initialData.place);
  const [era, setEra] = useState<string[]>(initialData.era);
  const [editTracks, setEditTracks] = useState<Track[]>(initialTracks);
  // 타임스탬프 표시용 별도 string 상태 (업로드 폼과 동일한 패턴)
  const [timeInputs, setTimeInputs] = useState<string[]>(() =>
    initialTracks.map((t) => secondsToTimestamp(t.start_sec))
  );

  // 트랙 수 변경 시 timeInputs 길이 동기화
  useEffect(() => {
    setTimeInputs(editTracks.map((t) => secondsToTimestamp(t.start_sec)));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editTracks.length]);

  const openEdit = () => {
    setEditorNote(initialData.editorNote ?? '');
    setGenre(initialData.genre);
    setMood(initialData.mood);
    setPlace(initialData.place);
    setEra(initialData.era);
    setEditTracks(initialTracks);
    setTimeInputs(initialTracks.map((t) => secondsToTimestamp(t.start_sec)));
    setEditOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // duration_sec 자동 계산: 다음 트랙 시작점 기준
      const tracksWithDuration = calcDurations(editTracks);

      const res = await fetch(`/api/playlists/${playlistId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          editor_note: editorNote || null,
          genre,
          mood,
          place,
          era,
          tracks: tracksWithDuration.map((t) => ({
            id: t.id,
            title: t.title,
            artist: t.artist,
            start_sec: t.start_sec,
            duration_sec: t.duration_sec,
          })),
        }),
      });
      if (!res.ok) throw new Error();
      setEditOpen(false);
      router.refresh();
      toast.success('플레이리스트가 수정되었습니다.');
    } catch {
      toast.error('저장 중 오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/playlists/${playlistId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      router.push(`/${locale}`);
    } catch {
      toast.error('삭제 중 오류가 발생했습니다. 다시 시도해 주세요.');
      setDeleting(false);
    }
  };

  const updateTrack = (id: string, field: 'title' | 'artist', value: string) => {
    setEditTracks((prev) => prev.map((t) => t.id === id ? { ...t, [field]: value } : t));
  };

  // 타임스탬프: onChange는 display만 업데이트, onBlur에서 초 변환
  const handleTimeChange = (idx: number, raw: string) => {
    const filtered = raw.replace(/[^0-9:]/g, '');
    setTimeInputs((prev) => prev.map((v, i) => i === idx ? filtered : v));
  };

  const handleTimeBlur = (idx: number) => {
    const raw = timeInputs[idx];
    const formatted = raw.includes(':') ? raw : autoFormatDigits(raw);
    const sec = timestampToSeconds(formatted);
    setEditTracks((prev) => prev.map((t, i) => i === idx ? { ...t, start_sec: sec } : t));
    setTimeInputs((prev) => prev.map((v, i) => i === idx ? secondsToTimestamp(sec) : v));
  };

  const removeTrack = (id: string) => setEditTracks((prev) => prev.filter((t) => t.id !== id));

  return (
    <>
      {/* 수정/삭제 버튼 */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={openEdit}
          aria-label="플레이리스트 수정"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
        <button
          onClick={() => setDeleteOpen(true)}
          aria-label="플레이리스트 삭제"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:text-red-400 hover:bg-red-900/20 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4h6v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* 수정 모달 */}
      {editOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={() => setEditOpen(false)}
        >
          <div
            className="bg-[var(--card)] rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl border border-[var(--border)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
              <h2 className="text-base font-semibold">플레이리스트 수정</h2>
              <button
                onClick={() => setEditOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-5 py-4 space-y-5">
              {/* 노트 입력 */}
              <div>
                <label className="text-xs text-[var(--text-secondary)] block mb-1.5">노트 입력</label>
                <textarea
                  value={editorNote}
                  onChange={(e) => setEditorNote(e.target.value)}
                  maxLength={200}
                  rows={3}
                  placeholder="플레이리스트에 대한 짧은 설명을 남겨보세요"
                  className="w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[var(--foreground)] text-[var(--foreground)] placeholder-[var(--text-secondary)]"
                />
              </div>

              {/* 태그 */}
              <div>
                <p className="text-xs font-medium text-[var(--text-secondary)] mb-3">태그</p>
                <TagSelect label="장르" options={genreOptions} selected={genre} onChange={setGenre} />
                <TagSelect label="분위기" options={MOOD_OPTIONS} selected={mood} onChange={setMood} />
                <TagSelect label="장소" options={PLACE_OPTIONS} selected={place} onChange={setPlace} />
                <TagSelect label="시대" options={ERA_OPTIONS} selected={era} onChange={setEra} />
              </div>

              {/* 트랙 편집 */}
              {editTracks.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">트랙 목록</p>
                  <div className="space-y-2">
                    {editTracks.map((track, i) => (
                      <div key={track.id} className="bg-[var(--muted)] rounded-lg px-3 py-2.5 space-y-1.5">
                        {/* 제목 행 */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[var(--text-secondary)] w-5 flex-shrink-0 tabular-nums">{i + 1}</span>
                          <input
                            type="text"
                            value={track.title}
                            onChange={(e) => updateTrack(track.id, 'title', e.target.value)}
                            className="flex-1 min-w-0 bg-transparent text-sm focus:outline-none text-[var(--foreground)]"
                            placeholder="트랙 제목"
                          />
                          <button
                            onClick={() => removeTrack(track.id)}
                            className="flex-shrink-0 text-[var(--text-secondary)] hover:text-red-400 transition-colors"
                            aria-label="트랙 삭제"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        {/* 아티스트 + 시작 타임스탬프 */}
                        <div className="flex items-center gap-2 pl-7">
                          <input
                            type="text"
                            value={track.artist ?? ''}
                            onChange={(e) => updateTrack(track.id, 'artist', e.target.value)}
                            className="flex-1 min-w-0 bg-transparent text-xs text-[var(--text-secondary)] focus:outline-none focus:text-[var(--foreground)]"
                            placeholder="아티스트"
                          />
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <span className="text-[10px] text-[var(--text-secondary)]">시작</span>
                            <input
                              inputMode="numeric"
                              value={timeInputs[i] ?? ''}
                              onChange={(e) => handleTimeChange(i, e.target.value)}
                              onBlur={() => handleTimeBlur(i)}
                              className="w-14 bg-[var(--background)] border border-[var(--border)] rounded text-xs px-1.5 py-1 text-center focus:outline-none text-[var(--foreground)] tabular-nums"
                              placeholder="0:00"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 푸터 */}
            <div className="flex gap-2 px-5 py-4 border-t border-[var(--border)]">
              <button
                onClick={() => setEditOpen(false)}
                className="flex-1 py-2 rounded-lg border border-[var(--border)] text-sm font-medium hover:bg-[var(--muted)] transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2 rounded-lg bg-[var(--foreground)] text-[var(--background)] text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 다이얼로그 */}
      {deleteOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={() => setDeleteOpen(false)}
        >
          <div
            className="bg-[var(--card)] rounded-xl w-full max-w-sm p-6 shadow-2xl border border-[var(--border)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-semibold mb-2">플레이리스트를 삭제하시겠습니까?</h2>
            <p className="text-sm text-[var(--text-secondary)] mb-6">
              삭제하면 되돌릴 수 없습니다. 댓글, 좋아요, 저장 정보도 함께 삭제됩니다.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteOpen(false)}
                className="flex-1 py-2 rounded-lg border border-[var(--border)] text-sm font-medium hover:bg-[var(--muted)] transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleting ? '삭제 중...' : '삭제하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
