import Link from "next/link";

type HomeFooterProps = {
  locale: "en" | "zh";
};

export function HomeFooter({ locale }: HomeFooterProps) {
  return (
    <footer className="mt-20 bg-gradient-to-b from-ink to-slate-950 text-white">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sun to-amber-600 shadow-lg">
                <span className="text-lg">✨</span>
              </div>
              <div className="leading-tight">
                <div className="text-sm font-semibold tracking-[0.24em] text-sun">LINGUAFLOW</div>
                <div className="text-xs text-white/70">
                  {locale === "zh" ? "AI 语言学习助手" : "AI language learning copilot"}
                </div>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-white/70">
              {locale === "zh"
                ? "用 AI 把问题、错题和单词沉淀成你的语言知识库。"
                : "Turn questions, mistakes, and vocabulary into your personal language knowledge base."}
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white">{locale === "zh" ? "快速开始" : "Get started"}</h4>
            <ul className="mt-4 space-y-2 text-sm text-white/70">
              <li>
                <Link className="hover:text-sun" href="/mistakes/new">
                  {locale === "zh" ? "提问" : "Ask LinguaFlow"}
                </Link>
              </li>
              <li>
                <Link className="hover:text-sun" href="/mistakes">
                  {locale === "zh" ? "错题列表" : "All mistakes"}
                </Link>
              </li>
              <li>
                <Link className="hover:text-sun" href="/vocabulary">
                  {locale === "zh" ? "单词簿" : "Vocabulary"}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white">{locale === "zh" ? "AI 功能" : "AI features"}</h4>
            <ul className="mt-4 space-y-2 text-sm text-white/70">
              <li>
                <Link className="hover:text-sun" href="/mistakes/new">
                  {locale === "zh" ? "随时提问" : "Ask anytime"}
                </Link>
              </li>
              <li>
                <Link className="hover:text-sun" href="/insights">
                  {locale === "zh" ? "智能分析" : "AI insights"}
                </Link>
              </li>
              <li>
                <Link className="hover:text-sun" href="/mistakes">
                  {locale === "zh" ? "错题复盘" : "Mistake review"}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white">{locale === "zh" ? "关于" : "About"}</h4>
            <p className="mt-4 text-sm leading-6 text-white/70">
              {locale === "zh" ? "让每个问题都成为成长的机会。" : "Turn every question into growth."}
            </p>
          </div>
        </div>

        <div className="mt-12 border-t border-white/10 pt-6 text-center text-xs text-white/50">
          © 2026 LinguaFlow. {locale === "zh" ? "保留所有权利" : "All rights reserved"}.
        </div>
      </div>
    </footer>
  );
}

