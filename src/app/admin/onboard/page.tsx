"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import toast, { Toaster } from 'react-hot-toast';

import { CompleteTaskModal } from "@/components/CompleteTaskModal";
import { AuthFooter } from "@/components/AuthFooter";
import AuthContainer from '@/components/AuthContainer';
import { SubmitButton } from "@/components/SubmitButton";
import CustomToast from "@/components/CustomToast";
import { useOrganizationStatus } from "@/hooks/useOrganizationStatus";

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
  hasOrganizationData,
  autoExpandAwaitingApproval = false 
}: { 
  status: ApplicationStatus; 
  onComplete: () => void; 
  hasOrganizationData: boolean;
  autoExpandAwaitingApproval?: boolean;
}) {
  const [openStep, setOpenStep] = useState(autoExpandAwaitingApproval ? 1 : 0); // Start with Complete Profile expanded for new users
  
  // Auto-expand awaiting approval step when status becomes pending
  useEffect(() => {
    if (status === 'pending' && autoExpandAwaitingApproval) {
      setOpenStep(1);
    }
  }, [status, autoExpandAwaitingApproval]);
  
  const steps = [
    {
      id: 0,
      title: "Complete Profile",
      description: "Fill out your organization details and upload required documents",
      action: hasOrganizationData ? "Edit Profile" : "Complete Profile",
      isActive: status === 'getting_started' || status === 'rejected', // Active when user needs to create/edit org
      isCompleted: hasOrganizationData && (status === 'pending' || status === 'approved'), // Only completed when org exists and submitted
      onClick: onComplete
    },
    {
      id: 1,
      title: "Awaiting Approval",
      description: "We'll review your application and notify you once approved.",
      action: "Under Review",
      isActive: status === 'pending',
      isCompleted: status === 'approved',
      onClick: null
    }
  ];

  return (
    <div className="flex flex-col gap-5 py-2">
      {steps.map((step) => (
        <div key={step.id}>
          <button
            type="button"
            className={`flex items-center w-full py-2 text-left font-semibold ${
              step.isCompleted ? 'text-green-600' :
              step.isActive ? 'text-[var(--color-primary)]' : 'text-gray-400'
            }`}
            onClick={() => step.onClick ? step.onClick() : setOpenStep(openStep === step.id ? -1 : step.id)}
            disabled={!step.isActive && !step.isCompleted}
          >
            <span className={`w-6 h-6 flex items-center justify-center rounded-full mr-3 text-sm font-bold ${
              step.isCompleted ? 'bg-green-500 text-white' :
              step.isActive ? 'bg-[var(--color-primary)] text-white' : 'bg-gray-200 text-gray-400'
            }`}>
              {step.isCompleted ? '✓' : step.id + 1}
            </span>
            {step.title}
            <span className="ml-auto">{openStep === step.id ? '▲' : '▼'}</span>
          </button>
          {openStep === step.id && (
            <div className="pl-9 pb-4">
              <div className="text-gray-500 text-sm mb-3 max-w-xs">{step.description}</div>
              {step.onClick && (step.isActive || step.isCompleted) && (
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
    existingLogoObjectKey?: string;
    existingLetterObjectKey?: string;
  } | null>(null);
  
  const [organizationId, setOrganizationId] = useState<number | null>(null);
  const [shouldExpandAwaitingApproval, setShouldExpandAwaitingApproval] = useState(false);

  // Real-time status hook (only using status for auto-redirect)
  const { 
    status: realtimeStatus
  } = useOrganizationStatus(organizationId); // This will be null initially, preventing unnecessary connections

  // Use real-time status when available, fallback to polling
  const currentStatus = realtimeStatus ? 
    (realtimeStatus.toLowerCase() as ApplicationStatus) : 
    status;

  // Note: Role-based access control is now handled by the admin layout

  // Handle real-time status changes and auto-redirect when approved
  useEffect(() => {
    console.log('🔍 Real-time status changed:', realtimeStatus, 'Organization ID:', organizationId);
    
    if (realtimeStatus === 'APPROVED') {
      console.log('🎉 Organization approved! Redirecting to dashboard...');
      toast.success('Your organization has been approved!', {
        duration: 3000,
      });
      // Small delay to show the success message
      setTimeout(() => {
        console.log('🔄 Executing redirect to dashboard...');
        router.replace("/admin/dashboard");
      }, 2000);
    }
  }, [realtimeStatus, router, organizationId]);

  // Set status and organization data based on backend data
  useEffect(() => {
    if (sessionStatus === "authenticated") {
      refreshOrganizationData();
    }
  }, [sessionStatus]);

  const getProgress = (status: ApplicationStatus) => {
    switch (status) {
      case 'getting_started': return 50;
      case 'pending': return 75;
      case 'approved': return 100;
      case 'rejected': return 0;
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
      // Check if user already has an organization (quick check)
      const userRes = await fetch('/api/users');
      const userData = await userRes.json();
      const existingOrg = userData.data?.user?.organization;
      
      // Create FormData with all organization data and files
      const orgFormData = new FormData();
      orgFormData.append('name', data.organizationName);
      orgFormData.append('email', data.organizationEmail);
      orgFormData.append('membersCount', data.membersCount.toString());
      
      // Add files if provided
      if (data.logo) {
        orgFormData.append('logo', data.logo);
      }
      if (data.organizationLetter) {
        orgFormData.append('letter', data.organizationLetter);
      }
      
      if (existingOrg?.id) {
        // Update existing organization
        console.log('Updating existing organization:', existingOrg.id);
        
        const orgRes = await fetch(`/api/organizations/${existingOrg.id}`, {
          method: 'PUT',
          body: orgFormData, // Send as FormData for consistency
        });
        
        if (!orgRes.ok) {
          const errorData = await orgRes.json();
          console.error('Failed to update organization:', errorData);
          handleValidationErrors(errorData);
          return;
        }
        
        console.log('Organization updated successfully');
      } else {
        // Create new organization
        console.log('Creating new organization');
        
        // Validate that required files are provided for new organization
        if (!data.logo || !data.organizationLetter) {
          showErrorToast('Both logo and letter files are required for new organization');
          return;
        }
        
        const orgRes = await fetch('/api/organizations', {
          method: 'POST',
          body: orgFormData,
        });
        
        if (!orgRes.ok) {
          const errorData = await orgRes.json();
          console.error('Failed to create organization:', errorData);
          handleValidationErrors(errorData);
          return;
        }
        
        console.log('Organization created successfully');
      }
      
      // Update status and refresh data
      setStatus('pending');
      setShouldExpandAwaitingApproval(true); // Auto-expand awaiting approval step
      showSuccessToast('Organization submitted for review!');
      
      // Refresh organization data to show updated files
      setTimeout(async () => {
        await refreshOrganizationData();
      }, 500);
      
    } catch (error) {
      console.error('Error saving organization:', error);
      showErrorToast('An unexpected error occurred while saving the organization');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper functions for toast notifications
  const showSuccessToast = (message: string) => {
    toast.custom((t) => <CustomToast t={t} message={message} />);
  };

  const showErrorToast = (message: string) => {
    toast.error(message, {
      duration: 5000,
      style: {
        background: '#FEE2E2',
        border: '1px solid #FECACA',
        color: '#DC2626',
      },
    });
  };

  const handleValidationErrors = (errorData: any) => {
    if (errorData.details && Array.isArray(errorData.details)) {
      // Show each validation error
      errorData.details.forEach((error: any) => {
        showErrorToast(error.message || error);
      });
    } else if (errorData.message) {
      showErrorToast(errorData.message);
    } else {
      showErrorToast('Validation failed');
    }
  };

  // Refresh organization data function
  const refreshOrganizationData = async () => {
    try {
      // Get user's organizations directly (admin gets only their org)
      const orgRes = await fetch("/api/organizations");
      const orgData = await orgRes.json();
      
      if (orgRes.ok && orgData.data?.organizations?.length > 0) {
        const org = orgData.data.organizations[0]; // Admin will only have one organization
        const orgStatus = org.status;
        
        // Store organization ID
        setOrganizationId(org.id);
        
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
          logo: null, // Files must be re-uploaded
          existingLogoObjectKey: org.logoObjectKey || '', // Object key for secure access
          existingLetterObjectKey: org.letterObjectKey || '' // Object key for secure access
        });

        console.log('Organization data received:', org);
        console.log('logoObjectKey:', org.logoObjectKey);
        console.log('letterObjectKey:', org.letterObjectKey);
      } else {
        setStatus('getting_started');
        setOrganizationData(null);
        setOrganizationId(null);
      }
    } catch (error) {
      console.error("Error fetching organization data:", error);
      setStatus('getting_started');
      setOrganizationData(null);
      setOrganizationId(null);
    }
  };

  if (sessionStatus === "loading") return <p>Loading session...</p>;

  return (
    <main className="min-h-screen flex justify-center items-center px-2 bg-[var(--background)] text-[var(--foreground)] md:pt-40 md:pb-40">
      {/*<Toaster position="top-center" />*/}
      <AuthContainer>
        <h1 className="text-2xl font-bold text-gray-800 mb-1">Hi, {session?.user?.name || "there"}!</h1>
        
        <div className="flex justify-center mb-4">
          <StatusBadge status={currentStatus} />
        </div>
        
        <ProgressBar progress={getProgress(currentStatus)} />
        
        <ApplicationStepper 
          status={currentStatus}
          onComplete={handleComplete} 
          hasOrganizationData={organizationData !== null}
          autoExpandAwaitingApproval={shouldExpandAwaitingApproval}
        />
        
        <AuthFooter question="Need help?" link="/support" linkText="Contact Support" />
      </AuthContainer>
      <CompleteTaskModal 
        open={showModal} 
        onClose={() => setShowModal(false)} 
        onSave={handleModalSave} 
        initialData={organizationData}
        isLoading={isLoading}
        organizationId={organizationId}
      />
    </main>
  );
}
