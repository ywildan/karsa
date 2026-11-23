export function QuotaDots({
  alpha,
  limit,
  className = "",
}: {
  alpha: number;
  limit: number;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`} aria-hidden>
      {Array.from({ length: limit }).map((_, index) => (
        <span
          key={index}
          className={`h-2.5 w-2.5 rounded-full ${
            index < Math.min(alpha, limit) ? "bg-destructive" : "bg-secondary"
          }`}
        />
      ))}
      <span className="ml-1 text-xs font-semibold text-foreground">
        {Math.min(alpha, limit)}/{limit}
      </span>
    </span>
  );
}
