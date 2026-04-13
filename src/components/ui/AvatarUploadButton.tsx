'use client';
// Design Ref: §5.1 — 프로필 사진 업로드 버튼 (헤더 행 우측 배치용)
// ProfileForm 우측에 단독 배치, 업로드 완료 시 onUploadComplete 콜백으로 새 URL 전달

import { useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface AvatarUploadButtonProps {
  userId: string;
  onUploadComplete: (newUrl: string) => void;
}

const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export default function AvatarUploadButton({ userId, onUploadComplete }: AvatarUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('이미지 파일(JPG, PNG, WebP, GIF)만 업로드 가능합니다');
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError('2MB 이하 이미지만 업로드 가능합니다');
      return;
    }

    setUploading(true);

    const ext = file.type.split('/')[1].replace('jpeg', 'jpg');
    const path = `${userId}/avatar.${ext}`;
    const supabase = createClient();

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      setError('업로드에 실패했습니다. 다시 시도해 주세요');
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
    // cache-busting: 동일 경로 upsert 시 브라우저 캐시 우회
    const bustUrl = `${publicUrl}?t=${Date.now()}`;

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: bustUrl })
      .eq('id', userId);

    if (updateError) {
      setError('프로필 사진 저장에 실패했습니다');
      setUploading(false);
      return;
    }

    onUploadComplete(bustUrl);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="text-sm text-[var(--text-secondary)] hover:text-[var(--foreground)] underline disabled:opacity-40 transition-colors whitespace-nowrap"
      >
        {uploading ? '업로드 중...' : '사진 변경'}
      </button>
      {error && (
        <p className="text-xs text-red-400 text-right">{error}</p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
