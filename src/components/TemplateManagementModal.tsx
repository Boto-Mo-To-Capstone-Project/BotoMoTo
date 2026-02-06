"use client";
import { useState, useEffect } from "react";
import { FiTrash2, FiEye, FiDownload } from "react-icons/fi";
import { SubmitButton } from "@/components/SubmitButton";
import toast from "react-hot-toast";

interface Template {
  id: string;
  name: string;
  description?: string;
  type: 'system' | 'custom';
  createdAt?: string;
  fileUrl?: string;
}

interface TemplateManagementModalProps {
  open: boolean;
  onClose: () => void;
  onDeleteTemplate: (templateId: string) => void;
  onPreviewTemplate: (templateId: string) => void;
  isLoading?: boolean;
}

export function TemplateManagementModal({ 
  open, 
  onClose, 
  onDeleteTemplate,
  onPreviewTemplate,
  isLoading = false 
}: TemplateManagementModalProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch templates when modal opens
  useEffect(() => {
    if (open) {
      fetchTemplates();
    }
  }, [open]);

  const fetchTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const response = await fetch("/api/email/templates");
      const data = await response.json();
      if (data.success) {
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error("Failed to fetch templates:", error);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm("Are you sure you want to delete this template? This action cannot be undone.")) {
      return;
    }
    
    setDeletingId(templateId);
    try {
      // Call the parent handler to handle the deletion
      await onDeleteTemplate(templateId);
      // Refresh templates list after successful deletion
      await fetchTemplates();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete template');
    } finally {
      setDeletingId(null);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex justify-center items-center bg-black/30 backdrop-blur-sm lg:ml-68"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative max-w-5xl max-h-screen p-10 flex flex-col justify-center w-full">
        <div className="bg-white rounded-lg shadow-sm overflow-y-auto max-h-[80vh] w-full">
          {/* Modal header */}
          <div className="flex items-center justify-between p-4 border-b rounded-t border-gray-200">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Manage Email Templates</h3>
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

          {/* Modal body */}
          <div className="p-4">
            <p className="text-sm text-gray-500 mb-4">
              View and manage your email templates. System templates cannot be deleted.
            </p>
            {loadingTemplates ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                <span className="ml-2 text-gray-600">Loading templates...</span>
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No templates found.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900">{template.name}</h4>
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            template.type === 'system'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {template.type === 'system' ? 'System' : 'Custom'}
                        </span>
                      </div>
                      {template.description && (
                        <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                      )}
                      {template.createdAt && (
                        <p className="text-xs text-gray-500 mt-1">
                          Created: {new Date(template.createdAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Preview button */}
                      <button
                        onClick={() => onPreviewTemplate(template.id)}
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg"
                        title="Preview template"
                      >
                        <FiEye size={16} />
                      </button>

                      {/* Download button (for custom templates) */}
                      {template.type === 'custom' && template.fileUrl && (
                        <a
                          href={template.fileUrl}
                          download
                          className="p-2 text-green-600 hover:bg-green-100 rounded-lg"
                          title="Download template"
                        >
                          <FiDownload size={16} />
                        </a>
                      )}

                      {/* Delete button (only for custom templates) */}
                      {template.type === 'custom' && (
                        <button
                          onClick={() => handleDelete(template.id)}
                          disabled={deletingId === template.id}
                          className="p-2 text-red-600 hover:bg-red-100 rounded-lg disabled:opacity-50"
                          title="Delete template"
                        >
                          {deletingId === template.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                          ) : (
                            <FiTrash2 size={16} />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2 mt-6">
              <SubmitButton 
                label="Close" 
                variant="small" 
                type="button" 
                onClick={onClose} 
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
