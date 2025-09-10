// Helper component for a clean badge
export const MediaBadge = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={`text-xs font-semibold rounded px-[9px] py-0.5 ring-1 ring-inset ${className}`}
  >
    {children}
  </div>
);
