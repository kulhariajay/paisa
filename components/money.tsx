import { formatINR, formatINRCompact } from "@/lib/paise";
import { cn } from "@/lib/utils";

/** Render paise as INR, optionally tinting by sign or a fixed tone. */
export function Money({
  paise,
  compact = false,
  tone,
  className,
}: {
  paise: number;
  compact?: boolean;
  tone?: "primary" | "danger" | "muted" | "info" | "auto" | "none";
  className?: string;
}) {
  const text = compact ? formatINRCompact(paise) : formatINR(paise);
  let color = "";
  if (tone === "primary") color = "text-primary";
  else if (tone === "danger") color = "text-danger";
  else if (tone === "muted") color = "text-muted";
  else if (tone === "info") color = "text-info";
  else if (tone === "auto") color = paise < 0 ? "text-danger" : "text-primary";
  return <span className={cn("tnum", color, className)}>{text}</span>;
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
