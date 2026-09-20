import { cn } from "@/lib/utils";

export const PRODUCT_NAME = "Finance Hub";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] text-white shadow-[0_6px_18px_-8px_oklch(0.45_0.095_197_/_0.9)]",
        "bg-[linear-gradient(140deg,oklch(0.56_0.1_197),oklch(0.4_0.085_212))]",
        className,
      )}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" fill="none" className="size-5">
        <path
          d="M4 16.5 9 11l3.6 3.4L20 6.8"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M4 20.2h16"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.45"
        />
      </svg>
    </span>
  );
}

export function Wordmark({
  className,
  markClassName,
}: {
  className?: string;
  markClassName?: string;
}) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <BrandMark className={markClassName} />
      <span className="text-[17px] font-semibold tracking-tight">
        {PRODUCT_NAME}
      </span>
    </span>
  );
}
