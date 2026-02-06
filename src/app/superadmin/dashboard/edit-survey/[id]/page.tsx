"use client";

import ConfirmationModal from "@/components/ConfirmationModal";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import SurveyBuilder from "@/components/survey/SurveyBuilder";
import SurveyPreview from "@/components/survey/SurveyPreview";
import type { FormSchema } from "@/types/survey";

export default function SuperAdminEditSurveyPage() {
  const params = useParams();
  const router = useRouter();
  const surveyId = params.id as string;
  
  const [previewOpen, setPreviewOpen] = useState(false);
  const [lastSchema, setLastSchema] = useState<FormSchema | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [initialSchema, setInitialSchema] = useState<FormSchema | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingSchema, setPendingSchema] = useState<FormSchema | null>(null);

  // Load the existing survey data
  useEffect(() => {
    const loadSurvey = async () => {
      try {
        const res = await fetch(`/api/superadmin/surveys/${surveyId}`, { method: "GET" });
        if (!res.ok) {
          if (res.status === 404) {
            toast.error("Survey not found");
            router.push("/superadmin/dashboard/survey");
            return;
          }
          throw new Error(`Failed to fetch survey (${res.status})`);
        }
        const json = await res.json();
        const survey = json?.data?.survey;
        if (survey && survey.formSchema) {
          setInitialSchema(survey.formSchema);
        } else {
          toast.error("Invalid survey data");
          router.push("/superadmin/dashboard/survey");
        }
      } catch (err: any) {
        console.error(err);
        toast.error(err?.message || "Unable to load survey");
        router.push("/superadmin/dashboard/survey");
      } finally {
        setLoading(false);
      }
    };
    
    if (surveyId) {
      loadSurvey();
    }
  }, [surveyId, router]);

  const saveDraft = async (schema: FormSchema) => {
    if (saving) return; // prevent double clicks
    setSaving(true);
    try {
      const payload = {
        title: schema.title,
        description: schema.description ?? "",
        formSchema: schema,
        isActive: false,
      };

      const res = await fetch(`/api/superadmin/surveys/${surveyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to save draft");

      setLastSchema(schema);
      toast.success("Draft updated");
    } catch (err: any) {
      toast.error(err?.message || "Failed to save draft");
    } finally {
      setSaving(false);
    }
  };

  const preview = (schema: FormSchema) => {
    setLastSchema(schema);
    setPreviewOpen(true);
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse sm:px-20 py-10">
        {/* Toolbar Skeleton */}
        <div className="shadow-sm bg-gray-200 flex justify-between px-4 py-4 flex-wrap gap-2 rounded-lg">
          {/* Left side (dropdown + add) */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="h-5 w-28 bg-gray-300 rounded"></div>
            <div className="h-10 w-40 bg-gray-300 rounded"></div>
            <div className="h-10 w-10 bg-gray-300 rounded"></div>
          </div>

          {/* Right side (buttons) */}
          <div className="flex gap-2">
            <div className="h-10 w-10 bg-gray-300 rounded"></div>
            <div className="h-10 w-10 bg-gray-300 rounded"></div>
            <div className="h-10 w-10 bg-gray-300 rounded"></div>
            <div className="h-10 w-16 bg-gray-300 rounded"></div>
          </div>
        </div>

        {/* Survey meta skeleton */}
        <div className="bg-gray-100 shadow-sm rounded-lg p-4 space-y-2">
          <div className="h-10 bg-gray-300 rounded"></div>
          <div className="h-16 bg-gray-300 rounded"></div>
        </div>

        {/* Questions Skeleton */}
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="shadow-sm rounded-lg bg-gray-100 p-4 space-y-3">
              {/* Header */}
              <div className="flex justify-between items-center">
                <div className="h-6 w-24 bg-gray-300 rounded-full"></div>
                <div className="flex gap-2">
                  <div className="h-8 w-20 bg-gray-300 rounded"></div>
                  <div className="h-8 w-20 bg-gray-300 rounded"></div>
                </div>
              </div>

              {/* Question input */}
              <div className="h-10 bg-gray-300 rounded"></div>
              <div className="h-8 bg-gray-300 rounded"></div>

              {/* Options */}
              <div className="space-y-2">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="flex items-center gap-2">
                    <div className="h-4 w-4 bg-gray-300 rounded-full"></div>
                    <div className="flex-1 h-8 bg-gray-300 rounded"></div>
                    <div className="h-8 w-20 bg-gray-300 rounded"></div>
                  </div>
                ))}
                <div className="h-8 w-32 bg-gray-300 rounded mt-2"></div>
              </div>

              {/* Required toggle */}
              <div className="flex items-center gap-2 mt-3">
                <div className="h-5 w-24 bg-gray-300 rounded"></div>
                <div className="h-5 w-5 bg-gray-300 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!initialSchema) {
    return (
      <div className="app h-full flex flex-col min-h-[calc-100vh-4rem] bg-gray-50">
        <div className="flex-1 bg-white w-full min-w-0 pt-0 md:pt-0 p-4 md:p-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg text-red-600">Survey not found</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/*<Toaster position="top-center" />*/}

      <div className="min-h-screen px-5 sm:px-20 py-10 bg-red-100">
        <SurveyBuilder 
          initial={initialSchema} 
          onSave={(schema) => {
            setPendingSchema(schema);
            setConfirmOpen(true);
          }} 
          onPreview={preview} 
        />
      </div>

      {previewOpen && lastSchema && (
        <SurveyPreview 
          schema={lastSchema} 
          open={previewOpen} 
          onClose={() => setPreviewOpen(false)} 
        />
      )}
      {confirmOpen && (
        <ConfirmationModal
          open={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          title="Confirm Changes"
          description="Are you sure you want to save the changes to this survey?"
          confirmLabel="Save Changes"
          cancelLabel="Cancel"
          variant="edit"
          onConfirm={async () => {
            if (pendingSchema) {
              await saveDraft(pendingSchema);
            }
          }}
        />
      )}
    </>
  );
}
