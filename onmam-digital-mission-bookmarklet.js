(function () {
  const RUNTIME_KEY = "__ONMAM_DIGITAL_MISSION_ANALYZER__";

  function textOf(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function uniqueTexts(elements, limit) {
    const seen = new Set();
    const items = [];
    elements.forEach((element) => {
      const value = textOf(element.textContent);
      if (!value || seen.has(value)) {
        return;
      }
      seen.add(value);
      items.push(value);
    });
    return items.slice(0, limit);
  }

  function hasTextPattern(patterns, haystacks) {
    return patterns.some((pattern) =>
      haystacks.some((value) => pattern.test(value))
    );
  }

  function scoreFromChecks(checks) {
    const total = checks.length || 1;
    const passed = checks.filter((check) => check.passed).length;
    return Math.round((passed / total) * 100);
  }

  function collectPageData() {
    const title = textOf(document.title);
    const description = textOf(
      document.querySelector('meta[name="description"]')?.content
    );
    const viewport = textOf(
      document.querySelector('meta[name="viewport"]')?.content
    );
    const canonical = textOf(
      document.querySelector('link[rel="canonical"]')?.href
    );
    const schemaCount = document.querySelectorAll(
      'script[type="application/ld+json"]'
    ).length;
    const headings = uniqueTexts(
      Array.from(document.querySelectorAll("h1, h2, h3")),
      18
    );
    const paragraphs = uniqueTexts(
      Array.from(document.querySelectorAll("p, li, a, button")),
      120
    );
    const images = Array.from(document.images);
    const links = Array.from(document.querySelectorAll("a"));
    const buttons = Array.from(document.querySelectorAll("button"));
    const allTexts = [title, description, canonical, ...headings, ...paragraphs];

    return {
      title,
      description,
      viewport,
      canonical,
      schemaCount,
      headings,
      paragraphs,
      allTexts,
      imagesCount: images.length,
      imagesWithoutAlt: images.filter((image) => !textOf(image.alt)).length,
      linksCount: links.length,
      buttonsCount: buttons.length,
    };
  }

  function buildChecks(data) {
    const worshipPatterns = [/예배시간/, /주일예배/, /수요예배/, /금요기도회/, /worship/i];
    const locationPatterns = [/오시는 길/, /주소/, /주차/, /지하철/, /location/i, /map/i];
    const newcomerPatterns = [/새가족/, /처음 오신/, /등록/, /문의/, /방문/];
    const sermonPatterns = [/설교/, /말씀/, /sermon/i, /예배 영상/, /주보/];
    const churchPatterns = [/교회/, /목사/, /사역/, /선교/, /기도/, /예배/];
    const questionPatterns = [/\?/, /자주 묻는 질문/, /faq/i, /어떻게/, /가능한가/];

    const seoChecks = [
      {
        label: "페이지 타이틀이 있다",
        passed: data.title.length >= 8,
        detail: data.title || "타이틀이 비어 있습니다.",
      },
      {
        label: "메타 설명이 있다",
        passed: data.description.length >= 40,
        detail: data.description || "메타 설명이 충분하지 않습니다.",
      },
      {
        label: "H1 또는 핵심 헤딩이 있다",
        passed: data.headings.length >= 1,
        detail: data.headings[0] || "주요 헤딩이 보이지 않습니다.",
      },
      {
        label: "예배 또는 교회 핵심 정보가 노출된다",
        passed: hasTextPattern(worshipPatterns, data.allTexts) || hasTextPattern(churchPatterns, data.allTexts),
        detail: "예배시간, 교회 소개, 사역 정보 노출 여부",
      },
      {
        label: "모바일 뷰포트 설정이 있다",
        passed: /width=device-width/i.test(data.viewport),
        detail: data.viewport || "viewport 메타가 없습니다.",
      },
    ];

    const geoChecks = [
      {
        label: "교회 소개 문장이 있다",
        passed: hasTextPattern(churchPatterns, data.allTexts) && data.paragraphs.some((text) => text.length >= 40),
        detail: "AI가 인용할 수 있는 자연어 소개 문장 여부",
      },
      {
        label: "운영 주체나 사역 맥락이 드러난다",
        passed: hasTextPattern([/담임목사/, /교회 소개/, /비전/, /사역/, /mission/i], data.allTexts),
        detail: "신뢰 신호와 운영 맥락 여부",
      },
      {
        label: "구조화 데이터가 있다",
        passed: data.schemaCount > 0,
        detail: data.schemaCount ? `JSON-LD ${data.schemaCount}개` : "구조화 데이터가 없습니다.",
      },
      {
        label: "위치 또는 연락 정보가 텍스트로 있다",
        passed: hasTextPattern(locationPatterns, data.allTexts),
        detail: "주소, 주차, 지도, 교통 안내 등",
      },
    ];

    const aeoChecks = [
      {
        label: "질문-답변형 정보 구조가 있다",
        passed: hasTextPattern(questionPatterns, data.allTexts),
        detail: "FAQ, 질문형 제목, 즉답 문장 여부",
      },
      {
        label: "새가족 또는 방문자 안내가 있다",
        passed: hasTextPattern(newcomerPatterns, data.allTexts),
        detail: "처음 방문자를 위한 동선 여부",
      },
      {
        label: "예배시간 정보가 바로 보인다",
        passed: hasTextPattern(worshipPatterns, data.allTexts),
        detail: "예배 참여 질문에 답할 핵심 정보",
      },
      {
        label: "설교/사역/행사 콘텐츠가 있다",
        passed: hasTextPattern(sermonPatterns, data.allTexts),
        detail: "답변형 검색에 사용할 콘텐츠 층위 여부",
      },
    ];

    const a11yChecks = [
      {
        label: "이미지 대체텍스트 누락이 적다",
        passed:
          data.imagesCount === 0 ||
          data.imagesWithoutAlt / data.imagesCount <= 0.3,
        detail:
          data.imagesCount === 0
            ? "이미지가 없습니다."
            : `alt 누락 ${data.imagesWithoutAlt}/${data.imagesCount}`,
      },
      {
        label: "링크 또는 버튼 인터랙션이 충분하다",
        passed: data.linksCount + data.buttonsCount >= 3,
        detail: `링크 ${data.linksCount}개 / 버튼 ${data.buttonsCount}개`,
      },
      {
        label: "헤딩 구조가 있다",
        passed: data.headings.length >= 2,
        detail: `헤딩 ${data.headings.length}개`,
      },
      {
        label: "긴 설명성 텍스트가 있다",
        passed: data.paragraphs.some((text) => text.length >= 60),
        detail: "고령층/처음 방문자에게 필요한 설명 텍스트 여부",
      },
    ];

    return { seoChecks, geoChecks, aeoChecks, a11yChecks };
  }

  function summarizeInsights(data, checks) {
    const tips = [];

    if (!checks.seoChecks[1].passed) {
      tips.push("메타 설명에 교회명, 지역, 예배시간, 새가족 안내를 함께 넣어 보세요.");
    }
    if (!checks.geoChecks[2].passed) {
      tips.push("교회 소개와 예배 정보를 JSON-LD 구조화 데이터로 추가하면 AI와 검색엔진 이해도가 올라갑니다.");
    }
    if (!checks.aeoChecks[1].passed) {
      tips.push("‘처음 오신 분’, ‘새가족 등록’, ‘주차 안내’ 같은 질문형 안내 블록을 추가해 보세요.");
    }
    if (!checks.a11yChecks[0].passed) {
      tips.push("이미지 alt를 보강해 시각 정보가 텍스트로도 전달되게 해주세요.");
    }
    if (!hasTextPattern([/전화/, /문의/, /contact/i, /카카오/, /이메일/, /mail/i], data.allTexts)) {
      tips.push("문의 전화, 이메일, 카카오톡 등 즉시 연결 수단을 더 눈에 띄게 배치해 보세요.");
    }

    return tips.slice(0, 5);
  }

  function createPanel(results) {
    const previous = document.getElementById("onmam-digital-mission-overlay");
    if (previous) {
      previous.remove();
    }

    const overlay = document.createElement("div");
    overlay.id = "onmam-digital-mission-overlay";
    overlay.innerHTML = `
      <div id="onmam-digital-mission-backdrop"></div>
      <aside id="onmam-digital-mission-panel" role="dialog" aria-label="온맘 디지털선교 분석기 결과">
        <div class="odma-head">
          <div>
            <div class="odma-badge">✝ 온맘 디지털선교 분석기</div>
            <h2>교회 홈페이지 진단 결과</h2>
            <p>${results.titlePreview}</p>
          </div>
          <button type="button" class="odma-icon-button" data-odma-close aria-label="닫기">×</button>
        </div>

        <div class="odma-summary">
          <div class="odma-total">
            <span>전체 점수</span>
            <strong>${results.totalScore}</strong>
          </div>
          <div class="odma-url">${results.url}</div>
        </div>

        <div class="odma-grid">
          ${results.cards
            .map(
              (card) => `
              <section class="odma-card">
                <div class="odma-card-top">
                  <span class="odma-card-icon">${card.icon}</span>
                  <div>
                    <h3>${card.label}</h3>
                    <strong>${card.score}점</strong>
                  </div>
                </div>
                <ul>
                  ${card.checks
                    .map(
                      (check) => `
                        <li class="${check.passed ? "is-pass" : "is-fail"}">
                          <span>${check.passed ? "●" : "○"}</span>
                          <div>
                            <strong>${check.label}</strong>
                            <p>${check.detail}</p>
                          </div>
                        </li>
                      `
                    )
                    .join("")}
                </ul>
              </section>
            `
            )
            .join("")}
        </div>

        <section class="odma-insights">
          <h3>우선 개선 제안</h3>
          <ul>
            ${results.tips.map((tip) => `<li>${tip}</li>`).join("")}
          </ul>
        </section>

        <div class="odma-actions">
          <button type="button" class="odma-action-button" data-odma-copy>결과 복사</button>
          <button type="button" class="odma-action-button secondary" data-odma-rerun>다시 분석</button>
        </div>
      </aside>
    `;

    const style = document.createElement("style");
    style.id = "onmam-digital-mission-style";
    style.textContent = `
      #onmam-digital-mission-overlay {
        position: fixed;
        inset: 0;
        z-index: 2147483646;
        font-family: Pretendard, Manrope, system-ui, sans-serif;
      }
      #onmam-digital-mission-backdrop {
        position: absolute;
        inset: 0;
        background: rgba(6, 8, 14, 0.42);
      }
      #onmam-digital-mission-panel {
        position: absolute;
        top: 0;
        right: 0;
        width: min(460px, 100vw);
        height: 100%;
        overflow-y: auto;
        background: linear-gradient(180deg, #0d1019 0%, #101321 100%);
        color: #f5f7ff;
        box-shadow: -24px 0 80px rgba(0,0,0,0.45);
        padding: 24px;
      }
      .odma-head, .odma-summary, .odma-card, .odma-insights, .odma-actions {
        border: 1px solid rgba(255,255,255,0.08);
        background: rgba(255,255,255,0.04);
        border-radius: 22px;
      }
      .odma-head {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        padding: 22px;
      }
      .odma-badge {
        display: inline-flex;
        padding: 8px 12px;
        border-radius: 999px;
        background: rgba(112, 118, 255, 0.18);
        color: #bec3ff;
        font-size: 12px;
        font-weight: 700;
        margin-bottom: 12px;
      }
      .odma-head h2 {
        font-size: 24px;
        line-height: 1.15;
        margin: 0 0 10px;
      }
      .odma-head p, .odma-url {
        color: #adb4d0;
        font-size: 14px;
        line-height: 1.6;
        word-break: break-all;
      }
      .odma-icon-button, .odma-action-button {
        border: 0;
        cursor: pointer;
      }
      .odma-icon-button {
        width: 38px;
        height: 38px;
        border-radius: 12px;
        background: rgba(255,255,255,0.06);
        color: #fff;
        font-size: 24px;
      }
      .odma-summary {
        margin-top: 16px;
        padding: 20px 22px;
      }
      .odma-total {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 10px;
      }
      .odma-total span {
        color: #a7afcb;
        font-size: 14px;
      }
      .odma-total strong {
        font-size: 42px;
        line-height: 1;
        color: #ffffff;
      }
      .odma-grid {
        display: grid;
        gap: 14px;
        margin-top: 16px;
      }
      .odma-card {
        padding: 18px;
      }
      .odma-card-top {
        display: flex;
        gap: 14px;
        align-items: center;
        margin-bottom: 14px;
      }
      .odma-card-icon {
        width: 40px;
        height: 40px;
        border-radius: 12px;
        display: grid;
        place-items: center;
        background: rgba(255,255,255,0.06);
        font-size: 18px;
      }
      .odma-card-top h3 {
        margin: 0 0 4px;
        font-size: 18px;
      }
      .odma-card-top strong {
        color: #b8bcff;
        font-size: 15px;
      }
      .odma-card ul, .odma-insights ul {
        list-style: none;
        padding: 0;
        margin: 0;
      }
      .odma-card li {
        display: flex;
        gap: 10px;
        margin-top: 10px;
      }
      .odma-card li span {
        margin-top: 2px;
        color: #8b92ff;
        font-size: 12px;
      }
      .odma-card li strong {
        display: block;
        font-size: 14px;
        margin-bottom: 2px;
      }
      .odma-card li p {
        color: #aeb6d2;
        font-size: 13px;
        line-height: 1.55;
      }
      .odma-card li.is-fail span {
        color: #f7b0b0;
      }
      .odma-insights {
        margin-top: 16px;
        padding: 18px;
      }
      .odma-insights h3 {
        margin: 0 0 12px;
        font-size: 18px;
      }
      .odma-insights li {
        color: #dbe1ff;
        font-size: 14px;
        line-height: 1.65;
        margin-top: 10px;
        padding-left: 14px;
        position: relative;
      }
      .odma-insights li::before {
        content: "";
        position: absolute;
        left: 0;
        top: 10px;
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #8d92ff;
      }
      .odma-actions {
        margin-top: 16px;
        padding: 14px;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }
      .odma-action-button {
        padding: 14px 16px;
        border-radius: 14px;
        background: linear-gradient(135deg, #6e73ff, #565bf2);
        color: #fff;
        font-weight: 700;
      }
      .odma-action-button.secondary {
        background: rgba(255,255,255,0.06);
      }
      @media (max-width: 640px) {
        #onmam-digital-mission-panel {
          width: 100vw;
          padding: 16px;
        }
        .odma-actions {
          grid-template-columns: 1fr;
        }
      }
    `;

    document.head.appendChild(style);
    document.body.appendChild(overlay);

    function close() {
      overlay.remove();
      style.remove();
    }

    overlay.querySelector("[data-odma-close]").addEventListener("click", close);
    overlay
      .querySelector("#onmam-digital-mission-backdrop")
      .addEventListener("click", close);
    overlay.querySelector("[data-odma-rerun]").addEventListener("click", () => {
      close();
      window[RUNTIME_KEY].run();
    });
    overlay.querySelector("[data-odma-copy]").addEventListener("click", async () => {
      const text = results.copyText;
      try {
        await navigator.clipboard.writeText(text);
        overlay.querySelector("[data-odma-copy]").textContent = "복사 완료";
        setTimeout(() => {
          const button = overlay.querySelector("[data-odma-copy]");
          if (button) button.textContent = "결과 복사";
        }, 1500);
      } catch (error) {
        window.prompt("아래 내용을 복사해 주세요.", text);
      }
    });
  }

  function analyze() {
    const data = collectPageData();
    const checks = buildChecks(data);
    const cards = [
      { key: "seo", label: "SEO", icon: "🔎", checks: checks.seoChecks },
      { key: "geo", label: "GEO", icon: "🤖", checks: checks.geoChecks },
      { key: "aeo", label: "AEO", icon: "💬", checks: checks.aeoChecks },
      { key: "a11y", label: "A11y", icon: "♿", checks: checks.a11yChecks },
    ].map((card) => ({
      ...card,
      score: scoreFromChecks(card.checks),
    }));

    const totalScore = Math.round(
      cards.reduce((sum, card) => sum + card.score, 0) / cards.length
    );
    const tips = summarizeInsights(data, checks);
    const copyLines = [
      "온맘 디지털선교 분석기 결과",
      `URL: ${location.href}`,
      `전체 점수: ${totalScore}점`,
      ...cards.map((card) => `${card.label}: ${card.score}점`),
      "",
      "우선 개선 제안",
      ...tips.map((tip, index) => `${index + 1}. ${tip}`),
    ];

    createPanel({
      titlePreview: data.title || "제목 없는 페이지",
      url: location.href,
      totalScore,
      cards,
      tips: tips.length ? tips : ["전반적인 구조는 갖추어져 있습니다. 실제 교회 핵심 정보가 첫 화면에서 더 명확히 보이도록 다듬어 보세요."],
      copyText: copyLines.join("\n"),
    });
  }

  const runtime = window[RUNTIME_KEY] || {};
  runtime.run = analyze;
  window[RUNTIME_KEY] = runtime;

  analyze();
})();
