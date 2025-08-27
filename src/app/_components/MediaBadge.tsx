// Helper component for a clean badge
export const MediaBadge = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <span
    className={`inline-block text-xs font-semibold px-[9px] py-[1px] rounded-full ${className}`}
  >
    {children}
  </span>
);
