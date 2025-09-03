"use client";
import { SubmitButton } from '@/components/SubmitButton';

import BallotPreview from "@/app/assets/BallotPreview.png";
import Email from "@/app/assets/Email.png";
import Setup from "@/app/assets/Setup.png";
import OpenElection from "@/app/assets/OpenElection.png";
import LiveDashboard from "@/app/assets/LiveDashboard.png";

import { useState, useEffect } from "react";
import { MFAModal } from '@/components/MFAModal';
import { OpenElectionModal } from '@/components/OpenElectionModal';
import { FiMoreHorizontal } from "react-icons/fi";
import { MdFileUpload } from 'react-icons/md';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from "next-auth/react";
import { toast, Toaster } from "react-hot-toast";

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
      img: Setup,
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

export default function ManageElectionPage() {
  const params = useParams<{ id: string }>();
  const electionId = Number(params?.id);
  const router = useRouter();
  const { data: session } = useSession();
  const [showSteps, setShowSteps] = useState(false);
  const [showMFAModal, setShowMFAModal] = useState(false);
  const [showOpenElectionModal, setShowOpenElectionModal] = useState(false);
  const [electionData, setElectionData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch election data
  useEffect(() => {
    const fetchElectionData = async () => {
      try {
        const response = await fetch(`/api/elections/${electionId}`);
        const result = await response.json();
        
        if (response.ok) {
          setElectionData(result.data.election);
        } else {
          toast.error(result.message || "Failed to fetch election data");
        }
      } catch (error) {
        console.error("Error fetching election data:", error);
        toast.error("Failed to fetch election data");
      } finally {
        setIsLoading(false);
      }
    };

    if (electionId) {
      fetchElectionData();
    }
  }, [electionId]);

  // Prepare modal data from real election data
  const openElectionInitialData = electionData ? {
    electionId: electionData.id,
    isOpen: electionData.status === 'ACTIVE',
    dateStart: electionData.schedule?.dateStart || "",
    dateEnd: electionData.schedule?.dateFinish || "",
    electionName: electionData.name,
    description: electionData.description,
  } : {
    electionId: electionId,
    isOpen: false,
    dateStart: "",
    dateEnd: "",
    electionName: "Loading...",
    description: "",
  };

  // Handle election status update
  const handleElectionStatusUpdate = async (data: { electionId: number; isOpen: boolean }) => {
    try {
      const action = data.isOpen ? "open" : "close";
      const response = await fetch(`/api/elections/${data.electionId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to update election status");
      }

      toast.success(result.message || `Election ${action}d successfully`);
      
      // Update local election data
      if (electionData) {
        setElectionData({
          ...electionData,
          status: data.isOpen ? 'ACTIVE' : 'CLOSED'
        });
      }
      
      setShowOpenElectionModal(false);
    } catch (error) {
      console.error("Error updating election status:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update election status");
    }
  };

  return (
      <div className="flex-1 bg-white w-full min-w-0 pt-0 md:pt-0 p-4 md:p-8 pt-4">
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-800 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading election data...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Red Header Card */}
            <div className="flex items-center rounded-2xl bg-red-800 mb-6 px-6 py-6 relative overflow-hidden mt-8">
              <div>
                <h2 className="text-white text-xl font-semibold mb-2">Hi, {session?.user?.name || 'User'}!</h2>
                <p className="text-white text-base">
                  Follow the steps below to complete election setup for "{electionData?.name || 'your election'}".
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
                    if (card.title === 'Ballot Preview') {
                      router.push(`/admin/dashboard/elections/${electionId}/setup/manage-election/ballot-preview`);
                    }
                    if (card.title === 'Sending of Emails') {
                      router.push(`/admin/dashboard/elections/${electionId}/setup/manage-election/send-email`);
                    }
                    if (card.title === 'MFA') {
                      setShowMFAModal(true);
                    }
                    if (card.title === 'Open Election') {
                      setShowOpenElectionModal(true);
                    }
                    if (card.title === 'Live Dashboard') {
                      // Navigate to Live Dashboard page
                      router.push(`/admin/dashboard/elections/${electionId}/setup/manage-election/live-dashboard`);
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
        onSave={handleElectionStatusUpdate}
        initialData={openElectionInitialData}
      />
          </>
        )}
        {/*<Toaster position="top-center" />*/}
      </div>
  );
}