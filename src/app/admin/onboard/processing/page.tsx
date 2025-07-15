"use client";
import { useState, useEffect } from "react";
import { InputField } from "@/components/InputField";
import { AuthButtons } from "@/components/AuthButtons";
import { UploadedFileDisplay } from "@/components/UploadedFileDisplay";
import Image from "next/image";
import ProcessingImage from "@/app/assets/processing.png";
import ApprovedImage from "@/app/assets/approved.png";
import Logo from "@/components/Logo";
import { SubmitButton } from "@/components/SubmitButton";
import { AuthHeading } from "@/components/AuthHeading";

function StatusTabs({ status, setStatus }: { status: string; setStatus: (s: string) => void }) {
  return (
    <div className="flex gap-2 mb-6">
      <button
        className={`px-4 py-1 rounded-full border border-gray-300 font-semibold transition-colors ${status === "processing" ? "text-red-700 bg-red-50 border-red-700" : "text-gray-500 bg-gray-50"}`}
        onClick={() => setStatus("processing")}
      >
        Processing
      </button>
      <button
        className={`px-4 py-1 rounded-full border border-gray-300 font-semibold transition-colors ${status === "approved" ? "text-red-700 bg-red-50 border-red-700" : "text-gray-500 bg-gray-50"}`}
        onClick={() => setStatus("approved")}
      >
        Approved
      </button>
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status === "approved") {
    return <span className="text-5xl mb-2" role="img" aria-label="approved">✅</span>;
  }
  if (status === "declined") {
    return <span className="text-5xl mb-2" role="img" aria-label="declined">❌</span>;
  }
  // processing or default
  return <span className="text-5xl mb-2" role="img" aria-label="processing">⏳</span>;
}

function AccordionStepper({ approved, onComplete, onProceed }: { approved: boolean; onComplete: () => void; onProceed: () => void; }) {
  const [openStep, setOpenStep] = useState(0);
  return (
    <div className="flex flex-col gap-2">
      {/* Step 1: Under review */}
      <div>
        <button
          type="button"
          className={`flex items-center w-full py-2 text-left font-semibold ${openStep === 0 ? 'text-[var(--color-primary)]' : 'text-gray-700'}`}
          onClick={() => setOpenStep(openStep === 0 ? -1 : 0)}
        >
          <span className={`w-6 h-6 flex items-center justify-center rounded-full mr-3 text-sm font-bold ${openStep === 0 ? 'bg-[var(--color-primary)] text-white' : 'bg-gray-200 text-gray-500'}`}>1</span>
          Under review
          <span className="ml-auto">{openStep === 0 ? '▲' : '▼'}</span>
        </button>
        {openStep === 0 && (
          <div className="pl-9 pb-4">
            <div className="text-gray-500 text-sm mb-3">Our team is reviewing your documents. Once your loan is conditionally approved, our team will contact you for next steps.</div>
            <button
              type="button"
              className="w-full max-w-[380px] h-[44px] bg-[var(--color-primary)] hover:brightness-90 text-white rounded-md text-sm font-semibold"
              onClick={onComplete}
            >
              Complete my task <span aria-hidden>→</span>
            </button>
          </div>
        )}
      </div>
      {/* Step 2: Initial approval */}
      <div>
        <button
          type="button"
          className={`flex items-center w-full py-2 text-left font-semibold ${approved ? (openStep === 1 ? 'text-[var(--color-primary)]' : 'text-gray-700') : 'text-gray-400'}`}
          onClick={() => approved ? setOpenStep(openStep === 1 ? -1 : 1) : null}
          disabled={!approved}
        >
          <span className={`w-6 h-6 flex items-center justify-center rounded-full mr-3 text-sm font-bold ${approved ? (openStep === 1 ? 'bg-[var(--color-primary)] text-white' : 'bg-gray-200 text-gray-500') : 'bg-gray-200 text-gray-400'}`}>2</span>
          Initial approval
          <span className="ml-auto">{openStep === 1 ? '▲' : '▼'}</span>
        </button>
        {openStep === 1 && (
          <div className="pl-9 pb-4">
            {approved ? (
              <button
                type="button"
                className="inline-flex items-center gap-2 px-5 h-[38px] bg-[var(--color-primary)] hover:brightness-90 text-white rounded-full text-sm font-semibold shadow-sm transition-all"
                onClick={onProceed}
              >
                Proceed to homepage
              </button>
            ) : (
              <span className="text-xl align-middle">⏳</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Modal({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (data: any) => void }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [orgEmail, setOrgEmail] = useState("");
  const [logo, setLogo] = useState<File | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogo(file);
    }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md relative">
        <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-700" onClick={onClose}>&times;</button>
        <AuthHeading title="Complete your task" subtitle="Fill in the details below to proceed." />
        <form
          onSubmit={e => {
            e.preventDefault();
            onSave({ firstName, lastName, orgEmail, logo });
          }}
          className="flex flex-col gap-3"
        >
          <InputField label="First Name" value={firstName} onChange={e => setFirstName(e.target.value)} />
          <InputField label="Last Name" value={lastName} onChange={e => setLastName(e.target.value)} />
          <InputField label="Organization Email" value={orgEmail} onChange={e => setOrgEmail(e.target.value)} type="email" />
          <div className="w-full max-w-[380px]">
            <label className="block text-sm font-medium text-[var(--color-black)] mb-1">
              Organization Logo
            </label>
            <p className="text-xs text-[var(--color-gray)] mb-2">
              Upload your organization logo (image file).
            </p>
            <div className="w-full border-2 border-dashed border-gray-300 rounded-md flex flex-col items-center justify-center py-8 text-sm text-[var(--color-gray)] hover:bg-gray-50 transition cursor-pointer">
              <div className="text-center">
                <Logo />
                <div>Click to upload or drag and drop</div>
                <div className="text-xs text-gray-400 mt-1">Image (max. 5MB)</div>
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                id="logo-upload"
              />
            </div>
            {logo && (
              <span className="text-xs mt-2 block">{logo.name}</span>
            )}
          </div>
          <SubmitButton
            label="Save"
            isLoading={false}
            className="w-full"
          />
        </form>
      </div>
    </div>
  );
}

export default function OnboardProcessingPage() {
  const [showModal, setShowModal] = useState(false);
  const [approved, setApproved] = useState(false);
  const handleComplete = () => setShowModal(true);
  const handleModalSave = () => { setShowModal(false); setApproved(true); };
  const handleProceed = () => {};

  return (
    <div className="flex min-h-screen bg-gray-50 items-center justify-center">
      <main className="flex flex-col items-center justify-center px-4 py-10 md:py-20 w-full">
        <div className="w-full max-w-sm bg-white rounded-xl shadow p-6">
          <AuthHeading title={<span className="text-[var(--color-primary)]">Application Status</span>} subtitle="Track your onboarding progress." />
          <AccordionStepper approved={approved} onComplete={handleComplete} onProceed={handleProceed} />
        </div>
        <Modal open={showModal} onClose={() => setShowModal(false)} onSave={handleModalSave} />
      </main>
    </div>
  );
}
