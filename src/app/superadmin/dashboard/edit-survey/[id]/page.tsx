"use client";

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
      <div className="app h-full flex flex-col min-h-[calc-100vh-4rem] bg-gray-50">
        <div className="flex-1 bg-white w-full min-w-0 pt-0 md:pt-0 p-4 md:p-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg text-gray-600">Loading survey...</div>
          </div>
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
      <div className="app h-full flex flex-col min-h-[calc-100vh-4rem] bg-gray-50">
        <div className="flex-1 bg-white w-full min-w-0 pt-0 md:pt-0 p-4 md:p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Edit Survey</h1>
            <p className="text-gray-600 mt-1">Modify your survey settings and questions</p>
          </div>
          <SurveyBuilder 
            initial={initialSchema} 
            onSave={saveDraft} 
            onPreview={preview} 
          />
        </div>
      </div>

      {previewOpen && lastSchema && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm lg:ml-68"
          onClick={e => {
            if (e.target === e.currentTarget) setPreviewOpen(false);
          }}
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-[95vw] sm:max-w-md md:max-w-lg lg:max-w-3xl relative px-4 sm:px-6 pt-8 pb-8 mx-2 sm:mx-4 text-left space-y-6 border border-gray-200 overflow-y-auto max-h-[90vh] overflow-x-hidden">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-700"
              onClick={() => setPreviewOpen(false)}
            >
              &times;
            </button>
            <div className="px-1">
              <h3 className="text-lg font-semibold mb-2">Survey Preview</h3>
              <SurveyPreview schema={lastSchema} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
