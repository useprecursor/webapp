import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  /** Two-digit section number, shown at the start of the rule. */
  index?: string;
  label: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** A short note set at the far end of the rule, such as a unit or a source. */
  meta?: React.ReactNode;
  className?: string;
  /** Split puts the description in a narrow column to the right on large screens; stack keeps it under the title. */
  layout?: "stack" | "split";
  /** Centre the heading, for sections that open on a single column. */
  align?: "left" | "center";
}

/**
 * A section opens on a hairline rule carrying its number and name in mono,
 * then the headline across most of the width, with the description set
 * beside it in a narrower column.
 */
export function SectionHeading({ index, label, title, description, meta, className, layout = "split", align = "left" }: SectionHeadingProps) {
  const centered = align === "center";
  const split = !centered && layout === "split";
  return (
    <div className={cn(className)}>
      <div className="section-rule">
        <span className="flex items-center gap-3">
          {index && <span className="text-navy">{index}</span>}
          <span className="h-px w-6 bg-line" aria-hidden="true" />
          <span>{label}</span>
        </span>
        {meta && <span className="hidden sm:block">{meta}</span>}
      </div>
      <div
        className={cn(
          "mt-10 md:mt-14",
          split ? "grid gap-6 lg:grid-cols-12 lg:gap-10" : "max-w-3xl",
          centered && "mx-auto max-w-3xl text-center"
        )}
      >
        <h2 className={cn("text-[34px] leading-[1.02] md:text-[48px] lg:text-[60px] [text-wrap:balance]", split && "lg:col-span-8")}>{title}</h2>
        {description && (
          <p
            className={cn(
              "text-[15.5px] leading-[1.7] text-tide md:text-[16px]",
              split ? "lg:col-span-4 lg:self-end lg:pb-2" : "mt-5 max-w-2xl",
              centered && "mx-auto"
            )}
          >
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
