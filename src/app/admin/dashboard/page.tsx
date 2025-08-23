"use client";
import { useState } from 'react';
import { MdNotifications } from "react-icons/md";
import { SubmitButton } from '@/components/SubmitButton';
import SearchBar from '@/components/SearchBar';
import Dashboard from '@/components/Dashboard';
import { NotificationModal } from '@/components/NotificationModal';


export default function VoterDashboardPage() {
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);

  return (
    <>
      <div
        id="main-window-template-component"
        className="app h-full flex flex-col min-h-[calc-100vh-4rem] bg-gray-50"
      >
        {/* Universal App Header */}

        <div className="flex-1 bg-white w-full min-w-0 pt-0 md:pt-0 p-4 md:p-8">
          {/* Search and actions */}
          <div className="main-toolbar sticky top-16 z-30 bg-white flex flex-col md:flex-row md:items-center md:gap-4 gap-2 mb-6 py-3 px-2">
            {/* Tabs */}
            <div className="flex-shrink-0">
            </div>
            {/* Search bar */}
            <div className="flex-1">
              <SearchBar
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search for Dashboard"
              />
            </div>
            {/* Action Buttons */}
            <div className="flex-shrink-0 flex gap-2">
              <div className="relative flex items-center gap-2">
                <SubmitButton
                  label=""
                  variant="action"
                  icon={<MdNotifications size={20} />}
                  title="Notification"
                  onClick={() => setShowNotificationModal(prev => !prev)}
                />
                {showNotificationModal && (
                  <NotificationModal onClose={() => setShowNotificationModal(false)} />
                )}
              </div>
            </div>
          </div>
          {/* Table */}
          <div className="main-content flex-auto overflow-auto pb-3 px-2 sm:px-5">
            <Dashboard />
          </div>
        </div>
      </div>
    </>
  );
}