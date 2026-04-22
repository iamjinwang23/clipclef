---
template: pm-prd
version: 2.0
feature: clipclef-v2
date: 2026-04-22
author: iamjinwang@gmail.com
---

# ClipClef v2 — Product Requirements Document

> **Date**: 2026-04-22
> **Author**: iamjinwang@gmail.com
> **Method**: PM Agent Team (synthesized; see session notes)
> **Status**: Draft — v2 pivot
> **Supersedes**: `home-redesign`, `pip-player`, `save-button-merge`, `collection-player`, `curation-banner-label` (see §7)

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | 현 ClipClef는 "유튜브 플리 탐색 도구"로만 소비된다 — 감상 시간이 축적되지 않고, 저장/큐레이션이 UI 외곽에 있어 재방문 유인이 약하다 |
| **Solution** | "감상 공간"으로 재정체. Global Persistent Player로 페이지 이동 중 재생 지속, 트랙 단위 scrobble, Letterboxd 스타일 저장→묶기→발행 플로우 |
| **Target User** | 유튜브로 이미 매일 음악을 듣는 국내 2030 중, 취향 기록·공유 욕구가 있는 early curator |
| **Core Value** | **Last.fm(감상=기록) + Letterboxd(아카이빙 1순위) 메타 큐레이션 모델** — YouTube 생태계 위에 한국어 감상 커뮤니티 구축 |

**North Star**: 일일 감상 시간 (DAU × avg session duration). 플리 저장 수는 허수 지표로 격하.

---

## 1. Opportunity Discovery

### 1.1 Desired Outcome

**90일 내 DAU 대비 scrobble-per-DAU ≥ 1.0 달성** — 유저당 하루 최소 1곡 이상 실제 감상이 기록되는 상태. "둘러보는 사이트"에서 "매일 듣는 사이트"로 전환된 증거.

### 1.2 Brainstormed Ideas (Top 5)

| # | Idea | Perspective | Rationale |
|---|------|-------------|-----------|
| 1 | Global Persistent Player | 체류 시간 | 페이지 이동 중 재생 끊김 = 유튜브로 이탈 유인 #1. 음악 스트리밍 표준 |
| 2 | Scrobble → 취향 자동 축적 | 재방문 유인 | "내가 뭘 들었나" = Last.fm 재방문 주기의 원형 |
| 3 | 저장→묶기→발행 플로우 | 창작 참여 | Letterboxd Watchlist→List 전환율이 메타 큐레이션 서비스의 Life-or-Death |
| 4 | 플레이어 바 안 저장 버튼 | 전환율 | Spotify / YTM 표준 위치. 현 홈의 숨은 저장 UI 대비 CTR 5-10x 예상 |
| 5 | 유저 컬렉션 = 관리자 에디토리얼과 같은 선반 | 커뮤니티 | "내가 만든 것도 섞여 노출" = 발행 동기의 핵심 |

### 1.3 Opportunity Solution Tree

```
Outcome: 일일 감상 시간 증가 (DAU × session duration)
├── O1: 감상이 끊긴다 (페이지 이동 시)
│   ├── S1a: Global Persistent Player (App Shell iframe)
│   └── S1b: 미니 플레이어 바 상시 노출
├── O2: 취향이 축적되지 않는다 (기록이 없음)
│   ├── S2a: Scrobble — 4min/50% 임계값으로 listens 테이블 write
│   └── S2b: "내 감상 히스토리" 페이지 (profile에 통합)
├── O3: 큐레이션 참여가 낮다 (저장은 하는데 발행 안 함)
│   ├── S3a: 저장 → 라이브러리 → 묶기 → 발행 플로우
│   ├── S3b: 관리자·유저 컬렉션 혼합 선반 (발행 시 가시성 보장)
│   └── S3c: 저장 3+ 시 발행 CTA 프롬프트
└── O4: 저장이 눈에 안 띈다
    └── S4a: 플레이어 바 안 1-click 저장 버튼
```

### 1.4 Prioritized Opportunities

| # | Opportunity | Importance | Satisfaction | Score |
|---|------------|:----------:|:------------:|:-----:|
| 1 | O1 감상 지속성 | 1.0 | 0.1 | **0.9** |
| 2 | O2 취향 축적 | 0.9 | 0.0 | **0.9** |
| 3 | O3 큐레이션 발행 | 0.8 | 0.2 | **0.6** |
| 4 | O4 저장 접근성 | 0.7 | 0.3 | **0.4** |

(Score = Importance − Satisfaction. 1.0이 최상위)

### 1.5 Key Assumptions & Risk Prioritization

| # | Assumption | Category | Impact | Risk | Score | Action |
|---|-----------|----------|:------:|:----:|:-----:|--------|
| A1 | YouTube IFrame Player API로 트랙 단위 scrobble이 가능하다 | Feasibility | High | Medium | 9 | Spike 완료 — `getCurrentTime()` polling + `start_sec` 매칭으로 feasible. 백그라운드 throttle ±2-3s 허용 |
| A2 | App Shell 단일 iframe 구조로 재생이 끊기지 않는다 | Feasibility | High | Medium | 9 | Spike 완료 — 루트 layout 고정 마운트 + Zustand 상태 구독, DOM 이동 금지 원칙 |
| A3 | Early curator 500명이 "저장→발행" 플로우에 참여한다 | Desirability | High | High | 12 | 알파 큐레이터 20명 선섭외 + "저장 3+" CTA + Onboarding 샘플 |
| A4 | 감상 시간 증가가 비즈니스 모델로 연결된다 | Viability | Medium | Low | 4 | MVP 단계에서는 성장 후 고민. 현재는 무료 |
| A5 | 유저가 관리자 에디토리얼과 자기 컬렉션을 같은 선반에 노출하는 걸 긍정한다 | Desirability | Medium | Low | 4 | 알파 유저 인터뷰에서 검증 |

### 1.6 Recommended Experiments

| # | Tests Assumption | Method | Success Criteria | Effort |
|---|-----------------|--------|-----------------|:------:|
| E1 | A1 scrobble 정확도 | 내부 계정 7일 사용 후 listens 테이블 로그 감사 | 임계값 판정 오차 < 10% | S |
| E2 | A2 player 지속성 | 전 페이지 탐색 E2E (Playwright) | 재생 단절 0회 / 10회 네비게이션 | M |
| E3 | A3 발행 전환율 | 알파 20명 × 2주 | 주간 publish ≥ 3명 / 20명 (15%+) | M |

---

## 2. Value Proposition & Strategy

### 2.1 JTBD Value Proposition (6-Part)

| Part | Content |
|------|---------|
| **Who** | 유튜브로 음악을 매일 듣는 국내 2030 — 특히 트위터/블로그/커뮤니티에 취향을 드러내본 경험이 있는 사람 |
| **Why** | **"오늘 뭘 들었는지, 어떤 취향의 사람인지"가 축적되고 공유되는 장소가 없다**. 유튜브는 감상이 기록되지 않고, Last.fm은 국내 음원(유튜브 한정)을 못 읽고, Spotify는 유튜브 한정 콘텐츠에 접근 불가 |
| **What Before** | 유튜브 북마크 + 가끔 트위터에 플리 링크 공유 / Apple Music 스크린샷 / 지인 카톡 추천 — 전부 파편적이고 기록되지 않음 |
| **How** | YouTube-native 감상 공간 + Scrobble 자동 기록 + Letterboxd식 저장→묶기→발행 = **유튜브로 듣기만 해도 취향이 쌓이고, 묶으면 큐레이션이 된다** |
| **What After** | 유저는 "내 감상 아카이브"(listens history) + "내가 발행한 컬렉션"을 갖게 된다. 홈에 내 컬렉션이 관리자 에디토리얼과 같은 선반에 노출된다 |
| **Alternatives** | Last.fm (유튜브 미지원), Spotify (유튜브 미접근), YouTube Music (개인 큐레이션 약함), Letterboxd (음악 없음), Apple Music (폐쇄). ClipClef = YouTube × 메타 큐레이션 × 한국어 커뮤니티의 유일한 교집합 |

**Value Proposition Statement**: "유튜브로 음악 듣는 것만으로 취향이 쌓이고, 묶으면 큐레이션이 발행되는 감상 공간."

### 2.2 Lean Canvas

| Section | Content |
|---------|---------|
| **Problem** | 1. 유튜브는 감상이 기록·축적되지 않음 2. 취향을 공유할 아카이빙 도구가 없음 3. 페이지 이동하면 음악 끊김 |
| **Solution** | 1. Scrobble (listens 테이블) 2. 저장→묶기→발행 플로우 3. Global Persistent Player |
| **UVP** | "유튜브로 듣는 것만으로 취향이 쌓이고 큐레이션이 된다" |
| **Unfair Advantage** | YouTube-native × 한국어 × 메타 큐레이션 커뮤니티 (세 교집합에 경쟁자 없음) |
| **Customer Segments** | Curator (발행자) / Listener (감상자) / Archivist (기록자) |
| **Channels** | 트위터 / 인스타 릴스 / 유튜브 음악 유튜버 콜라보 / 커뮤니티(디씨·더쿠) 시딩 |
| **Revenue Streams** | MVP: 무료. 향후: 프리미엄 프로필 / 분석 대시보드 / 아티스트 협찬 |
| **Cost Structure** | Vercel + Supabase (월 $20-50 예상, 1인 개발자) |
| **Key Metrics** | NSM: DAU × session duration / SC2: scrobble/DAU / SC3: weekly publish rate |

### 2.3 SWOT Analysis

| | Helpful | Harmful |
|---|---------|---------|
| **Internal** | **Strengths**: v1 완성도 高 (auth/upload/admin/profile), Next.js 16 + Supabase stable, 1인 개발 민첩성 | **Weaknesses**: Persistent Player 미구현 (기술 난이도 최상위), scrobble 인프라 0, 초기 크리에이터 풀 없음 |
| **External** | **Opportunities**: 국내 Last.fm 대체재 부재, 유튜브 음악 소비 표준화, Letterboxd 모델의 음악 도메인 적용 기회 | **Threats**: YouTube API 정책 변경 리스크, Spotify 한국 확장, 대형 플랫폼(네이버 등) 유사 기능 출시 |

**SO Strategy**: v1 인프라 위에 Persistent Player + Scrobble 빠르게 얹어 "국내 유일 YouTube 감상 공간" 선점
**WT Strategy**: 초기 큐레이터 20명 직접 섭외 (풀 0 리스크 완화) + YouTube API 대체 경로(embed) 고수

---

## 3. Market Research

### 3.1 User Personas

#### Persona 1: **재훈 (Primary — Early Curator)**

| Attribute | Details |
|-----------|---------|
| **Demographics** | 28세, IT 기획자, 서울, 유튜브 일평균 2시간+ |
| **Primary JTBD** | "내가 발굴한 음악을 기록하고 공유하고 싶다" |
| **Pain Points** | 1. 트위터에 링크만 공유하면 흘러감 2. 유튜브 북마크는 정리 안 됨 3. 내 취향을 한눈에 보여줄 "프로필"이 없음 |
| **Desired Gains** | 1. 큐레이터 정체성 획득 2. 팔로워 유입 3. 내 아카이브 소유감 |
| **Unexpected Insight** | 돈 벌려는 게 아니라 **"감성적 권위(soft authority)"** 원함 |
| **Product Fit** | 저장→묶기→발행 플로우 + 홈 1군 노출 = 정확히 이 욕구 충족 |

#### Persona 2: **수진 (Listener — 매일 듣기 유저)**

| Attribute | Details |
|-----------|---------|
| **Demographics** | 24세, 대학생, 유튜브로 공부할 때 음악, 큐레이션 발행은 안 함 |
| **Primary JTBD** | "이미 누군가 잘 골라놓은 플리로 매일 듣고 싶다" |
| **Pain Points** | 1. 유튜브 추천은 랜덤 2. Spotify 한국 카탈로그 제한 3. 플리 바꿀 때마다 재생 끊김 |
| **Desired Gains** | 1. 감상 중단 없는 경험 2. 취향 저격 큐레이션 신뢰 |
| **Product Fit** | Persistent Player + 홈 큐레이션 선반. Scrobble은 부산물로 축적 |

#### Persona 3: **민지 (Archivist — 취향 기록형)**

| Attribute | Details |
|-----------|---------|
| **Demographics** | 32세, 마케터, Last.fm 유저였음, 국내 유튜브 음원 많이 들음 |
| **Primary JTBD** | "내가 뭘 들었는지 정확히 기록하고 싶다" |
| **Pain Points** | 1. Last.fm은 유튜브 미지원 2. 유튜브 히스토리는 검색 기록과 섞임 3. 연말 결산 데이터 없음 |
| **Desired Gains** | 1. 연간 top artist/track 2. 장르별 청취 비중 3. 감상 스트릭 |
| **Product Fit** | Scrobble + listens 히스토리 페이지. 큐레이션 참여는 안 해도 NSM에 기여 |

### 3.2 Competitive Landscape

| Competitor | Strengths | Weaknesses | Our Opportunity |
|-----------|-----------|------------|-----------------|
| **Last.fm** | Scrobble 원조, 통계 풍부, 23년 브랜드 | 유튜브 미지원, 국내 인지도 低, UI 구식 | **YouTube-native + 한국어 + 모던 UI** |
| **Spotify** | 재생 UX 표준, 글로벌 카탈로그 | 한국 음원 부족, 유튜브 한정 콘텐츠 접근 불가, 큐레이션 커뮤니티 약함 | 유튜브 음원 접근성 + 메타 큐레이션 |
| **YouTube Music** | 유튜브 통합, 개인 라이브러리 풍부 | 알고리즘 의존, 인간 큐레이션 커뮤니티 없음, 발행 기능 없음 | **메타 큐레이션 레이어** |
| **Letterboxd** | 메타 큐레이션 모델의 교과서 | 음악 없음 | **모델 이식 — 음악판 Letterboxd** |
| **Apple Music** | 고품질 큐레이션 | 폐쇄적, 유튜브 접근 0, 소셜 약함 | 개방 + 소셜 + 유튜브 |

**Differentiation Strategy**: **"YouTube × 메타 큐레이션 × 한국어"의 3중 교집합** — 경쟁자 전무

### 3.3 Market Sizing

| Metric | Current Estimate | 3-Year Projection |
|--------|:---------------:|:-----------------:|
| **TAM** | 국내 2030 유튜브 음악 유저 ~1,500만 | 1,800만 |
| **SAM** | 이 중 취향 공유 의향층 (SNS 활동적) ~300만 | 400만 |
| **SOM** | 3년 내 active curator + listener ~50,000 | 200,000 |

**Key Assumptions**:
1. 국내 2030 유튜브 음악 사용률 = 전체 인터넷 유저의 ~80% (KCC 통계 근거)
2. SNS에 음악 공유 경험 있는 비율 = 전체의 ~20% (내부 추정)
3. 초기 3년 플랫폼 인지도 확보 시 SOM의 0.1% → 1% 점진 도달

### 3.4 Customer Journey Map (Primary Persona: 재훈)

| Stage | Touchpoint | Actions | Emotions | Pain Points | Opportunities |
|-------|-----------|---------|----------|-------------|---------------|
| Awareness | 트위터에서 친구가 공유한 플리 링크 | 링크 클릭 | 호기심 | "또 사라질 링크인가" | 영속 URL + OG 이미지 |
| Consideration | ClipClef 홈 진입 | 다른 큐레이션 구경, 재생 시도 | 놀람 ("Spotify 같네") | 재생 중 다른 페이지 가면 끊기면 실망 | **Persistent Player** |
| Decision | 구글 로그인 | 1-click | 가벼움 | 없음 | 온보딩 샘플 제공 |
| Onboarding | 첫 플리 저장 | 플레이어 바 저장 버튼 클릭 | "어? 쉽네" | - | **"3개 저장 시 묶어보기" CTA** |
| Usage | 매일 재방문, 3+ 저장 | 묶기 시도 → 한 줄 카피 → 발행 | 창작 만족감 | UI 복잡하면 이탈 | 템플릿 기반 3-step 발행 |
| Advocacy | 홈 선반에 내 컬렉션 노출 | 스크린샷 → 트위터 공유 | 자긍심 | - | 자동 공유 카드 생성 |

**Moments of Truth**:
1. **첫 재생 + 페이지 이동** — 끊기면 이탈, 이어지면 경이로움
2. **첫 발행 후 홈 노출 확인** — 이 순간이 충성도 결정

---

## 4. Go-To-Market

### 4.1 Beachhead Segment

| Criteria | Score (1-5) | Evidence |
|----------|:-----------:|---------|
| Burning Pain | 5 | 취향 공유 욕구 있으나 아카이빙 도구 全 부재 |
| Willingness to Pay | 2 | MVP 단계 무료 — 돈보다 "감상 아카이브 소유감" 지불 |
| Winnable Share | 5 | 경쟁 공백 (YouTube + 메타 큐레이션 + 한국어 교집합 0) |
| Referral Potential | 5 | 발행자 속성 = 공유 욕구 高 — 트위터/인스타 바이럴 내장 |

**Primary Beachhead**: **"국내 2030 early curator 500명"** — 트위터/블로그/커뮤니티에 음악 취향 공유 경험이 있는 사용자.

**90-Day Acquisition Plan**:
1. **Week 1-2**: 트위터·디씨·더쿠 음악 커뮤니티에서 "큐레이터 20명" 직접 섭외 (DM + 알파 초대)
2. **Week 3-6**: 알파 큐레이터 20명이 각 5개 컬렉션 발행 → 초기 디스커버리 컨텐츠 100개
3. **Week 7-10**: 트위터 공유 카드 자동 생성 기능 → 유기적 유입 시작
4. **Week 11-13**: 일반 유저 400명 확보 (베타 오픈)

### 4.2 GTM Strategy

| Element | Details |
|---------|---------|
| **Channels** | 트위터 (primary), 인스타 릴스, 커뮤니티(더쿠·디씨 음악갤) 시딩, 유튜브 음악 유튜버 콜라보 |
| **Messaging** | "유튜브로 듣기만 해도 취향이 쌓인다" / "내가 발굴한 음악, 이제 Letterboxd처럼 기록해요" |
| **Success Metrics** | 90-day: curator 500명 / scrobble/DAU ≥ 1.0 / weekly publish ≥ 8% WAU |
| **Launch Timeline** | Pre-launch(알파 4주, 큐레이터 20명) / Launch(베타 오픈 + 트위터 캠페인) / Post-launch(월별 피쳐드 큐레이터 선정) |

### 4.3 Ideal Customer Profile (ICP)

| Attribute | Details |
|-----------|---------|
| Industry/Vertical | 개인 (B2C) — 유튜브 음악 헤비 유저 |
| Company Size | N/A (개인) |
| Role/Title | 대학생 / 직장인 (2030) / 취향 공유 경험자 |
| Primary JTBD | "내 음악 취향을 기록·공유하고 감상을 끊김 없이" |
| Budget Range | $0 (MVP 무료) — 3년차 이후 $4-8/월 프리미엄 검토 |

### 4.4 Competitive Battlecards

| Category | **ClipClef v2** | Last.fm | YouTube Music | Spotify |
|----------|-----|---------|---------------|---------|
| Positioning | 유튜브 기반 감상+큐레이션 공간 | Scrobble 전문 | 유튜브 통합 음악 | 글로벌 음원 |
| Key Strength | YouTube × 메타 큐레이션 × 한국어 | 역사/데이터 | 카탈로그 | UX 표준 |
| Key Weakness | 신규, 풀 부족 | UI 구식, YouTube 미지원 | 커뮤니티 없음 | 한국 카탈로그 |
| Price | 무료 | 무료/프리미엄 | $10.99/월 | $10.99/월 |
| Best For | "내 취향 기록·공유하는 국내 유튜브 유저" | 통계 덕후 | 유튜브 플레이리스트 | 글로벌 음원 |

### 4.5 Growth Loops

| Loop Type | Trigger | Action | Output | Metric |
|-----------|---------|--------|--------|--------|
| **Content Loop** | 큐레이터 발행 | 홈 선반 노출 → 저장 → 재생 → scrobble 축적 | 콘텐츠 풍부 → 신규 유저 유입 | publish/WAU |
| **Social Loop** | 컬렉션 발행 완료 | 트위터 공유 카드 자동 생성 → 외부 공유 | 유기적 가입 | share/publish |
| **Habit Loop** | 매일 음악 듣기 | Scrobble 자동 기록 → "주간 top artist" 리포트 | 재방문 | scrobble/DAU |

---

## 5. Product Requirements (PRD)

### 5.1 Summary

ClipClef v2는 "유튜브 플리 탐색 도구"에서 **"감상 공간"**으로 정체성을 전환한다. Global Persistent Player로 페이지 이동 중 재생을 지속하고, 트랙 단위 scrobble로 감상을 자동 기록하며, Letterboxd 스타일 저장→묶기→발행 플로우로 유저 큐레이션을 발행한다. 일반 플리 재생과 에디토리얼 큐레이션 재생은 **별도 모드로 유지**하며 같은 플레이어 인프라를 공유한다.

### 5.2 Background & Context

**왜 지금?**
- v1.1 (home-redesign) 출시 후, 유저 리텐션이 낮음 — 홈은 "훑어보는 사이트" 성격이 강해 재방문 주기가 길다
- 국내 Last.fm 대체재가 0 — 경쟁 공백
- Persistent Player는 음악 스트리밍 표준이 됐고(Spotify/YTM), ClipClef만 누락되면 "감상 공간" 주장 성립 불가

**무엇이 바뀌었나?**
- 사용자가 "저장/큐레이션이 외곽에 있다"고 명시적으로 지적
- 메타 큐레이션 모델(Letterboxd)의 음악판 적용이 기술적으로 가능해짐 (Next.js 16 layout 지속성 + YouTube IFrame API + Supabase)

### 5.3 Objectives & Key Results

| Objective | Key Result | Target |
|-----------|-----------|--------|
| O-NSM: 일일 감상 시간 증가 | DAU × avg session duration | 월별 +20% MoM |
| O-A: Scrobble 인프라 작동 | scrobble-per-DAU | ≥ 1.0 (90일 내) |
| O-B: 큐레이션 발행 활성화 | weekly publish rate | ≥ 8% of WAU |

### 5.4 Market Segments

1. **Early Curator** (Primary, Beachhead): 취향 공유 경험 有 — 저장→묶기→발행 플로우 대상
2. **Listener**: 감상만 — Persistent Player + Scrobble 수혜
3. **Archivist**: 기록형 — Scrobble + listens 히스토리 수혜

### 5.5 Value Propositions

§2.1 JTBD 6-Part 참조. 핵심: **"유튜브로 듣는 것만으로 취향이 쌓이고 큐레이션이 된다."**

### 5.6 Solution (Key Features)

| Feature | Description | Priority | Addresses |
|---------|-------------|----------|-----------|
| **F1. Global Persistent Player** | 루트 layout 단일 iframe 마운트, Zustand 상태 스토어, 미니바(항상 보임) + 확장뷰(transform) | **Must** | O1, Persona 2 |
| **F2. Scrobble 인프라** | `listens` 테이블 신설 + 1s polling + 4min/50% 임계값 | **Must** | O2, Persona 3 |
| **F3. 저장 UI 승격** | 플레이어 바 안 1-click 저장 버튼 (Spotify 패턴) | **Must** | O4, 전체 |
| **F4. 내 라이브러리** | 저장한 플리 집합, 홈/프로필 접근 | **Must** | O3 전 단계 |
| **F5. 묶기 → 발행** | 3+ 저장 시 "묶어서 발행" CTA, 한 줄 카피 + 커버, published_at 타임스탬프 | **Must** | O3, Persona 1 |
| **F6. 혼합 선반** | 홈 "에디토리얼·컬렉션" 섹션에 관리자 + 유저 컬렉션 섞어 노출 | **Must** | O3, 발행 동기 |
| **F7. 에디토리얼 재생 모드** | iframe 숨기고 오디오만, 여러 플리 가로지르기 | **Should** | 에디토리얼 UX |
| **F8. 홈 5섹션 재구성** | 이어듣기 / 에디토리얼·컬렉션 / 팔로우 큐레이터 / 전체 피드 / 장르·아티스트 탐색 + Empty State | **Must** | O1-O4 수렴 |
| **F9. 채널 재정의** | "유튜브 채널" → "ClipClef 큐레이터" 개념 전환 (표시/라벨 변경, 데이터 구조는 유지) | **Should** | 메타 큐레이션 정체성 |
| **F10. 감상 히스토리 페이지** | profile에 `listens` 기반 주간/월간 top artist/track | **Could** | Persona 3 |
| **F11. 트위터 공유 카드** | 컬렉션 발행 시 OG 이미지 자동 생성 | **Could** | Growth Loop |
| **F12. YouTube 되돌려보내기** | 현 iframe 링크 격하 — 플레이어 완성 후 제거 | **Could (post-MVP)** | 7축 #7 |

### 5.7 Assumptions & Risks

| # | Assumption | Category | Confidence | Validation Method |
|---|-----------|----------|:----------:|-------------------|
| A1 | iframe API polling으로 scrobble 정확도 허용 범위 | Technical | High | E1 내부 7일 감사 |
| A2 | App Shell 단일 iframe 재생 무결성 | Technical | High | E2 Playwright E2E |
| A3 | Early curator 참여 전환율 | Behavioral | Medium | E3 알파 20명 × 2주 |
| A4 | 관리자 + 유저 혼합 선반 수용 | Behavioral | Medium | 알파 인터뷰 |
| A5 | 저장 버튼 플레이어 바 위치 CTR 상승 | UX | High | Before/After 비교 |

### 5.8 Release Plan

| Phase | Scope | Timeframe |
|-------|-------|-----------|
| **v2.0 (MVP) — "감상 공간 기반" ** | F1 + F2 + F3 + F4 + F5 + F6 + F8 | 6-8주 |
| **v2.1 — "에디토리얼 모드"** | F7 + F9 | +2주 |
| **v2.2 — "아카이빙 심화"** | F10 + F11 | +2주 |
| **v2.3 — "YouTube 격하"** | F12 | post-MVP, condition-based |

**MVP 정의**: F1+F2가 동시에 작동해야 "감상 공간" 메시지 성립. F5가 없으면 Letterboxd 모델 불성립. F6은 발행 동기를 살리기 위해 필수. 나머지는 점진.

---

## 6. Execution Deliverables

### 6.1 Pre-mortem

| # | Failure Mode | Category | Likelihood | Impact | Prevention Strategy |
|---|-------------|----------|:----------:|:------:|-------------------|
| R1 | Persistent Player 안정성 실패 — iframe DOM 이동/재초기화로 재생 끊김 다발 | Tech | Medium | **Critical** | (a) `app/[locale]/layout.tsx` 단일 마운트 원칙 명문화 (b) Zustand single source of truth (c) iframe transform 방식 고수 (d) Playwright E2E 10+ 시나리오 |
| R2 | Scrobble 정확도 신뢰 실패 — 백그라운드 throttle/중복/누락으로 "내 기록 틀림" 불만 | Tech | Medium | High | (a) 4min/50% 임계값 + `visibilitychange` 보정 (b) 투명 감상 히스토리 노출 (c) 수동 삭제 UI |
| R3 | 에디토리얼 발행 참여 저조 — 저장은 늘지만 "묶어서 발행" 전환 低 | Behavioral | **High** | High | (a) 큐레이터 20명 선섭외 (b) 피쳐드 인센티브 (c) "저장 3+" 발행 CTA (d) Onboarding 샘플 |
| R4 | YouTube API 정책 변경 — 임베드/자동재생 제약 | External | Low | Critical | (a) 공식 embed 파라미터 고수 (b) `youtubei` 비공식 API 의존 금지 (c) 모니터링 |
| R5 | 홈 개편 리그레션 — 기존 홈 필터/소팅/무한스크롤 기능 손상 | Tech | Low | Medium | `/playlists`로 이관된 기능 smoke test. 이미 v1.1에서 완료된 상태 재활용 |

**Top 3 Risks**: R1 (Persistent Player), R3 (발행 참여), R2 (Scrobble 정확도) — MVP 전 전부 mitigation 확정 필요.

### 6.2 User Stories

| ID | User Story | Priority | Acceptance Criteria (Given/When/Then) |
|----|-----------|:--------:|--------------------------------------|
| US-1 | 유저로서, 플리를 재생하다 다른 페이지로 이동해도 재생이 끊기지 않기를 원한다 | Must | Given 플리 재생 중 / When 다른 페이지로 navigate / Then 재생 지속, 미니바 표시, currentTime 보존 |
| US-2 | 유저로서, 들은 트랙이 자동으로 기록되기를 원한다 | Must | Given 트랙 재생 / When 4분 or 50% 경과 / Then `listens` 테이블에 (user_id, track_id, played_at) insert |
| US-3 | 유저로서, 1-click으로 플리를 저장하고 싶다 | Must | Given 플리 재생 중 / When 미니바 저장 버튼 클릭 / Then 내 라이브러리에 추가, 토스트 피드백 |
| US-4 | 유저로서, 저장한 플리 3개 이상을 묶어 컬렉션으로 발행하고 싶다 | Must | Given 라이브러리에 3+ 저장 / When "묶기" CTA 클릭 / Then 선택 → 한 줄 카피 → 커버 선택 → published_at 기록 → 홈 선반 노출 |
| US-5 | 유저로서, 내가 발행한 컬렉션이 관리자 에디토리얼과 같은 선반에 노출되는 걸 보고 싶다 | Must | Given 발행 완료 / When 홈 방문 / Then "에디토리얼·컬렉션" 섹션에 혼합 노출 |
| US-6 | 유저로서, 내 감상 히스토리를 주간/월간으로 확인하고 싶다 | Could | Given 프로필 진입 / When "내 감상" 탭 클릭 / Then top artist/track 순위 표시 |
| US-7 | 에디토리얼 발행자로서, 여러 플리에 걸친 오디오-only 재생 모드를 원한다 | Should | Given 에디토리얼 재생 / When 재생 시작 / Then iframe 숨김, 트랙 연속 재생, 플리 간 자동 전환 |

### 6.3 Job Stories

| ID | When (Situation) | I want to (Motivation) | So I can (Outcome) |
|----|-----------------|----------------------|-------------------|
| JS-1 | 공부하며 음악 듣다가 다른 탭/페이지로 이동할 때 | 재생이 끊기지 않길 | 집중을 유지할 수 있다 |
| JS-2 | 매일 음악을 들을 때 | 내가 들은 트랙이 자동 기록되길 | "나는 이런 취향이다"를 증명할 수 있다 |
| JS-3 | 좋은 플리를 발견했을 때 | 한 번 클릭으로 저장하길 | 흐름을 깨지 않고 계속 감상할 수 있다 |
| JS-4 | 비슷한 분위기 플리 3개를 모았을 때 | 묶어서 컬렉션으로 발행하길 | 내 취향을 세상에 드러낼 수 있다 |
| JS-5 | 내 컬렉션이 발행됐을 때 | 홈 선반에 실제로 보이길 | 인정받는 감각을 느낄 수 있다 |

### 6.4 Test Scenarios

| ID | Story Ref | Scenario | Steps | Expected Result | Priority |
|----|-----------|----------|-------|----------------|:--------:|
| T-1 | US-1 | 플리 재생 중 홈 → 프로필 → 플리 상세 이동 | 재생 클릭 / 홈 / 프로필 / 플리 상세 | 미니바 유지, 재생 시간 누적, 끊김 0회 | **P0** |
| T-2 | US-2 | 3분 이하 트랙 재생 | 2분 재생 후 다음 트랙 | listens에 insert (50% 룰) | **P0** |
| T-3 | US-2 | 백그라운드 탭 5분 재생 | 탭 이동 후 5분 대기 | ±3초 오차 내 listens 기록 | P1 |
| T-4 | US-3 | 플레이어 바 저장 버튼 | 재생 중 → 저장 클릭 | 라이브러리 추가, 토스트 표시 | **P0** |
| T-5 | US-4 | 저장 3개 → 발행 플로우 | 3개 저장 → 묶기 → 카피 → 발행 | published_at 기록, 홈 선반 노출 | **P0** |
| T-6 | US-5 | 혼합 선반 노출 확인 | 홈 방문 | 관리자 + 유저 컬렉션 섞여 표시 | **P0** |
| T-7 | US-7 | 에디토리얼 모드 | 에디토리얼 재생 시작 | iframe opacity 0, 트랙 연속 | P1 |
| T-8 | R4 | YouTube 정책 모니터링 | 월 1회 수동 | 공지 변경 없음 확인 | P2 |

### 6.5 Stakeholder Map

| Stakeholder | Role | Power | Interest | Strategy |
|------------|------|:-----:|:--------:|----------|
| iamjinwang@gmail.com | Solo PM + Engineer + Designer | 5 | 5 | Drive all decisions; leverage Agent Team for PRD/Plan/Design validation |
| Alpha Curator 풀 (20명) | Early testers + content seeders | 2 | 4 | 직접 섭외(Week 1-2), 주 1회 피드백 세션, 피쳐드 인센티브 |
| Alpha Listener 풀 (~50명) | Usage metric 기여 | 1 | 3 | 알파 초대링크 / Discord 채널 |
| YouTube (API 제공자) | External dependency | 5 | 1 | 공식 embed + API ToS 준수, 월 모니터링 |
| Supabase/Vercel | Infra | 3 | 1 | 사용량 모니터링, 비용 임계 알림 |

---

## 7. Plans-to-Supersede Registry

v2 피벗이 기존 Plan들을 흡수하거나 retired 처리하는 매핑:

| Existing Plan | Status | v2 Absorbed By |
|--------------|--------|----------------|
| `home-redesign.plan.md` | **Retired** — 배포 완료, v2 홈이 재구성 | F8 홈 5섹션 재구성 |
| `pip-player.plan.md` | **Absorbed** | F1 Global Persistent Player (동일 initiative) |
| `save-button-merge.plan.md` | **Absorbed** | F3 저장 UI 승격 |
| `collection-player.plan.md` | **Absorbed** | F7 에디토리얼 재생 모드 |
| `curation-banner-label.plan.md` | **Absorbed** | F8 홈 섹션 레이블 (에디토리얼 카피 요소) |
| `home-channel-rail.plan.md` | **Retired** | 이미 v1.1 home-redesign M3에 흡수됨 |

**Action**: `/pdca plan clipclef-v2` 착수 시 위 plan들은 신규 작성하지 말고 retired 명시. v2 plan 하나가 위 7-axis 전부 커버.

---

## 8. Data Model Deltas (v2 추가)

v1 스키마 기반에 v2가 추가하는 테이블/컬럼 요약 (상세 설계는 `/pdca design`에서):

| Table | Change | Purpose |
|-------|--------|---------|
| `listens` | **신설** (user_id, track_id, playlist_id, played_at, duration_ms) | Scrobble 레코드 |
| `user_collections` | 신설 or `user_playlists` 확장 (published_at, cover_url, caption) | Letterboxd List 모델 |
| `user_collection_items` | 신설 (collection_id, playlist_id, position) | 묶기 |
| `player_state` (Zustand, 클라이언트) | 신설 | 단일 Persistent Player 소스 오브 트루스 |

---

## 9. Next Steps

1. **v1.1 태그** ✅ 완료 (`v1.1` tag on 69ac3e9, pushed to origin)
2. **`/pdca plan clipclef-v2`** — 이 PRD 자동 참조됨. Plan 단계에서 모듈 분할(Session Guide) 포함해 MVP 범위 확정
3. **Design phase** — F1/F2 기술 스파이크 문서화, 데이터 마이그레이션 설계
4. **Alpha curator 섭외** — Plan 승인 후 Week 1-2 병행 시작 가능
5. **Retired plans 물리 정리** — Plan 완료 후 `docs/archive/2026-04/superseded/`로 이동 (해시 보존용)

---

## Attribution

PRD synthesized from user-provided v2 pivot spec + pm-lead Agent Team analysis (2026-04-22 session).

- Opportunity Solution Tree: Teresa Torres
- JTBD 6-Part: Pawel Huryn & Aatir Abdul Rauf
- Lean Canvas: Ash Maurya
- Beachhead Segment: Geoffrey Moore
- Pre-mortem: Gary Klein
- Job Stories: Alan Klement
