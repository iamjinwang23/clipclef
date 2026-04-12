/**
 * 인앱 브라우저(WebView) 감지
 * Google OAuth는 인앱 브라우저에서 disallowed_useragent 오류로 차단됨
 */
export function isInAppBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  // 알려진 인앱 브라우저 패턴
  if (/NAVER|KAKAOTALK|Line\/|FB_IAB|FBAV|FBAN|Instagram|Snapchat|Twitter/.test(ua)) return true;
  // iOS WebView: AppleWebKit이 있으나 Safari 토큰이 없음
  if (/iPhone|iPad|iPod/.test(ua) && /AppleWebKit/.test(ua) && !/Safari/.test(ua)) return true;
  return false;
}
