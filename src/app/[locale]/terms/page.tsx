export default function TermsPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-2xl font-bold mb-2 text-[var(--foreground)]">이용약관</h1>
      <p className="text-xs text-[var(--subtle)] mb-10">최종 수정일: 2026년 4월 11일</p>

      <Section title="제1조 (목적)">
        <p>
          본 약관은 ClipClef(이하 &ldquo;서비스&rdquo;)가 제공하는 유튜브 플레이리스트 큐레이션 아카이브 서비스의
          이용 조건 및 절차, 이용자와 서비스 간의 권리·의무 등 필요한 사항을 규정함을 목적으로 합니다.
        </p>
      </Section>

      <Section title="제2조 (서비스 소개)">
        <p>
          ClipClef는 관리자가 직접 선별한 유튜브 플레이리스트를 채널·장르·분위기·장소 기준으로
          탐색할 수 있는 큐레이션 아카이브 서비스입니다. 이용자는 Google 소셜 로그인 후
          좋아요, 댓글, 개인 컬렉션 저장 기능을 이용할 수 있습니다.
        </p>
      </Section>

      <Section title="제3조 (약관의 효력 및 변경)">
        <ul>
          <li>본 약관은 서비스 화면에 게시함으로써 효력이 발생합니다.</li>
          <li>
            서비스는 필요한 경우 약관을 변경할 수 있으며, 변경된 약관은 서비스 내 공지 후
            적용됩니다. 변경 후 계속 이용하면 변경 약관에 동의한 것으로 간주합니다.
          </li>
        </ul>
      </Section>

      <Section title="제4조 (이용자의 의무)">
        <p>이용자는 다음 행위를 해서는 안 됩니다.</p>
        <ul>
          <li>타인을 비방·모욕하거나 명예를 훼손하는 댓글 작성</li>
          <li>욕설, 음란, 혐오 표현이 포함된 콘텐츠 게시</li>
          <li>광고·홍보성 스팸 댓글 반복 작성</li>
          <li>타인의 계정 정보를 도용하는 행위</li>
          <li>서비스의 정상적인 운영을 방해하는 일체의 행위</li>
          <li>관계 법령을 위반하는 행위</li>
        </ul>
      </Section>

      <Section title="제5조 (콘텐츠 및 저작권)">
        <ul>
          <li>
            서비스에 노출되는 유튜브 영상 및 플레이리스트 메타데이터의 저작권은 원 저작권자에게
            있으며, 서비스는 YouTube Data API를 통해 공개된 정보를 활용합니다.
          </li>
          <li>이용자가 작성한 댓글의 저작권은 해당 이용자에게 있습니다.</li>
          <li>
            이용자는 서비스에 게시한 콘텐츠를 서비스가 서비스 운영·홍보 목적으로 사용하는 것에
            동의합니다.
          </li>
        </ul>
      </Section>

      <Section title="제6조 (서비스의 변경 및 중단)">
        <p>
          서비스는 운영상·기술상의 이유로 서비스 내용을 변경하거나 일시 중단할 수 있습니다.
          서비스 종료 시에는 사전에 공지합니다. 서비스는 이로 인해 이용자가 입은 손해에 대해
          고의 또는 중대한 과실이 없는 한 책임을 지지 않습니다.
        </p>
      </Section>

      <Section title="제7조 (면책 조항)">
        <ul>
          <li>
            서비스는 이용자가 게시한 콘텐츠의 신뢰성·정확성에 대해 보증하지 않으며,
            이로 인한 분쟁에 개입하지 않습니다.
          </li>
          <li>
            서비스는 YouTube 플랫폼의 정책 변경·API 제한 등 외부 요인으로 인한
            서비스 장애에 대해 책임을 지지 않습니다.
          </li>
          <li>
            이용자 간 또는 이용자와 제3자 간의 분쟁에 대해 서비스는 관여하지 않습니다.
          </li>
        </ul>
      </Section>

      <Section title="제8조 (준거법 및 분쟁 해결)">
        <p>
          본 약관은 대한민국 법령에 따라 해석되며, 서비스 이용과 관련하여 분쟁이 발생한 경우
          관할 법원은 민사소송법상의 관할 법원으로 합니다.
        </p>
      </Section>

      <p className="mt-10 text-xs text-[var(--subtle)]">시행일: 2026년 4월 11일</p>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-base font-semibold mb-3 text-[var(--foreground)]">{title}</h2>
      <div className="text-sm text-[var(--text-secondary)] leading-relaxed space-y-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1">
        {children}
      </div>
    </section>
  );
}
