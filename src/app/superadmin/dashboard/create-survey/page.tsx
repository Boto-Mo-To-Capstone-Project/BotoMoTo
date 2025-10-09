"use client";

import { useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import SurveyBuilder from "@/components/survey/SurveyBuilder";
import SurveyPreview from "@/components/survey/SurveyPreview";
import type { FormSchema } from "@/types/survey";
import ConfirmationModal from "@/components/ConfirmationModal";

export default function SuperAdminCreateSurveyPage() {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [lastSchema, setLastSchema] = useState<FormSchema | null>(null);
  // Track created survey id to prevent creating duplicates on subsequent saves
  const [surveyId, setSurveyId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingSchema, setPendingSchema] = useState<FormSchema | null>(null);

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
  // unused???
  // const publish = async (schema: FormSchema) => {
  //   if (saving) return; // prevent double clicks
  //   setSaving(true);
  //   try {
  //     const payload = {
  //       title: schema.title,
  //       description: schema.description ?? "",
  //       formSchema: schema,
  //       isActive: true,
  //     };

  //     const res = await fetch(
  //       surveyId ? `/api/superadmin/surveys/${surveyId}` : "/api/superadmin/surveys",
  //       {
  //         method: surveyId ? "PATCH" : "POST",
  //         headers: { "Content-Type": "application/json" },
  //         body: JSON.stringify(payload),
  //       }
  //     );
  //     const data = await res.json();
  //     if (!res.ok) throw new Error(data?.message || "Failed to publish");

  //     const idFromResponse = data?.data?.survey?.id;
  //     if (idFromResponse && !surveyId) setSurveyId(idFromResponse);

  //     setLastSchema(schema);
  //     toast.success("Survey published");
  //   } catch (err: any) {
  //     toast.error(err?.message || "Failed to publish");
  //   } finally {
  //     setSaving(false);
  //   }
  // };

  const preview = (schema: FormSchema) => {
    setLastSchema(schema);
    setPreviewOpen(true);
  };

  return (
    <>
      {/*<Toaster position="top-center" />*/}
      <div className="px-5 sm:px-20 py-10 bg-red-100 min-h-screen">
        <SurveyBuilder 
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
          title="Create Survey"
          description="Are you sure you want to save this survey?"
          confirmLabel="Save Changes"
          cancelLabel="Cancel"
          variant="info"
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
