'use client';

import { usePathname } from 'next/navigation';
import type { Source } from '~/type';
import { NavButton } from '../NavButton';

interface SourceSelectorProps {
  sources: Source[];
  selectedProvider?: number;
}

export function SourceSelector({
  sources,
  selectedProvider,
}: SourceSelectorProps) {
  const pathname = usePathname();
  const basePath = pathname.substring(0, pathname.lastIndexOf('/'));

  // const [isServersExpanded, setIsServersExpanded] = useState(() => {
  //   if (typeof window === 'undefined') return false; // Guard for SSR
  //   return sessionStorage.getItem('isServersExpanded') === 'true';
  // });

  // useEffect(() => {
  //   sessionStorage.setItem('isServersExpanded', String(isServersExpanded));
  // }, [isServersExpanded]);

  // const serversContainerRef = useRef<HTMLDivElement>(null);

  // useEffect(() => {
  //   const container = serversContainerRef.current;
  //   if (!container || isServersExpanded) return;

  //   const activeEpisode = container.querySelector<HTMLElement>(
  //     '[data-active="true"]'
  //   );
  //   if (activeEpisode) {
  //     const containerWidth = container.offsetWidth;
  //     const elementLeft = activeEpisode.offsetLeft;
  //     const newScrollPosition = elementLeft - containerWidth / 2;

  //     // Apply the scroll only to the horizontal container
  //     container.scrollTo({
  //       left: newScrollPosition,
  //       behavior: 'smooth',
  //     });
  //   }
  // }, [selectedProvider, isServersExpanded]); // Reruns when the page/episode or season changes

  return (
    <div className="flex flex-col gap-2">
      {/** label */}
      <div
        className="flex gap-2 items-baseline"
        // onClick={() => setIsServersExpanded(!isServersExpanded)}
      >
        <span className="text-base font-semibold">Server</span>
        <span className="text-xs font-semibold">
          Please try a different server if the video's lagging.
        </span>
        {/* {isServersExpanded ? (
          <MdOutlineKeyboardArrowDown className="relative top-[3px] left-[1px]" />
        ) : (
          <MdOutlineKeyboardArrowLeft className="relative top-[3px] left-[1px]" />
        )} */}
      </div>
      {/** server buttons */}
      <div
        // ref={serversContainerRef}
        className={`flex gap-2 ${
          // isServersExpanded ? 'flex-wrap' :
          'overflow-x-auto scrollbar-hide'
        }`}
      >
        {sources.map((source) => (
          <NavButton
            key={source.id}
            href={`${basePath}/${source.provider}`}
            isActive={source.provider === selectedProvider}
          >
            {source.provider}
          </NavButton>
        ))}
      </div>
    </div>
  );
}
