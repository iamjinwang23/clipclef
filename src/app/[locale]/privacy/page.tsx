export default function PrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-2xl font-bold mb-2 text-[var(--foreground)]">개인정보처리방침</h1>
      <p className="text-sm text-[var(--subtle)] mb-10">최종 수정일: 2026년 4월 11일</p>

      <Section title="제1조 (개인정보의 처리 목적)">
        <p>
          ClipClef(이하 &ldquo;서비스&rdquo;)는 다음의 목적을 위하여 개인정보를 처리합니다.
          처리한 개인정보는 아래 목적 이외의 용도로 사용되지 않으며, 이용 목적이 변경되는 경우에는
          별도의 동의를 받는 등 필요한 조치를 이행합니다.
        </p>
        <ul>
          <li>회원 가입 및 본인 식별</li>
          <li>좋아요·댓글·큐레이션 저장 등 서비스 기능 제공</li>
          <li>서비스 운영 및 관리</li>
        </ul>
      </Section>

      <Section title="제2조 (수집하는 개인정보 항목)">
        <p>서비스는 Google 소셜 로그인을 통해 아래 정보를 수집합니다.</p>
        <table>
          <thead>
            <tr>
              <th>수집 항목</th>
              <th>수집 경로</th>
              <th>수집 목적</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>이름 (Google 계정 이름)</td>
              <td>Google OAuth 2.0</td>
              <td>프로필 표시</td>
            </tr>
            <tr>
              <td>이메일 주소</td>
              <td>Google OAuth 2.0</td>
              <td>계정 식별</td>
            </tr>
            <tr>
              <td>프로필 이미지 URL</td>
              <td>Google OAuth 2.0</td>
              <td>프로필 이미지 표시</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-2">
          서비스 이용 과정에서 이용자가 직접 입력한 댓글, 닉네임 등의 정보도 저장됩니다.
        </p>
      </Section>

      <Section title="제3조 (개인정보의 보유 및 이용 기간)">
        <ul>
          <li>
            <strong>보유 기간:</strong> 회원 탈퇴 시까지. 탈퇴 후에는 지체 없이 파기합니다.
          </li>
          <li>
            단, 관계 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관합니다.
          </li>
        </ul>
      </Section>

      <Section title="제4조 (개인정보의 제3자 제공)">
        <p>
          서비스는 이용자의 개인정보를 원칙적으로 제3자에게 제공하지 않습니다.
          다만, 이용자의 동의가 있거나 법령에 의한 경우에는 예외로 합니다.
        </p>
      </Section>

      <Section title="제5조 (개인정보 처리 위탁)">
        <p>서비스는 원활한 서비스 제공을 위해 아래와 같이 개인정보 처리를 위탁합니다.</p>
        <table>
          <thead>
            <tr>
              <th>수탁 업체</th>
              <th>위탁 업무</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Supabase, Inc.</td>
              <td>인증 처리 및 데이터베이스 운영</td>
            </tr>
            <tr>
              <td>Google LLC</td>
              <td>소셜 로그인 인증 (OAuth 2.0)</td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section title="제6조 (이용자의 권리)">
        <p>이용자는 언제든지 다음의 권리를 행사할 수 있습니다.</p>
        <ul>
          <li>개인정보 열람 요청</li>
          <li>개인정보 정정·삭제 요청 (서비스 내 프로필 설정 또는 이메일 문의)</li>
          <li>개인정보 처리 정지 요청</li>
          <li>회원 탈퇴 (탈퇴 시 수집된 개인정보 파기)</li>
        </ul>
      </Section>

      <Section title="제7조 (개인정보의 파기)">
        <p>
          이용 목적이 달성된 개인정보는 재생 불가능한 방법으로 파기합니다.
          전자적 파일 형태의 정보는 기술적 방법을 사용하여 삭제합니다.
        </p>
      </Section>

      <Section title="제8조 (개인정보 보호책임자)">
        <p>
          서비스는 개인정보 처리에 관한 업무를 총괄하고, 이용자의 개인정보 관련 불만 처리 및
          피해 구제를 위해 아래와 같이 개인정보 보호책임자를 지정합니다.
        </p>
        <ul>
          <li>서비스명: ClipClef</li>
          <li>문의: 서비스 내 문의 채널</li>
        </ul>
      </Section>

      <Section title="제9조 (쿠키의 사용)">
        <p>
          서비스는 인증 세션 유지를 위해 쿠키(Cookie)를 사용합니다. 이용자는 브라우저 설정을
          통해 쿠키 저장을 거부할 수 있으나, 이 경우 로그인 등 일부 기능 이용이 제한될 수 있습니다.
        </p>
      </Section>

      <p className="mt-10 text-sm text-[var(--subtle)]">시행일: 2026년 4월 11일</p>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-base font-semibold mb-3 text-[var(--foreground)]">{title}</h2>
      <div className="text-sm text-[var(--text-secondary)] leading-relaxed space-y-2
        [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1
        [&_table]:w-full [&_table]:border-collapse [&_table]:text-xs
        [&_th]:text-left [&_th]:py-2 [&_th]:px-3 [&_th]:border [&_th]:border-[var(--border)] [&_th]:bg-[var(--muted)] [&_th]:font-medium [&_th]:text-[var(--foreground)]
        [&_td]:py-2 [&_td]:px-3 [&_td]:border [&_td]:border-[var(--border)]
        [&_strong]:text-[var(--foreground)]">
        {children}
      </div>
    </section>
  );
}
