// Helper component for a clean badge
export const MediaBadge = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <span
    className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full ${className}`}
  >
    {children}
  </span>
);
