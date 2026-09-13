import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-aldor-emerald focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-aldor-emerald/10 text-aldor-emerald",
        secondary:
          "border-transparent bg-aldor-purple/10 text-aldor-purple-bright",
        destructive:
          "border-transparent bg-aldor-rose/10 text-aldor-rose",
        outline: "text-aldor-text-secondary border-aldor-border-light",
        amber:
          "border-transparent bg-aldor-amber/10 text-aldor-amber",
        cyan:
          "border-transparent bg-aldor-cyan/10 text-aldor-cyan",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
