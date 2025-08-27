"use client";
import { useState, useEffect } from "react";
import { AuthHeading } from "@/components/AuthHeading";
import { InputField } from "@/components/InputField";
import { FileDropzone } from "@/components/FileDropzone";
import { SubmitButton } from "@/components/SubmitButton";
import { UploadedFileDisplay } from "@/components/UploadedFileDisplay";

interface TemplateUploadModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: { 
    templateName: string; 
    templateFile: File | null; 
    description?: string;
  }) => void;
  isLoading?: boolean;
}

export function TemplateUploadModal({ 
  open, 
  onClose, 
  onSave, 
  isLoading = false 
}: TemplateUploadModalProps) {
  const [templateName, setTemplateName] = useState("");
  const [description, setDescription] = useState("");
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      setTemplateName("");
      setDescription("");
      setTemplateFile(null);
      setIsSubmitting(false);
    }
  }, [open]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Prevent duplicate uploads of the same file
      if (templateFile && templateFile.name === file.name && templateFile.size === file.size) {
        return;
      }
      
      setTemplateFile(file);
      // Auto-fill template name from filename if empty
      if (!templateName) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
        setTemplateName(nameWithoutExt.replace(/[-_]/g, " "));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!templateFile || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Just call the parent handler - let it handle the API call
      await onSave({
        templateName: templateName.trim(),
        templateFile,
        description: description.trim() || undefined,
      });
      // If we reach here, the upload was successful and modal should close
    } catch (error) {
      // Parent handler will show error toast, just reset submitting state
      console.error("Upload failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm lg:ml-68"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative max-w-4xl max-h-screen p-10 flex flex-col justify-center w-full">
        <div className="bg-white rounded-lg shadow-sm overflow-y-auto max-h-[80vh] w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b rounded-t border-gray-200">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Upload Email Template</h3>
            </div>
            <button
              type="button"
              className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 inline-flex justify-center items-center"
              onClick={onClose}
            >
              <svg className="w-3 h-3" aria-hidden="true" fill="none" viewBox="0 0 14 14">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/>
              </svg>
              <span className="sr-only">Close modal</span>
            </button>
          </div>

          {/* Body */}
          <div className="p-4">
            <p className="text-sm text-gray-500 mb-4">Upload a custom HTML email template for your election.</p>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-left w-full">
              <InputField 
                label="Template Name*" 
                type="text"
                value={templateName} 
                onChange={e => setTemplateName(e.target.value)} 
                placeholder="Enter template name"
                required
                maxLength={100}
              />
              <InputField 
                label="Description (Optional)" 
                type="text"
                value={description} 
                onChange={e => setDescription(e.target.value)} 
                placeholder="Brief description of when to use this template"
                maxLength={250}
              />
              <FileDropzone
                label="Email Template File*"
                description="Upload an HTML file for your email template. You can use variables like {{voterName}}, {{votingCode}}, etc."
                accept=".html,.htm,text/html"
                onChange={handleFileUpload}
                fileTypeText="HTML files only (max. 2MB)"
                id="template-upload"
              />
              {templateFile && (
                <div className="w-full">
                  <UploadedFileDisplay file={templateFile} />
                  <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-700 font-medium">Available Variables:</p>
                    <p className="text-xs text-blue-600 mt-1">
                      {`{{voterName}}, {{votingCode}}, {{electionTitle}}, {{organizationName}}, {{startDate}}, {{endDate}}, {{instructions}}`}
                    </p>
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-2 mt-6">
                <SubmitButton 
                  label="Cancel" 
                  variant="small-action" 
                  type="button" 
                  onClick={onClose} 
                />
                <SubmitButton 
                  label="Upload" 
                  variant="small" 
                  type="submit" 
                  isLoading={isLoading || isSubmitting}
                />
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
