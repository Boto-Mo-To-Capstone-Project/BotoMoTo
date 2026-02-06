"use client";

import { useClickableLinks } from "@/hooks/useMakeLinksClickable";
import { FormSchema, Question } from "@/types/survey";

type Props = { 
  schema: FormSchema;
  open: boolean;
  onClose: () => void;
};

export default function SurveyPreview({ schema, open, onClose }: Props) {
  const clickableDescription = useClickableLinks(schema.description);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex justify-center items-center bg-black/30 backdrop-blur-sm lg:ml-68"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative max-w-4xl max-h-screen p-10 flex flex-col justify-center w-full">
        <div className="bg-white rounded-lg shadow-sm overflow-y-auto max-h-[80vh]">
          {/* Modal header */}
          <div className="flex items-center justify-between p-4 border-b rounded-t border-gray-200">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Survey Preview</h3>
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
              <p className="text-base text-gray-500 mb-4">
                Preview how your survey will appear to respondents.
              </p>

            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-semibold">{schema.title}</h2>
                {clickableDescription && <p className="text-base text-gray-600">{clickableDescription}</p>}
              </div>
              <div className="space-y-4">
                {schema.questions.map((q: Question) => (
                  <div key={q.id} className="border-2 border-gray-200 rounded-lg p-4 bg-white/80">
                    <div className="font-medium">
                      {q.label} {q.required && <span className="text-red-600">*</span>}
                    </div>
                    {q.description && <div className="text-xs text-gray-500">{q.description}</div>}
                    <div className="mt-2 text-sm text-gray-700">
                      {q.type === "short_text" && <input className="w-full border border-[var(--color-secondary)] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-[var(--color-secondary)] bg-white text-gray-900" placeholder="Short answer" disabled />}
                      {q.type === "long_text" && <textarea className="w-full border border-[var(--color-secondary)] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-[var(--color-secondary)] bg-white text-gray-900" rows={3} placeholder="Paragraph" disabled />}
                      {q.type === "multiple_choice" && Array.isArray((q as any).options) && (
                        <div className="space-y-1">
                          {(q as any).options.map((o: any) => (
                            <label key={o.id} className="flex items-center gap-2">
                              <input type="radio" disabled />
                              <span>{o.label}</span>
                            </label>
                          ))}
                        </div>
                      )}
                      {q.type === "checkboxes" && Array.isArray((q as any).options) && (
                        <div className="space-y-1">
                          {(q as any).options.map((o: any) => (
                            <label key={o.id} className="flex items-center gap-2">
                              <input type="checkbox" disabled />
                              <span>{o.label}</span>
                            </label>
                          ))}
                        </div>
                      )}
                      {q.type === "dropdown" && Array.isArray((q as any).options) && (
                        <select className="w-full border border-[var(--color-secondary)] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-[var(--color-secondary)] bg-white text-gray-900" disabled>
                          {(q as any).options.map((o: any) => (
                            <option key={o.id}>{o.label}</option>
                          ))}
                        </select>
                      )}
                      {q.type === "date" && <input type="date" className="w-full border border-[var(--color-secondary)] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-[var(--color-secondary)] bg-white text-gray-900" disabled />}
                      {q.type === "time" && <input type="time" className="w-full border border-[var(--color-secondary)] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-[var(--color-secondary)] bg-white text-gray-900" disabled />}
                      {q.type === "linear_scale" && (
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-500">{(q as any).minLabel || "Low"}</span>
                          <div className="flex gap-2">
                            {Array.from({ length: ((q as any).max ?? 5) - ((q as any).min ?? 1) + 1 }).map((_, i) => (
                              <label key={i} className="flex items-center gap-1 text-xs">
                                <input type="radio" disabled />
                                {(q as any).min + i}
                              </label>
                            ))}
                          </div>
                          <span className="text-xs text-gray-500">{(q as any).maxLabel || "High"}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
