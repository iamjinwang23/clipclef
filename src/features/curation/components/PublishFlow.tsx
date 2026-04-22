'use client';

// Design Ref: §5.1 PublishFlow — 3-step 모달 (선택 → 카피 → 커버 → 발행)
// Plan SC: SC-3, R3 — 발행 마찰 최소. 3-step 단계형 UX로 전환율 확보

import { useState } from 'react';
import Image from 'next/image';
import Modal from '@/components/ui/Modal';
import { usePublish } from '../hooks/usePublish';
import type { Playlist } from '@/types';

interface PublishFlowProps {
  open: boolean;
  onClose: () => void;
  /** 라이브러리의 저장된 플리 목록 (선택지) */
  savedPlaylists: Playlist[];
}

type Step = 1 | 2 | 3;

const CAPTION_MAX = 140;

export default function PublishFlow({ open, onClose, savedPlaylists }: PublishFlowProps) {
  const [step, setStep] = useState<Step>(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const publish = usePublish();

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const reset = () => {
    setStep(1);
    setSelectedIds([]);
    setTitle('');
    setCaption('');
    setCoverUrl(null);
    setErrorMsg(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const canAdvanceFrom1 = selectedIds.length >= 1;
  const canAdvanceFrom2 = title.trim().length >= 1 && title.trim().length <= 100 && caption.length <= CAPTION_MAX;

  // 커버 후보: 선택한 플리들의 썸네일
  const coverCandidates = savedPlaylists
    .filter((p) => selectedIds.includes(p.id))
    .map((p) => ({ url: p.thumbnail_url, label: p.title }));

  const handlePublish = async () => {
    setErrorMsg(null);
    try {
      await publish.mutateAsync({
        title: title.trim(),
        caption: caption.trim() || null,
        cover_url: coverUrl,
        playlist_ids: selectedIds,
      });
      reset();
      onClose();
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : '발행에 실패했어요');
    }
  };

  return (
    <Modal open={open} onClose={handleClose} className="w-[min(92vw,28rem)] max-h-[85vh] overflow-hidden flex flex-col">
      {/* 헤더: 스텝 인디케이터 */}
      <div className="px-5 pt-5 pb-3 border-b border-[var(--border)]">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-semibold">컬렉션 발행</h2>
          <button
            type="button"
            onClick={handleClose}
            aria-label="닫기"
            className="text-[var(--text-secondary)] hover:text-[var(--foreground)] text-lg leading-none"
          >
            ×
          </button>
        </div>
        <StepIndicator current={step} />
      </div>

      {/* 바디 */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {step === 1 && (
          <Step1SelectPlaylists
            savedPlaylists={savedPlaylists}
            selectedIds={selectedIds}
            onToggle={toggleSelect}
          />
        )}
        {step === 2 && (
          <Step2Caption
            title={title}
            caption={caption}
            onTitleChange={setTitle}
            onCaptionChange={setCaption}
          />
        )}
        {step === 3 && (
          <Step3Cover
            coverCandidates={coverCandidates}
            coverUrl={coverUrl}
            onChange={setCoverUrl}
          />
        )}
      </div>

      {/* 푸터: 네비게이션 */}
      <div className="px-5 py-3 border-t border-[var(--border)] flex items-center justify-between gap-2">
        {errorMsg && (
          <p className="text-xs text-red-400 flex-1 truncate" role="alert">
            {errorMsg}
          </p>
        )}
        <div className="flex items-center gap-2 ml-auto">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep((s) => (s - 1) as Step)}
              className="px-3 py-1.5 text-sm rounded-md hover:bg-[var(--muted)] transition-colors"
            >
              ← 이전
            </button>
          )}
          {step < 3 && (
            <button
              type="button"
              onClick={() => setStep((s) => (s + 1) as Step)}
              disabled={(step === 1 && !canAdvanceFrom1) || (step === 2 && !canAdvanceFrom2)}
              className="
                px-4 py-1.5 text-sm font-medium rounded-md
                bg-[var(--foreground)] text-[var(--background)]
                disabled:opacity-40 disabled:cursor-not-allowed
                hover:opacity-90 transition-opacity
              "
            >
              다음 →
            </button>
          )}
          {step === 3 && (
            <button
              type="button"
              onClick={handlePublish}
              disabled={publish.isPending}
              className="
                px-4 py-1.5 text-sm font-medium rounded-md
                bg-[var(--foreground)] text-[var(--background)]
                disabled:opacity-40 disabled:cursor-not-allowed
                hover:opacity-90 transition-opacity
              "
            >
              {publish.isPending ? '발행 중…' : '발행하기'}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}

function StepIndicator({ current }: { current: Step }) {
  return (
    <div className="flex items-center gap-2">
      {[1, 2, 3].map((n) => (
        <div
          key={n}
          className={`
            flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold
            ${n === current
              ? 'bg-[var(--foreground)] text-[var(--background)]'
              : n < current
              ? 'bg-[var(--subtle)] text-[var(--background)]'
              : 'bg-[var(--muted)] text-[var(--text-secondary)]'}
          `}
        >
          {n}
        </div>
      ))}
      <span className="ml-2 text-xs text-[var(--text-secondary)]">
        {current === 1 && '플리 선택'}
        {current === 2 && '제목 · 카피'}
        {current === 3 && '커버 선택'}
      </span>
    </div>
  );
}

function Step1SelectPlaylists({
  savedPlaylists,
  selectedIds,
  onToggle,
}: {
  savedPlaylists: Playlist[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  if (savedPlaylists.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-[var(--text-secondary)]">
        저장한 플리가 없어요. 먼저 마음에 드는 플리를 저장해보세요.
      </p>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2 text-xs">
        <span className="text-[var(--text-secondary)]">
          묶을 플리를 선택하세요
        </span>
        <span className="tabular-nums font-medium">
          {selectedIds.length}/{savedPlaylists.length} 선택됨
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {savedPlaylists.map((p) => {
          const on = selectedIds.includes(p.id);
          return (
            <button
              type="button"
              key={p.id}
              onClick={() => onToggle(p.id)}
              className={`
                relative aspect-video rounded-lg overflow-hidden
                ring-1 transition-all
                ${on ? 'ring-2 ring-[var(--foreground)]' : 'ring-[var(--border)] hover:ring-[var(--subtle)]'}
              `}
            >
              <Image
                src={p.thumbnail_url}
                alt=""
                fill
                sizes="200px"
                className="object-cover"
                unoptimized
              />
              <div className={`
                absolute inset-0 transition-colors
                ${on ? 'bg-black/30' : 'bg-transparent hover:bg-black/10'}
              `} />
              {/* 체크 */}
              <div className={`
                absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center
                transition-colors
                ${on ? 'bg-[var(--foreground)] text-[var(--background)]' : 'bg-black/50 text-white/80'}
              `}>
                {on ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : null}
              </div>
              {/* 제목 */}
              <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                <p className="text-xs text-white truncate font-medium">{p.title}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Step2Caption({
  title,
  caption,
  onTitleChange,
  onCaptionChange,
}: {
  title: string;
  caption: string;
  onTitleChange: (v: string) => void;
  onCaptionChange: (v: string) => void;
}) {
  const captionOver = caption.length > CAPTION_MAX;
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="publish-title" className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
          컬렉션 이름
          <span className="ml-1 text-[var(--subtle)]">({title.length}/100)</span>
        </label>
        <input
          id="publish-title"
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value.slice(0, 100))}
          placeholder="예: 주말 드라이브 시티팝"
          className="
            w-full px-3 py-2 text-sm rounded-md
            bg-[var(--muted)] border border-[var(--border)]
            focus:outline-none focus:ring-1 focus:ring-[var(--subtle)]
          "
          autoFocus
        />
      </div>
      <div>
        <label htmlFor="publish-caption" className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
          한 줄 카피 (선택)
          <span className={`ml-1 tabular-nums ${captionOver ? 'text-red-400' : 'text-[var(--subtle)]'}`}>
            ({caption.length}/{CAPTION_MAX})
          </span>
        </label>
        <textarea
          id="publish-caption"
          value={caption}
          onChange={(e) => onCaptionChange(e.target.value)}
          placeholder="이 컬렉션을 한 줄로 설명해주세요"
          rows={3}
          className={`
            w-full px-3 py-2 text-sm rounded-md resize-none
            bg-[var(--muted)] border
            focus:outline-none focus:ring-1
            ${captionOver ? 'border-red-400 focus:ring-red-400' : 'border-[var(--border)] focus:ring-[var(--subtle)]'}
          `}
        />
      </div>
    </div>
  );
}

function Step3Cover({
  coverCandidates,
  coverUrl,
  onChange,
}: {
  coverCandidates: Array<{ url: string; label: string }>;
  coverUrl: string | null;
  onChange: (url: string | null) => void;
}) {
  return (
    <div>
      <p className="text-xs text-[var(--text-secondary)] mb-2">
        커버를 선택하세요 (선택하지 않으면 첫 플리 썸네일을 사용)
      </p>
      <div className="grid grid-cols-3 gap-2">
        {/* 기본: 선택 안 함 = 자동 */}
        <button
          type="button"
          onClick={() => onChange(null)}
          className={`
            aspect-video rounded-md flex items-center justify-center text-xs
            bg-[var(--muted)] transition-all
            ${coverUrl === null ? 'ring-2 ring-[var(--foreground)]' : 'ring-1 ring-[var(--border)] hover:ring-[var(--subtle)]'}
          `}
        >
          자동
        </button>
        {coverCandidates.map(({ url, label }) => (
          <button
            type="button"
            key={url}
            onClick={() => onChange(url)}
            className={`
              relative aspect-video rounded-md overflow-hidden transition-all
              ${coverUrl === url ? 'ring-2 ring-[var(--foreground)]' : 'ring-1 ring-[var(--border)] hover:ring-[var(--subtle)]'}
            `}
          >
            <Image
              src={url}
              alt={label}
              fill
              sizes="120px"
              className="object-cover"
              unoptimized
            />
          </button>
        ))}
      </div>
    </div>
  );
}
