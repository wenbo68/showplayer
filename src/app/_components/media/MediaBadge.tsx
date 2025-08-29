// Helper component for a clean badge
export const MediaBadge = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <span
    className={`inline-block text-xs font-semibold px-[8px] py rounded-full ${className}`}
  >
    {children}
  </span>
);
