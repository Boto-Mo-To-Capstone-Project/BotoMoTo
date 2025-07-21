"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import { CompleteTaskModal } from "@/components/CompleteTaskModal";
import { AuthFooter } from "@/components/AuthFooter";
import AuthContainer from '@/components/AuthContainer';
import { SubmitButton } from "@/components/SubmitButton";

type ApplicationStatus = 'getting_started' | 'submitted' | 'reviewing' | 'approved' | 'rejected';

function StatusBadge({ status }: { status: ApplicationStatus }) {
  const config = {
    getting_started: { text: 'Getting Started', bg: 'bg-gray-100', textColor: 'text-gray-800' },
    submitted: { text: 'Submitted', bg: 'bg-blue-100', textColor: 'text-blue-800' },
    reviewing: { text: 'Under Review', bg: 'bg-yellow-100', textColor: 'text-yellow-800' },
    approved: { text: 'Approved', bg: 'bg-green-100', textColor: 'text-green-800' },
    rejected: { text: 'Rejected', bg: 'bg-red-100', textColor: 'text-red-800' },
  }[status] || { text: 'Unknown', bg: 'bg-gray-100', textColor: 'text-gray-800' };

  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.textColor}`}>
      {config.text}
    </span>
  );
}

function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
      <div 
        className="h-2 rounded-full transition-all duration-500" 
        style={{width: `${progress}%`, backgroundColor: 'var(--color-secondary)'}}
      ></div>
    </div>
  );
}

function ApplicationStepper({ 
  status, 
  onComplete, 
  onSubmit, 
  onAccessDashboard 
}: { 
  status: ApplicationStatus; 
  onComplete: () => void; 
  onSubmit: () => void;
  onAccessDashboard: () => void;
}) {
  const [openStep, setOpenStep] = useState(-1);
  
  const steps = [
    {
      id: 0,
      title: "Complete Profile",
      description: "Fill out your organization details and upload required documents",
      action: "Complete Profile",
      isActive: status === 'getting_started',
      isCompleted: ['submitted', 'reviewing', 'approved'].includes(status),
      onClick: onComplete
    },
    {
      id: 1,
      title: "Submit for Review",
      description: "Submit your completed profile for admin review",
      action: "Submit for Review",
      isActive: status === 'submitted',
      isCompleted: ['reviewing', 'approved'].includes(status),
      onClick: onSubmit
    },
    {
      id: 2,
      title: "Awaiting Approval",
      description: "Your application is being reviewed by our team",
      action: "Under Review",
      isActive: status === 'reviewing',
      isCompleted: ['approved'].includes(status),
      onClick: null
    },
    {
      id: 3,
      title: "Access Dashboard",
      description: "Your application has been approved. Access your admin dashboard",
      action: "Access Dashboard",
      isActive: status === 'approved',
      isCompleted: false,
      onClick: onAccessDashboard
    }
  ];

  return (
    <div className="flex flex-col gap-5 py-2">
      {steps.map((step) => (
        <div key={step.id}>
          <button
            type="button"
            className={`flex items-center w-full py-2 text-left font-semibold ${
              step.isActive ? 'text-[var(--color-primary)]' : 
              step.isCompleted ? 'text-green-600' : 'text-gray-400'
            }`}
            onClick={() => step.onClick ? step.onClick() : setOpenStep(openStep === step.id ? -1 : step.id)}
            disabled={!step.isActive && !step.isCompleted}
          >
            <span className={`w-6 h-6 flex items-center justify-center rounded-full mr-3 text-sm font-bold ${
              step.isActive ? 'bg-[var(--color-primary)] text-white' :
              step.isCompleted ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'
            }`}>
              {step.isCompleted ? '✓' : step.id + 1}
            </span>
            {step.title}
            <span className="ml-auto">{openStep === step.id ? '▲' : '▼'}</span>
          </button>
          {openStep === step.id && (
            <div className="pl-9 pb-4">
              <div className="text-gray-500 text-sm mb-3 max-w-xs">{step.description}</div>
              {step.onClick && step.isActive && (
                <SubmitButton 
                  label={step.action} 
                  isLoading={false} 
                  className="w-full" 
                  onClick={step.onClick} 
                  type="button" 
                />
              )}
              {step.isCompleted && !step.onClick && (
                <span className="text-green-600 text-sm">✓ Completed</span>
              )}
              {!step.isActive && !step.isCompleted && (
                <span className="text-gray-400 text-sm">⏳ Waiting...</span>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function OnboardProcessingPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();

  const [showModal, setShowModal] = useState(false);
  const [status, setStatus] = useState<ApplicationStatus>('getting_started');

  const getProgress = (status: ApplicationStatus) => {
    switch (status) {
      case 'getting_started': return 25;
      case 'submitted': return 50;
      case 'reviewing': return 75;
      case 'approved': return 100;
      case 'rejected': return 25;
      default: return 0;
    }
  };
  
  useEffect(() => {
    async function checkOnboardingStatus() {
      try {
        const res = await fetch("/api/organizations");
        const data = await res.json();
        if (data?.data?.status === "APPROVED") {
          router.replace("/admin/dashboard");
        }
      } catch (e) {
        // Optionally handle error
      }
    }
    checkOnboardingStatus();
  }, [router]);

  const handleComplete = () => setShowModal(true);
  const handleModalSave = (data: { organizationName: string; organizationEmail: string; membersCount: number; organizationLetter: File | null; logo: File | null }) => { 
    setShowModal(false); 
    setStatus('submitted');
    console.log("Modal data:", data);
  };
  const handleSubmit = () => {
    setStatus('reviewing');
    setTimeout(() => {
      setStatus('approved');
    }, 3000);
  };
  const handleAccessDashboard = () => {
    router.push("/admin/dashboard");
  };

  if (sessionStatus === "loading") return <p>Loading session...</p>;

  return (
    <main className="min-h-screen flex justify-center items-center px-2 bg-[var(--background)] text-[var(--foreground)] md:pt-40 md:pb-40">
      <AuthContainer>
        <h1 className="text-2xl font-bold text-gray-800 mb-1">Hi, {session?.user?.name || "there"}!</h1>
        <p className="text-gray-600 mb-4">Application Status: Track your progress</p>
        
        <div className="flex justify-center mb-4">
          <StatusBadge status={status} />
        </div>
        
        <ProgressBar progress={getProgress(status)} />
        
        <ApplicationStepper 
          status={status}
          onComplete={handleComplete} 
          onSubmit={handleSubmit}
          onAccessDashboard={handleAccessDashboard}
        />
        
        <AuthFooter question="Need help?" link="/contact" linkText="Contact Support" />
      </AuthContainer>
      <CompleteTaskModal open={showModal} onClose={() => setShowModal(false)} onSave={handleModalSave} />
    </main>
  );
}
