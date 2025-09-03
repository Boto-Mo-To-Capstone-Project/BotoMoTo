"use client";

import { useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import SurveyBuilder from "@/components/survey/SurveyBuilder";
import SurveyPreview from "@/components/survey/SurveyPreview";
import type { FormSchema } from "@/types/survey";

export default function SuperAdminCreateSurveyPage() {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [lastSchema, setLastSchema] = useState<FormSchema | null>(null);
  // Track created survey id to prevent creating duplicates on subsequent saves
  const [surveyId, setSurveyId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

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

      const res = await fetch(
        surveyId ? `/api/superadmin/surveys/${surveyId}` : "/api/superadmin/surveys",
        {
          method: surveyId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to save draft");

      // Capture id on first create; keep using it for updates
      const idFromResponse = data?.data?.survey?.id;
      if (idFromResponse && !surveyId) setSurveyId(idFromResponse);

      setLastSchema(schema);
      toast.success(surveyId ? "Draft updated" : "Draft saved");
    } catch (err: any) {
      toast.error(err?.message || "Failed to save draft");
    } finally {
      setSaving(false);
    }
  };

  const publish = async (schema: FormSchema) => {
    if (saving) return; // prevent double clicks
    setSaving(true);
    try {
      const payload = {
        title: schema.title,
        description: schema.description ?? "",
        formSchema: schema,
        isActive: true,
      };

      const res = await fetch(
        surveyId ? `/api/superadmin/surveys/${surveyId}` : "/api/superadmin/surveys",
        {
          method: surveyId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to publish");

      const idFromResponse = data?.data?.survey?.id;
      if (idFromResponse && !surveyId) setSurveyId(idFromResponse);

      setLastSchema(schema);
      toast.success("Survey published");
    } catch (err: any) {
      toast.error(err?.message || "Failed to publish");
    } finally {
      setSaving(false);
    }
  };

  const preview = (schema: FormSchema) => {
    setLastSchema(schema);
    setPreviewOpen(true);
  };

  return (
    <>
      {/*<Toaster position="top-center" />*/}
      <div className="app h-full flex flex-col min-h-[calc-100vh-4rem] bg-gray-50">
        <div className="flex-1 bg-white w-full min-w-0 pt-0 md:pt-0 p-4 md:p-8">
          <SurveyBuilder onSave={saveDraft} onPublish={publish} onPreview={preview} />
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
