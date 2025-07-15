"use client";

import Logo from "@/components/Logo";
import { AuthHeading } from "@/components/AuthHeading";
import { AuthFooter } from "@/components/AuthFooter";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { InputField } from "@/components/InputField";
import { SubmitButton } from "@/components/SubmitButton";
import { ErrorMessage } from "@/components/ErrorMessage";
import { AuthButtons } from "@/components/AuthButtons";
import { UploadedFileDisplay } from "@/components/UploadedFileDisplay";
import { FileDropzone } from "@/components/FileDropzone";

export default function OrganizationProfile() {
  return (
    <main className="min-h-screen flex justify-center items-center px-2 bg-[var(--background)] text-[var(--foreground)] pt-40 pb-40">
      <div className="w-full max-w-[380px] mx-auto text-center space-y-6 px-4">
        <div className="flex justify-center mb-2"><Logo /></div>
        <AuthHeading
          title="Organization Profile"
          subtitle="Tell us who represents your organization. Information should match the formal letter."
        />
        {/* Organization Profile Form (inlined) */}
        {(() => {
          const [firstName, setFirstName] = useState("");
          const [lastName, setLastName] = useState("");
          const [organizationName, setOrganizationName] = useState("");
          const [organizationEmail, setOrganizationEmail] = useState("");
          const [uploadedFile, setUploadedFile] = useState<File | null>(null);
          const [error, setError] = useState("");
          const [isLoading, setIsLoading] = useState(false);
          const router = useRouter();

          useEffect(() => {
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
            <>
              {error && <ErrorMessage message={error} />}
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
                <FileDropzone
                  label="Your organization letter"
                  description="This will be used to approve your election request on our system."
                  accept=".pdf"
                  onChange={handleFileUpload}
                  fileTypeText="PDF (max. 5MB)"
                  id="file-upload"
                />
                {/* Uploaded File Display */}
                {uploadedFile && (
                  <div className="w-full max-w-[380px]">
                    <UploadedFileDisplay file={uploadedFile} />
                  </div>
                )}
                {/* Buttons */}
                <div className="mt-6 w-full max-w-[480px]">
                  <AuthButtons
                    onCancel={handleCancel}
                    saveLabel="Save"
                    isLoading={isLoading}
                  />
                </div>
              </form>
            </>
          );
        })()}
        <AuthFooter
          question="Need help?"
          link="/contact"
          linkText="Contact Support"
        />
      </div>
    </main>
  );
}
