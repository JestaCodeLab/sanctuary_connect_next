'use client';

interface PageLoaderProps {
  label?: string;
}

export default function PageLoader({ label = 'Loading...' }: PageLoaderProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 min-h-[50vh]">
      <div className="relative w-10 h-10">
        <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
        <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
      <p className="text-sm text-muted">{label}</p>
    </div>
  );
}
