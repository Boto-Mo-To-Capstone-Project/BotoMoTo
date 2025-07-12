"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { AuthHeading } from "@/components/AuthHeading";
import { InputField } from "@/components/InputField";
import { SubmitButton } from "@/components/SubmitButton";
import { AuthFooter } from "@/components/AuthFooter";
import { ErrorMessage } from "@/components/ErrorMessage";
import { AuthButtons } from "@/components/AuthButtons";
import { UploadedFileDisplay } from "@/components/UploadedFileDisplay";
import Logo from "@/components/Logo";

export default function OrganizationProfile() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [organizationEmail, setOrganizationEmail] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Only runs on client
    setUploadedFile(new File([""], "Sample_Letter.pdf", { type: "application/pdf", lastModified: new Date().getTime() }));
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // TODO: Implement organization profile submission logic
      console.log("Submitting organization profile:", {
        firstName,
        lastName,
        organizationName,
        organizationEmail,
        uploadedFile
      });
      // For now, just simulate success
      router.push("/admin/onboard/create-org");
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.push("/admin/onboard/create-org");
  };

  return (
    <main className="min-h-screen flex justify-center items-center px-2 bg-[var(--background)] text-[var(--foreground)] pt-40 pb-40">
      <div className="w-full max-w-[380px] mx-auto text-center space-y-6 pt-10 pb-10 px-4">
        <div className="flex justify-center mb-2"><Logo /></div>
        <AuthHeading
          title="Organization Profile"
          subtitle="Tell us who represents your organization. Information should match the formal letter."
        />

        {error && <ErrorMessage message={error} />}

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="space-y-4 text-left flex flex-col items-center w-full"
        >
          <InputField
            label="First name"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Enter your first name"
            autoComplete="given-name"
          />

          <InputField
            label="Last name"
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Enter your last name"
            autoComplete="family-name"
          />

          <InputField
            label="Organization Name"
            type="text"
            value={organizationName}
            onChange={(e) => setOrganizationName(e.target.value)}
            placeholder="Enter your organization name"
            autoComplete="organization"
          />

          <InputField
            label="Organization Email Address"
            type="email"
            value={organizationEmail}
            onChange={(e) => setOrganizationEmail(e.target.value)}
            placeholder="Enter your organization email address"
            autoComplete="email"
          />

          {/* File Upload */}
          <div className="w-full max-w-[380px]">
            <label className="block text-sm font-medium text-[var(--color-black)] mb-1">
              Your organization letter
            </label>
            <p className="text-xs text-[var(--color-gray)] mb-2">
              This will be used to approve your election request on our system.
            </p>
            <div className="w-full border-2 border-dashed border-gray-300 rounded-md flex flex-col items-center justify-center py-8 text-sm text-[var(--color-gray)] hover:bg-gray-50 transition cursor-pointer">
              <div className="text-center">
                <div className="text-2xl mb-2">📄</div>
                <div>Click to upload or drag and drop</div>
                <div className="text-xs text-gray-400 mt-1">PDF (max. 5MB)</div>
              </div>
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
            </div>

            {/* Uploaded File Display */}
            {uploadedFile && (
              <UploadedFileDisplay file={uploadedFile} />
            )}
          </div>

          {/* Buttons */}
          <div className="mt-6 w-full max-w-[480px]">
            <AuthButtons
              onCancel={handleCancel}
              saveLabel="Save"
              isLoading={isLoading}
            />
          </div>
        </form>


      </div>
    </main>
  );
}
