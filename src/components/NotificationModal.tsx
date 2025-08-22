import React from "react";

export function NotificationModal({ onClose }: { onClose?: () => void }) {
  return (
    <div
      className="absolute top-full mt-2 w-[95vw] sm:w-[410px] z-[1000] shadow-xl bg-white rounded-lg overflow-visible left-1/2 -translate-x-1/2 sm:left-auto sm:right-0 sm:translate-x-0"
      style={{ minWidth: '320px', maxWidth: '95vw' }}
    >
      <div className="relative w-full p-4">
        <div className="flex items-center justify-end pt-2 pr-2">
          <button
            type="button"
            className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 inline-flex justify-center items-center"
            onClick={onClose}
            aria-label="Close notification dropdown"
            style={{ position: 'absolute', top: 8, right: 8 }}
          >
            <svg className="w-3 h-3" aria-hidden="true" fill="none" viewBox="0 0 14 14">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
            </svg>
          </button>
        </div>
        <div className="flex items-center justify-between px-2 mb-4">
          <p className="text-xs text-blue-600 font-medium cursor-pointer">Clear all</p>
          <p className="text-xs text-blue-600 font-medium cursor-pointer">Mark as read</p>
        </div>
        <ul className="divide-y divide-gray-300">
          <li className="dropdown-item p-2 hover:bg-gray-50 cursor-pointer">
            <div>
              <h3 className="text-sm text-slate-900 font-medium">Latest update for BotoMoTo</h3>
              <p className="text-xs text-slate-500 leading-relaxed mt-2">Check out the newest features and improvements in your election companion app.</p>
              <p className="text-xs text-blue-600 font-medium leading-3 mt-2">Just now</p>
            </div>
          </li>
        </ul>
        <p className="text-xs px-2 mt-6 mb-4 inline-block text-blue-600 font-medium cursor-pointer">View all Notifications</p>
      </div>
    </div>
  );
}