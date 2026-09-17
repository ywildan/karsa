/**
 * Karsa — components/ui/label.tsx
 * ----------------------------------------------------------------------------
 * Label form bergaya shadcn/ui (Fase 2A). Implementasi HTML native tanpa
 * dependency tambahan — cukup untuk form dialog admin.
 */
import * as React from "react";

import { cn } from "@/lib/utils";

const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  // eslint-disable-next-line jsx-a11y/label-has-associated-control
  <label
    ref={ref}
    className={cn(
      "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
      className,
    )}
    {...props}
  />
));
Label.displayName = "Label";

export { Label };
