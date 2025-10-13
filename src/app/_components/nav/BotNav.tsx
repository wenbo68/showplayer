import { FaGithub } from 'react-icons/fa6';
import { BiLogoGmail } from 'react-icons/bi';

export default function BotNav() {
  return (
    <nav className="w-full bg-gray-950">
      <div className="text-xs mx-auto max-w-7xl flex flex-col items-center text-center">
        <div className="flex flex-col gap-6 sm:gap-7 md:gap-8 lg:gap-9 xl:gap-10 py-10 sm:py-11 md:py-12 lg:py-13 xl:py-14 px-4">
          <p>
            Disclaimer: Showplayer is a content aggregator that scrapes publicly
            available sources. We don't host or store copyrighted content. All
            content is gathered automatically from third-party websites.
            Copyright infringement claims should be directed to the respective
            third-party sites. For DMCA requests, please contact the original
            content provider.
          </p>
          {/* <p className="font-semibold">© Showplayer. All rights reserved.</p> */}
          <div className="flex w-full h-full items-center justify-center gap-3 md:gap-3">
            <a
              href="mailto:laboratorymember008@gmail.com"
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <BiLogoGmail size={26} className="min-w-fit" />
            </a>

            <a
              href="https://github.com/wenbo68"
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <FaGithub size={24} className="min-w-fit" />
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
}
