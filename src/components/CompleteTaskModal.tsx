"use client";
import { useState, useEffect } from "react";
import { AuthHeading } from "@/components/AuthHeading";
import { InputField } from "@/components/InputField";
import { FileDropzone } from "@/components/FileDropzone";
import { SubmitButton } from "@/components/SubmitButton";
import { UploadedFileDisplay } from "@/components/UploadedFileDisplay";

interface CompleteTaskModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: { firstName: string; lastName: string; organizationName: string; organizationEmail: string; organizationLetter: File | null; logo: File | null }) => void;
}

export function CompleteTaskModal({ open, onClose, onSave }: CompleteTaskModalProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [organizationEmail, setOrganizationEmail] = useState("");
  const [organizationLetter, setOrganizationLetter] = useState<File | null>(null);
  // Add sample letter state
  const [sampleLetter, setSampleLetter] = useState<File | null>(null);
  const [logo, setLogo] = useState<File | null>(null);

  useEffect(() => {
    // Create a dummy File object for the sample letter (as in create-org)
    setSampleLetter(new File([""], "Sample_Letter.pdf", { type: "application/pdf", lastModified: new Date().getTime() }));
  }, []);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogo(file);
    }
  };

  const handleLetterUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setOrganizationLetter(file);
    }
  };

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-[380px] relative px-4 pt-8 pb-8 mx-auto text-center space-y-6 border border-gray-200 overflow-y-auto max-h-screen">
        <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-700" onClick={onClose}>&times;</button>
        <AuthHeading title="Complete your task" subtitle="Fill in the details below to proceed." />
        <form
          onSubmit={e => {
            e.preventDefault();
            onSave({ firstName, lastName, organizationName, organizationEmail, organizationLetter, logo });
          }}
          className="flex flex-col gap-4 text-left w-full"
        >
          <InputField 
            label="First name" 
            type="text"
            value={firstName} 
            onChange={e => setFirstName(e.target.value)} 
            placeholder="Enter your first name"
            autoComplete="given-name"
          />
          <InputField 
            label="Last name" 
            type="text"
            value={lastName} 
            onChange={e => setLastName(e.target.value)} 
            placeholder="Enter your last name"
            autoComplete="family-name"
          />
          <InputField 
            label="Organization Name" 
            type="text"
            value={organizationName} 
            onChange={e => setOrganizationName(e.target.value)} 
            placeholder="Enter your organization name"
            autoComplete="organization"
          />
          <InputField 
            label="Organization Email Address" 
            type="email"
            value={organizationEmail} 
            onChange={e => setOrganizationEmail(e.target.value)} 
            placeholder="Enter your organization email address"
            autoComplete="email"
          />
          {/* Logo upload first */}
          <FileDropzone
            label="Organization Logo"
            description="Upload your organization logo (image file)."
            accept="image/*"
            onChange={handleLogoUpload}
            fileTypeText="Image (max. 5MB)"
            id="logo-upload"
          />
          {logo && (
            <div className="w-full max-w-[380px]">
              <UploadedFileDisplay file={logo} />
            </div>
          )}
          {/* Letter upload second */}
          <FileDropzone
            label="Your organization letter"
            description="This will be used to approve your election request on our system."
            accept=".pdf"
            onChange={handleLetterUpload}
            fileTypeText="PDF (max. 5MB)"
            id="file-upload"
          />
          {/* Uploaded File Display: show uploaded letter or sample letter if none uploaded */}
          {(organizationLetter || sampleLetter) && (
            <div className="w-full max-w-[380px]">
              <UploadedFileDisplay file={organizationLetter || sampleLetter!} />
            </div>
          )}
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