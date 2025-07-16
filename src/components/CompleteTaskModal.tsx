"use client";
import { useState } from "react";
import { AuthHeading } from "@/components/AuthHeading";
import { InputField } from "@/components/InputField";
import { FileDropzone } from "@/components/FileDropzone";
import { SubmitButton } from "@/components/SubmitButton";

interface CompleteTaskModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: { firstName: string; lastName: string; orgEmail: string; logo: File | null }) => void;
}

export function CompleteTaskModal({ open, onClose, onSave }: CompleteTaskModalProps) {
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
      <div className="bg-white rounded-xl shadow-lg w-full max-w-[380px] relative px-4 pt-8 pb-8 mx-auto text-center space-y-6">
        <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-700" onClick={onClose}>&times;</button>
        <AuthHeading title="Complete your task" subtitle="Fill in the details below to proceed." />
        <form
          onSubmit={e => {
            e.preventDefault();
            onSave({ firstName, lastName, orgEmail, logo });
          }}
          className="flex flex-col gap-4 text-left w-full"
        >
          <InputField label="First Name" value={firstName} onChange={e => setFirstName(e.target.value)} />
          <InputField label="Last Name" value={lastName} onChange={e => setLastName(e.target.value)} />
          <InputField label="Organization Email" value={orgEmail} onChange={e => setOrgEmail(e.target.value)} type="email" />
          <FileDropzone
            label="Organization Logo"
            description="Upload your organization logo (image file)."
            accept="image/*"
            onChange={handleFileUpload}
            fileTypeText="Image (max. 5MB)"
            id="logo-upload"
          />
          {logo && (
            <span className="text-xs mt-2 block">{logo.name}</span>
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