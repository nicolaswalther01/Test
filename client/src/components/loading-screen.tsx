export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <div className="w-8 h-8 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin"></div>
        <p className="text-sm text-zinc-500 animate-pulse">Loading...</p>
      </div>
    </div>
  );
}
