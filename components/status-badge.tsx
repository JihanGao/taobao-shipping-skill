import { Locale, MistakeStatus } from "@/lib/types";
import { cn, getStatusClasses, getStatusLabel } from "@/lib/utils";

export function StatusBadge({ status, locale }: { status: MistakeStatus; locale: Locale }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide",
        getStatusClasses(status)
      )}
    >
      {getStatusLabel(status, locale)}
    </span>
  );
}
