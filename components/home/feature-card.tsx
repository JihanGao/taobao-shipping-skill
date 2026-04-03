import Link from "next/link";
import type { LucideIcon } from "lucide-react";

type FeatureCardProps = {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
  gradientClassName: string;
  badge?: string;
  badgeClassName?: string;
};

export function FeatureCard({
  href,
  icon: Icon,
  title,
  description,
  gradientClassName,
  badge,
  badgeClassName
}: FeatureCardProps) {
  return (
    <Link
      href={href}
      className="group relative block rounded-3xl border border-white/80 bg-white/90 p-6 text-left shadow-card backdrop-blur transition hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sun/30"
    >
      {badge ? (
        <span
          className={[
            "absolute right-5 top-5 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
            badgeClassName ?? "bg-slate-100 text-slate-700"
          ].join(" ")}
        >
          {badge}
        </span>
      ) : null}

      <div
        className={[
          "mb-4 inline-flex size-14 items-center justify-center rounded-2xl shadow-lg transition-transform group-hover:scale-110",
          "bg-gradient-to-br",
          gradientClassName
        ].join(" ")}
      >
        <Icon className="size-7 text-white" strokeWidth={2} />
      </div>

      <h3 className="text-xl font-semibold tracking-tight text-ink transition-colors group-hover:text-sun">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
    </Link>
  );
}

