// A simple loading skeleton for your SearchBar
export default function SearchBarFallback() {
  return (
    <div className="w-full flex gap-4 flex-auto text-sm text-gray-400 animate-pulse">
      <div className="w-full flex flex-col gap-3">
        <div className="h-5 bg-gray-700 rounded w-1/4"></div>
        <div className="h-10 bg-gray-800 rounded"></div>
      </div>
      <div className="w-full flex flex-col gap-3">
        <div className="h-5 bg-gray-700 rounded w-1/4"></div>
        <div className="h-10 bg-gray-800 rounded"></div>
      </div>
      <div className="w-full flex flex-col gap-3">
        <div className="h-5 bg-gray-700 rounded w-1/4"></div>
        <div className="h-10 bg-gray-800 rounded"></div>
      </div>
      <div className="w-full flex flex-col gap-3">
        <div className="h-5 bg-gray-700 rounded w-1/4"></div>
        <div className="h-10 bg-gray-800 rounded"></div>
      </div>
    </div>
  );
}
