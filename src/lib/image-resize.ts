// 클라이언트 canvas 기반 이미지 리사이즈 유틸.
// - 업로드 전 최대 변 길이로 축소해 Supabase 스토리지 비용/대역폭/Next image optimization 쿼터 절약
// - 결과는 JPEG(반투명 영역 없는 배너/썸네일 용도에 충분)

export interface ResizeImageOptions {
  /** 긴 변 최대 픽셀. 기본 1200. */
  maxDimension?: number;
  /** JPEG 품질 0~1. 기본 0.82. */
  quality?: number;
  /** 결과 MIME. 기본 'image/jpeg'. */
  mimeType?: 'image/jpeg' | 'image/webp';
}

/**
 * File을 canvas로 읽어 지정된 최대 변 길이로 축소하고 재인코딩한 File을 반환.
 * 원본이 이미 충분히 작으면 원본을 그대로 돌려준다.
 * canvas/blob 처리 실패 시 원본 반환(업로드 자체는 막지 않음).
 */
export async function resizeImage(
  file: File,
  options: ResizeImageOptions = {}
): Promise<File> {
  const { maxDimension = 1200, quality = 0.82, mimeType = 'image/jpeg' } = options;

  // 이미 충분히 작으면 건너뜀 (읽기 비용 아낌) — 200KB 미만 && 원본 그대로 보존
  if (file.size < 200 * 1024) return file;

  try {
    const dataUrl = await readAsDataURL(file);
    const img = await loadImage(dataUrl);

    const longSide = Math.max(img.width, img.height);
    if (longSide <= maxDimension) {
      // 해상도는 작은데 파일이 큰 케이스 (png 등) — JPEG 재인코딩으로만 줄임
    }

    const scale = longSide > maxDimension ? maxDimension / longSide : 1;
    const targetW = Math.round(img.width * scale);
    const targetH = Math.round(img.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, targetW, targetH);

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, mimeType, quality)
    );
    if (!blob) return file;

    // 결과가 원본보다 크면(이미 잘 압축된 JPEG 등) 원본 유지
    if (blob.size >= file.size) return file;

    const ext = mimeType === 'image/webp' ? 'webp' : 'jpg';
    const baseName = file.name.replace(/\.[^.]+$/, '');
    return new File([blob], `${baseName}.${ext}`, { type: mimeType });
  } catch {
    return file;
  }
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image load failed'));
    img.src = src;
  });
}
