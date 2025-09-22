'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { ListMedia } from '~/type';
import { useSwipeable } from 'react-swipeable';
import MediaButton from './MediaButton';

const CarouselIndicator = ({
  index,
  currentIndex,
  onClick,
}: {
  index: number;
  currentIndex: number;
  onClick: (value: React.SetStateAction<number>) => void;
}) => (
  <button
    onClick={() => onClick(index)}
    className={`cursor-pointer h-0.5 w-2 md:h-1 md:w-4 rounded transition-all duration-300 ${
      currentIndex === index ? 'bg-gray-300' : 'bg-gray-700'
    }`}
    aria-label={`Go to slide ${index + 1}`}
  />
);

// const CarouselArrow = ({
//   direction,
//   onClick,
// }: {
//   direction: 'left' | 'right';
//   onClick: () => void;
// }) => {
//   const isLeft = direction === 'left';
//   return (
//     <button
//       onClick={onClick}
//       className={`hidden md:block cursor-pointer absolute top-1/2 -translate-y-1/2 ${
//         isLeft ? 'left-0.5' : 'right-0.5'
//       } z-20 text-gray-300 transition-all hover:text-blue-400`}
//       aria-label={isLeft ? 'Previous slide' : 'Next slide'}
//     >
//       <svg
//         xmlns="http://www.w3.org/2000/svg"
//         className="h-6 w-6"
//         fill="none"
//         viewBox="0 0 24 24"
//         stroke="currentColor"
//       >
//         <path
//           strokeLinecap="round"
//           strokeLinejoin="round"
//           strokeWidth={2}
//           d={isLeft ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'}
//         />
//       </svg>
//     </button>
//   );
// };

export default function TrendingCarousel({
  pageMediaIds,
  trendingList,
}: {
  pageMediaIds: string[];
  trendingList: ListMedia[];
}) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const goToNext = useCallback(() => {
    setCurrentIndex(
      (prevIndex) => (prevIndex + 1) % (trendingList?.length || 1)
    );
  }, [trendingList]);

  const goToPrevious = () => {
    setCurrentIndex(
      (prevIndex) =>
        (prevIndex - 1 + (trendingList?.length || 1)) %
        (trendingList?.length || 1)
    );
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  useEffect(() => {
    if (!trendingList || trendingList.length === 0) return;

    const timer = setTimeout(() => {
      goToNext();
    }, 5000); // 5 seconds

    // Clear the timeout when the component unmounts or the index changes
    return () => clearTimeout(timer);
  }, [currentIndex, trendingList, goToNext]);

  // ✨ 2. Configure the swipe handlers
  const handlers = useSwipeable({
    // A left swipe should go to the next item
    onSwipedLeft: () => goToNext(),
    // A right swipe should go to the previous item
    onSwipedRight: () => goToPrevious(),
    // This prevents the browser from scrolling down the page on mobile
    preventScrollOnSwipe: true,
    // This allows for click-and-drag swiping on desktop
    trackMouse: true,
  });

  return (
    <div {...handlers} className="relative w-full aspect-video overflow-hidden">
      {/* Slides Container */}
      <div className="w-full h-full">
        {trendingList.map((mediaDetail, index) => (
          <MediaButton
            key={mediaDetail.media.id}
            pageMediaIds={pageMediaIds}
            mediaDetail={mediaDetail}
            displayMode="carousel"
            isActive={index === currentIndex}
          />
        ))}
      </div>

      {/* Navigation Arrows */}
      {/* <CarouselArrow direction="left" onClick={goToPrevious} />
      <CarouselArrow direction="right" onClick={goToNext} /> */}

      {/* Navigation Indicators */}
      <div className="absolute bottom-0 right-0 w-1/2 p-2 z-20 flex gap-1 items-center justify-end ">
        {trendingList.map((_, index) => (
          <CarouselIndicator
            key={index}
            index={index}
            currentIndex={currentIndex}
            onClick={() => setCurrentIndex(index)}
          />
        ))}
      </div>
    </div>
  );
}
