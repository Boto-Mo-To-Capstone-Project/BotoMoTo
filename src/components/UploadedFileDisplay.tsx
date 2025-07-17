"use client";

interface UploadedFileDisplayProps {
  file: File;
  onDownload?: () => void;
  className?: string;
}

export function UploadedFileDisplay({ file, onDownload, className = "" }: UploadedFileDisplayProps) {
  const isSample = file.name === "Sample_Letter.pdf";
  const displayName = isSample ? "Sample Organization Letter (Template)" : file.name;
  const fileUrl = isSample ? "/api/admin/onboard/sample-letter" : undefined;

  if (isSample) {
    // For the sample letter, clicking anywhere previews and downloads
    return (
      <a
        href={fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        download
        className={`flex items-center justify-between mt-3 border-2 border-[var(--color-primary)] rounded-xl p-4 text-sm bg-white ${className} cursor-pointer`}
        style={{ textDecoration: "none" }}
        tabIndex={0}
        aria-label={`Preview and Download ${displayName}`}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[var(--color-primary)]/10">
            <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='var(--color-primary)' className='w-6 h-6'><path strokeLinecap='round' strokeLinejoin='round' d='M19.5 14.25v2.25A2.25 2.25 0 0 1 17.25 18.75H6.75A2.25 2.25 0 0 1 4.5 16.5V14.25m15-4.5V6.75A2.25 2.25 0 0 0 17.25 4.5H6.75A2.25 2.25 0 0 0 4.5 6.75v3m15 0-7.5 7.5m0 0-7.5-7.5m7.5 7.5V9.75' /></svg>
          </span>
          <div className="flex flex-col min-w-0">
            <span className="font-medium text-gray-900">{displayName}</span>
            <span className="text-xs text-gray-500">{(file.size / 1024).toFixed(0)} KB</span>
          </div>
        </div>
        <span className="[&>svg]:stroke-[var(--color-primary)] text-[var(--color-primary)] hover:text-[var(--color-primary)] p-2 rounded-full transition-colors ml-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v10m0 0-4-4m4 4 4-4" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 20h14" />
          </svg>
        </span>
      </a>
    );
  }

  return (
    <div className={`flex items-center justify-between mt-3 border-2 border-[var(--color-primary)] rounded-xl p-4 text-sm bg-white ${className}`}>
      {/* Preview link (icon + name) for sample letter */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[var(--color-primary)]/10">
          <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='var(--color-primary)' className='w-6 h-6'><path strokeLinecap='round' strokeLinejoin='round' d='M19.5 14.25v2.25A2.25 2.25 0 0 1 17.25 18.75H6.75A2.25 2.25 0 0 1 4.5 16.5V14.25m15-4.5V6.75A2.25 2.25 0 0 0 17.25 4.5H6.75A2.25 2.25 0 0 0 4.5 6.75v3m15 0-7.5 7.5m0 0-7.5-7.5m7.5 7.5V9.75' /></svg>
        </span>
        <div className="flex flex-col min-w-0">
          <span className="font-medium text-gray-900">{displayName}</span>
          <span className="text-xs text-gray-500">{(file.size / 1024).toFixed(0)} KB</span>
        </div>
      </div>
      {/* Download button for sample letter uses API route; for others, uses onDownload */}
      <button
        type="button"
        className="[&>svg]:stroke-[var(--color-primary)] text-[var(--color-primary)] hover:text-[var(--color-primary)] p-2 rounded-full transition-colors ml-2"
        title="Download"
        onClick={onDownload}
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v10m0 0-4-4m4 4 4-4" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 20h14" />
        </svg>
      </button>
    </div>
  );
} 