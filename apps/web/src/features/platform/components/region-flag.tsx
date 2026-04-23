import { regionName } from "@/features/platform/data/regions";
import { cn } from "@/lib/utils";

export function RegionFlag({
  code,
  className
}: {
  code: string;
  className?: string;
}) {
  const normalized = code.toUpperCase();

  if (normalized === "UN" || !/^[A-Z]{2}$/.test(normalized)) {
    return (
      <span
        aria-label="Global region"
        className={cn(
          "inline-flex h-4 w-6 items-center justify-center border text-[9px] font-semibold leading-none",
          className
        )}
      >
        UN
      </span>
    );
  }

  return (
    <img
      src={`https://flagcdn.com/24x18/${normalized.toLowerCase()}.png`}
      srcSet={`https://flagcdn.com/48x36/${normalized.toLowerCase()}.png 2x`}
      alt={`${regionName(normalized)} flag`}
      loading="lazy"
      referrerPolicy="no-referrer"
      className={cn("inline-block h-[14px] w-5 border object-cover", className)}
    />
  );
}
