"use client";
import { useState, useEffect } from "react";
import { InputField } from "@/components/InputField";
import { AuthButtons } from "@/components/AuthButtons";
import { UploadedFileDisplay } from "@/components/UploadedFileDisplay";
import Image from "next/image";
import ProcessingImage from "@/app/assets/processing.png";
import ApprovedImage from "@/app/assets/approved.png";
import { FileDropzone } from "@/components/FileDropzone";
import { CompleteTaskModal } from "@/components/CompleteTaskModal";
import { SubmitButton } from "@/components/SubmitButton";
import { AuthHeading } from "@/components/AuthHeading";
import Logo from "@/components/Logo";
import { AuthFooter } from "@/components/AuthFooter";

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
  const [openStep, setOpenStep] = useState(-1);
  return (
    <div className="flex flex-col gap-5 py-2">
      {/* Step 1: Fill this form*/}
      <div>
        <button
          type="button"
          className={`flex items-center w-full py-2 text-left font-semibold ${openStep === 0 ? 'text-[var(--color-primary)]' : 'text-gray-700'}`}
          onClick={() => setOpenStep(openStep === 0 ? -1 : 0)}
        >
          <span className={`w-6 h-6 flex items-center justify-center rounded-full mr-3 text-sm font-bold ${openStep === 0 ? 'bg-[var(--color-primary)] text-white' : 'bg-gray-200 text-gray-500'}`}>1</span>
          Fill this form
          <span className="ml-auto">{openStep === 0 ? '▲' : '▼'}</span>
        </button>
        {openStep === 0 && (
          <div className="flex flex-col items-center pb-4 text-center">
            <div className="text-gray-500 text-sm mb-3 max-w-xs">Complete this task. Once your request is conditionally approved, this page will appear as 'Approved' which is number 2 — you will be able to access the page once it is approved.</div>
            <SubmitButton label="Complete my task →" isLoading={false} className="w-full" onClick={onComplete} type="button" />
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

export default function OnboardProcessingPage() {
  const [showModal, setShowModal] = useState(false);
  const [approved, setApproved] = useState(false);
  const handleComplete = () => setShowModal(true);
  const handleModalSave = () => { setShowModal(false); setApproved(true); };
  const handleProceed = () => {};
  const name = "Brian King";

  return (
    <main className="min-h-screen flex justify-center items-center px-2 bg-[var(--background)] text-[var(--foreground)] pt-40 pb-40">
      <div className="w-full max-w-[380px] mx-auto text-center space-y-6 px-4">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">Hi, {name}!</h1>
        <p className="text-[var(--color-primary)] mb-4">Application Status: Track your progress</p>
        <div className="flex justify-center my-2">
          <Image src={ProcessingImage} alt="Processing" width={200} height={200} />
        </div>
        <AccordionStepper approved={approved} onComplete={handleComplete} onProceed={handleProceed} />
        <AuthFooter question="Need help?" link="/contact" linkText="Contact Support" />
      </div>
      <CompleteTaskModal open={showModal} onClose={() => setShowModal(false)} onSave={handleModalSave} />
    </main>
  );
}
