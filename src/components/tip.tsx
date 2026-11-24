import { cn } from "@/lib/utils";

// Tooltip that shows instantly on hover, and on tap/focus (phones and keyboard).
// `below` puts the bubble under the trigger, for spots near the top of a scroll container
// where a bubble above would be cut off. `align` picks which edge the bubble lines up with.
export function Tip({
  content,
  below,
  align = "right",
  className,
  children,
}: {
  content: React.ReactNode;
  below?: boolean;
  align?: "left" | "right";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span tabIndex={0} className={cn("group relative inline-flex cursor-help outline-none", className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none invisible absolute z-20 w-max max-w-72 whitespace-normal rounded-md bg-zinc-900 px-2.5 py-1.5 text-left text-xs font-normal normal-case tracking-normal text-white opacity-0 shadow-lg transition-opacity",
          "group-hover:visible group-hover:opacity-100 group-focus:visible group-focus:opacity-100",
          align === "right" ? "right-0" : "left-0",
          below ? "top-full mt-1.5" : "bottom-full mb-1.5"
        )}
      >
        {content}
      </span>
    </span>
  );
}
