"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";


import { CompleteTaskModal } from "@/components/CompleteTaskModal";
import { AuthFooter } from "@/components/AuthFooter";
import AuthContainer from '@/components/AuthContainer';
import { SubmitButton } from "@/components/SubmitButton";

type ApplicationStatus = 'getting_started' | 'pending' | 'approved' | 'rejected';

function StatusBadge({ status }: { status: ApplicationStatus }) {
  const config = {
    getting_started: { text: 'Getting Started', bg: 'bg-gray-100', textColor: 'text-gray-800' },
    pending: { text: 'Under Review', bg: 'bg-yellow-100', textColor: 'text-yellow-800' },
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
      isCompleted: ['pending', 'approved'].includes(status),
      onClick: onComplete
    },
    {
      id: 1,
      title: "Submit for Review",
      description: "Submit your completed profile for admin review",
      action: "Submit for Review",
      isActive: status === 'getting_started', // Allow submission when getting started and profile is complete
      isCompleted: ['pending', 'approved'].includes(status),
      onClick: onSubmit
    },
    {
      id: 2,
      title: "Awaiting Approval",
      description: "Your application is being reviewed by our team",
      action: "Under Review",
      isActive: status === 'pending',
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
  const [isLoading, setIsLoading] = useState(false);
  const [organizationData, setOrganizationData] = useState<{
    organizationName: string;
    organizationEmail: string;
    membersCount: number;
    organizationLetter: File | null;
    logo: File | null;
  } | null>(null);

  // Redirect to login if no session
  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      router.replace("/auth/login");
      return;
    }
  }, [sessionStatus, router]);

  // Set status and organization data based on backend data
  useEffect(() => {
    async function fetchOrganizationData() {
      try {
        const res = await fetch("/api/users");
        const data = await res.json();
        
        if (data?.data?.user?.organization) {
          const orgBasic = data.data.user.organization;
          const orgId = orgBasic.id;
          
          // Fetch full organization details
          const orgRes = await fetch(`/api/organizations/${orgId}`);
          const orgData = await orgRes.json();
          
          if (orgRes.ok && orgData.data) {
            const org = orgData.data;
            const orgStatus = org.status;
            
            // Set status based on organization status
            switch (orgStatus) {
              case 'APPROVED':
                setStatus('approved');
                break;
              case 'PENDING':
                setStatus('pending');
                break;
              case 'REJECTED':
                setStatus('rejected');
                break;
              default:
                setStatus('getting_started');
            }

            // Set organization data for the modal
            setOrganizationData({
              organizationName: org.name || '',
              organizationEmail: org.email || '',
              membersCount: org.membersCount || 0,
              organizationLetter: null, // Files must be re-uploaded
              logo: null // Files must be re-uploaded
            });
          } else {
            setStatus('getting_started');
            setOrganizationData(null);
          }
        } else {
          setStatus('getting_started');
          setOrganizationData(null);
        }
      } catch (error) {
        console.error("Error fetching organization data:", error);
        setStatus('getting_started');
        setOrganizationData(null);
      }
    }

    if (sessionStatus === "authenticated") {
      fetchOrganizationData();
    }
  }, [sessionStatus]);

  const getProgress = (status: ApplicationStatus) => {
    switch (status) {
      case 'getting_started': return 25;
      case 'pending': return 75;
      case 'approved': return 100;
      case 'rejected': return 25;
      default: return 0;
    }
  };
  
  useEffect(() => {
    async function checkOnboardingStatus() {
      try {
        // Check current user's organization status via user endpoint
        const res = await fetch("/api/users");
        const data = await res.json();
        if (data?.data?.user?.organization?.status === "APPROVED") {
          router.replace("/admin/dashboard");
        }
      } catch (e) {
        // Optionally handle error
        console.error("Error checking onboarding status:", e);
      }
    }
    
    if (sessionStatus === "authenticated") {
      checkOnboardingStatus();
    }
  }, [router, sessionStatus]);

  const handleComplete = () => {
    setShowModal(true);
  };

  const handleModalSave = async (data: { 
    organizationName: string; 
    organizationEmail: string; 
    membersCount: number; 
    organizationLetter: File | null; 
    logo: File | null 
  }) => { 
    setIsLoading(true);
    setShowModal(false);
    
    try {
      // Check if user already has an organization
      const userRes = await fetch('/api/users');
      const userData = await userRes.json();
      const existingOrg = userData.data?.user?.organization;
      
      // Prepare organization data
      const orgPayload = {
        name: data.organizationName,
        email: data.organizationEmail,
        membersCount: data.membersCount,
        photoUrl: '', // Handle file uploads separately
        letterUrl: '', // Handle file uploads separately
      };
      
      let organizationId = existingOrg?.id;
      let orgRes;
      
      if (existingOrg) {
        // Update existing organization
        orgRes = await fetch(`/api/organizations/${organizationId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(orgPayload),
        });
      } else {
        // Create new organization
        orgRes = await fetch('/api/organizations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(orgPayload),
        });
        
        if (orgRes.ok) {
          const orgData = await orgRes.json();
          organizationId = orgData.data?.id;
        }
      }
      
      if (!orgRes.ok) {
        console.error('Failed to save organization');
        return;
      }
      
      // Upload files if provided and we have an organization ID
      if (organizationId) {
        // Upload logo if provided
        if (data.logo) {
          const logoFormData = new FormData();
          logoFormData.append('file', data.logo);
          
          await fetch(`/api/organizations/${organizationId}/upload-logo`, {
            method: 'POST',
            body: logoFormData,
          });
        }
        
        // Upload letter if provided
        if (data.organizationLetter) {
          const letterFormData = new FormData();
          letterFormData.append('file', data.organizationLetter);
          
          await fetch(`/api/organizations/${organizationId}/upload-letter`, {
            method: 'POST',
            body: letterFormData,
          });
        }
      }
      
      // Update status and refresh data
      setStatus('pending');
      
      // Refresh the page to get updated data
      window.location.reload();
      
    } catch (error) {
      console.error('Error saving organization:', error);
    } finally {
      setIsLoading(false);
    }
  };
  const handleSubmit = () => {
    // For now, just refresh the page to get updated status from backend
    // In a real app, you might want to call an API to trigger the submission
    window.location.reload();
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
      <CompleteTaskModal 
        open={showModal} 
        onClose={() => setShowModal(false)} 
        onSave={handleModalSave} 
        initialData={organizationData}
        isLoading={isLoading}
      />
    </main>
  );
}
