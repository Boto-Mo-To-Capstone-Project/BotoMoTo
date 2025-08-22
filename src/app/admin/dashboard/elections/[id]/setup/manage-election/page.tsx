"use client";
import { SubmitButton } from '@/components/SubmitButton';

import Email from "@/app/assets/Email.png";
import BallotPreview from "@/app/assets/BallotPreview.png";
import OpenElection from "@/app/assets/OpenElection.png";

import { useState } from "react";
import { MFAModal } from '@/components/MFAModal';
import { OpenElectionModal } from '@/components/OpenElectionModal';
import { FiMoreHorizontal } from "react-icons/fi";
import LiveDashboard from "@/app/assets/LiveDashboard.png";
import { MdFileUpload } from 'react-icons/md';

const setupCards = [
    {
    title: "Ballot Preview",
    desc: "Preview the ballot to be used for the election.",
    img: BallotPreview,
    bg: "bg-pink-100",
    text: "text-pink-900",
    },

    {
      title: "Sending of Emails",
      desc: "Setup the email configurations to be sent to voters.",
      img: Email,
      bg: "bg-yellow-100",
      text: "text-yellow-900",
    },
    {
      title: "MFA",
      desc: "Choose a multi-factor authentication method for voters.",
      img: Email,
      bg: "bg-violet-100",
      text: "text-violet-900",
    },
    {
      title: "Open Election",
      desc: "Start the voting for the election.",
      img: OpenElection,
      bg: "bg-blue-100",
      text: "text-blue-900",
    },
    {
      title: "Live Dashboard",
      desc: "Monitor the real-time updates of election voting.",
      img: LiveDashboard,
      bg: "bg-green-100",
      text: "text-green-900",
    },

];

function ManageElectionPage() {
  const [showSteps, setShowSteps] = useState(false);
  const [showMFAModal, setShowMFAModal] = useState(false);
  const [showOpenElectionModal, setShowOpenElectionModal] = useState(false);

  // Example initialData, replace with real election data as needed
  const openElectionInitialData = {
    electionId: 1,
    isOpen: false,
    dateStart: "2025-09-01T08:00",
    dateEnd: "2025-09-01T17:00",
    electionName: "Election 2024",
    description: "Annual board election for 2024.",
  };

  return (
      <div className="flex-1 bg-white w-full min-w-0 pt-0 md:pt-0 p-4 md:p-8 pt-4">
        {/* Red Header Card */}
        <div className="flex items-center rounded-2xl bg-red-800 mb-6 px-6 py-6 relative overflow-hidden mt-8">
          <div>
            <h2 className="text-white text-xl font-semibold mb-2">Hi, Brian King!</h2>
            <p className="text-white text-base">
              Follow the steps below to complete election setup.
            </p>
          </div>
        </div>

      {/* Election Setup Steps Dropdown */}
      <div className="mb-6 px-2 sm:px-5">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center rounded-t-xl px-5 py-4">
            <span className="font-semibold text-base">Steps for Manage Election</span>
            <div className="flex-1" />
            <button
              className="p-2 rounded-full hover:bg-gray-200 transition"
              onClick={() => setShowSteps((prev) => !prev)}
              aria-label="Show steps"
            >
              <FiMoreHorizontal size={22} className="text-gray-400" />
            </button>
          </div>
          <div className="border-b border-gray-200 shadow-sm" />
          {showSteps && (
            <div className="border border-red-400 rounded-lg m-4 p-4 text-gray-700 text-sm bg-white">
              <ol className="space-y-2 list-decimal ml-4">
                <li>Click "MFA" to setup the multi-factor authentication for voters.</li>
                <li>Click "Ballot Preview" to see the initial ballot.</li>
                <li>Click "Sending of Emails" to configure email notifications for voters.</li>
                <li>Click "Open Election" to start the election.</li>
                <li>Click "Live Dashboard" to view the live updates of the election.</li>
              </ol>
            </div>
          )}
          {/* Setup Cards/Buttons inside the card */}
          <div className="main-content pb-3 px-2 sm:px-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mt-2 sm:mt-0 p-4">
              {setupCards.map((card, idx) => (
                <button
                  key={idx}
                  className={`
            ${card.bg} rounded-2xl shadow-md hover:shadow-lg transition-shadow duration-200 p-2
            border-4 border-transparent
            ${idx === 0 ? "hover:border-violet-700" : ""}
            ${idx === 1 ? "hover:border-pink-700" : ""}
            ${idx === 2 ? "hover:border-yellow-700" : ""}
            ${idx === 3 ? "hover:border-blue-700" : ""}
            ${idx === 4 ? "hover:border-green-700" : ""}
              flex flex-col items-center text-left w-full h-60 lg:h-auto
          `}
                  onClick={() => {
                    if (card.title === 'MFA') {
                      setShowMFAModal(true);
                    }
                    if (card.title === 'Open Election') {
                      setShowOpenElectionModal(true);
                    }
                    // Add navigation logic for other cards here
                  }}
                >
                  <div className="w-full mb-2">
                      <img
                        src={card.img.src}
                        alt={card.title}
                        className="w-full h-32 object-contain rounded-xl p-2 bg-[#890806]"
                      />
                  </div>
                  <h3 className={`text-[14px] font-semibold mb-2 px-0 sm:px-0 ${card.text} text-left w-full`}>{card.title}</h3>
                  <p className={`text-[12px] ${card.text} text-left w-full`}>{card.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      {/* MFA Modal */}
      <MFAModal
        open={showMFAModal}
        onClose={() => setShowMFAModal(false)}
        onSave={() => setShowMFAModal(false)}
      />
      {/* Open Election Modal */}
      <OpenElectionModal
        open={showOpenElectionModal}
        onClose={() => setShowOpenElectionModal(false)}
        onSave={() => setShowOpenElectionModal(false)}
        initialData={openElectionInitialData}
      />
    </div>
  );
}

export default ManageElectionPage;