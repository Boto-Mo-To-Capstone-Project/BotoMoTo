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
  onSave: (data: { organizationName: string; organizationEmail: string; membersCount: number; organizationLetter: File | null; logo: File | null }) => void;
  initialData?: {
    organizationName: string;
    organizationEmail: string;
    membersCount: number;
    organizationLetter: File | null;
    logo: File | null;
    existingLogoUrl?: string;
    existingLetterUrl?: string;
  } | null;
  isLoading?: boolean;
  organizationId?: number | null;
}

export function CompleteTaskModal({ open, onClose, onSave, initialData, isLoading = false, organizationId }: CompleteTaskModalProps) {
  const [organizationName, setOrganizationName] = useState("");
  const [organizationEmail, setOrganizationEmail] = useState("");
  const [membersCount, setMembersCount] = useState("");
  const [organizationLetter, setOrganizationLetter] = useState<File | null>(null);
  // Add sample letter state
  const [sampleLetter, setSampleLetter] = useState<File | null>(null);
  const [logo, setLogo] = useState<File | null>(null);
  // Add states for existing file URLs
  const [existingLogoUrl, setExistingLogoUrl] = useState<string>("");
  const [existingLetterUrl, setExistingLetterUrl] = useState<string>("");

  // Populate form with initial data when modal opens
  useEffect(() => {
    if (open && initialData) {
      console.log('Modal opened with initial data:', initialData);
      setOrganizationName(initialData.organizationName);
      setOrganizationEmail(initialData.organizationEmail);
      setMembersCount(initialData.membersCount.toString());
      setOrganizationLetter(initialData.organizationLetter);
      setLogo(initialData.logo);
      setExistingLogoUrl(initialData.existingLogoUrl || '');
      setExistingLetterUrl(initialData.existingLetterUrl || '');
      console.log('Existing logo URL:', initialData.existingLogoUrl);
      console.log('Existing letter URL:', initialData.existingLetterUrl);
    } else if (open && !initialData) {
      console.log('Modal opened without initial data');
      // Reset form when opening without initial data
      setOrganizationName("");
      setOrganizationEmail("");
      setMembersCount("");
      setOrganizationLetter(null);
      setLogo(null);
      setExistingLogoUrl('');
      setExistingLetterUrl('');
    }
  }, [open, initialData]);

  useEffect(() => {
    // Create a dummy File object for the sample letter (as in create-org)
    setSampleLetter(new File([""], "Sample_Letter.pdf", { type: "application/pdf", lastModified: new Date().getTime() }));
  }, []);

  // Helper function to create a File object from URL for display purposes
  const createFileFromUrl = (url: string, filename: string, type: string): File => {
    return new File([""], filename, { type, lastModified: new Date().getTime() });
  };

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
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-[95vw] sm:max-w-md md:max-w-lg lg:max-w-xl relative px-4 sm:px-6 pt-8 pb-8 mx-2 sm:mx-4 text-center space-y-6 border border-gray-200 overflow-y-auto max-h-[90vh] overflow-x-hidden break-words">
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-700"
          onClick={onClose}
        >
          &times;
        </button>
        <AuthHeading title="Complete your task" subtitle="Fill in the details below to proceed." />
        <form
          onSubmit={e => {
            e.preventDefault();
            onSave({ organizationName, organizationEmail, membersCount: Number(membersCount), organizationLetter, logo });
          }}
          className="flex flex-col gap-4 text-left w-full"
        >
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
          <InputField
            label="Members Count"
            type="text"
            value={membersCount}
            onChange={e => {
              // Only allow numbers
              const value = e.target.value;
              if (/^\d*$/.test(value)) {
                setMembersCount(value);
              }
            }}
            onPaste={e => {
              const paste = e.clipboardData.getData('text');
              if (!/^\d+$/.test(paste)) {
                e.preventDefault();
              }
            }}
            placeholder="Enter number of members"
            inputMode="numeric"
            pattern="[0-9]*"
            required
            minLength={1}
          />
          {/* Logo upload first */}
          <FileDropzone
            label="Organization Logo"
            description="Upload your organization logo (PNG, JPG, JPEG, GIF, WebP)."
            accept="image/png,image/jpg,image/jpeg,image/gif,image/webp,image/*"
            onChange={handleLogoUpload}
            fileTypeText="PNG, JPG, JPEG, GIF, WebP (max. 5MB)"
            id="logo-upload"
          />
          {/* Logo display - show new upload or existing logo */}
          {logo && (
            <div className="w-full max-w-[380px]">
              <UploadedFileDisplay file={logo} />
            </div>
          )}
          {!logo && existingLogoUrl && (
            <div className="w-full max-w-[380px]">
              <UploadedFileDisplay 
                file={createFileFromUrl(existingLogoUrl, "Current_Logo.png", "image/png")} 
                isExistingFile={true}
                fileUrl={existingLogoUrl}
                organizationId={organizationId || undefined}
                fileType="logo"
              />
              <p className="text-sm text-gray-500 mt-1">Current logo (upload a new one to replace)</p>
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
          {/* Letter display - show new upload, existing letter, or sample letter */}
          {organizationLetter && (
            <div className="w-full max-w-[380px]">
              <UploadedFileDisplay file={organizationLetter} />
            </div>
          )}
          {!organizationLetter && existingLetterUrl && (
            <div className="w-full max-w-[380px]">
              <UploadedFileDisplay 
                file={createFileFromUrl(existingLetterUrl, "Current_Letter.pdf", "application/pdf")} 
                isExistingFile={true}
                fileUrl={existingLetterUrl}
                organizationId={organizationId || undefined}
                fileType="letter"
              />
              <p className="text-sm text-gray-500 mt-1">Current letter (upload a new one to replace)</p>
            </div>
          )}
          {!organizationLetter && !existingLetterUrl && sampleLetter && (
            <div className="w-full max-w-[380px]">
              <UploadedFileDisplay file={sampleLetter} />
            </div>
          )}
          <div className="flex justify-end gap-2 mt-2">
            <SubmitButton label="Cancel" variant="small-action" type="button" onClick={onClose} />
            <SubmitButton label="Save" variant="small" type="submit" isLoading={isLoading} />
          </div>
        </form>
      </div>
    </div>
  );
}