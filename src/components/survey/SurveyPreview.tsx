"use client";

import { FormSchema, Question } from "@/types/survey";

type Props = { schema: FormSchema };

export default function SurveyPreview({ schema }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">{schema.title}</h2>
        {schema.description && <p className="text-sm text-gray-600">{schema.description}</p>}
      </div>
      <div className="space-y-4">
        {schema.questions.map((q: Question) => (
          <div key={q.id} className="border rounded-lg p-4 bg-white/80">
            <div className="font-medium">
              {q.label} {q.required && <span className="text-red-600">*</span>}
            </div>
            {q.description && <div className="text-xs text-gray-500">{q.description}</div>}
            <div className="mt-2 text-sm text-gray-700">
              {q.type === "short_text" && <input className="w-full border rounded px-2 py-1" placeholder="Short answer" disabled />}
              {q.type === "long_text" && <textarea className="w-full border rounded px-2 py-1" rows={3} placeholder="Paragraph" disabled />}
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
                <select className="border rounded px-2 py-1" disabled>
                  {(q as any).options.map((o: any) => (
                    <option key={o.id}>{o.label}</option>
                  ))}
                </select>
              )}
              {q.type === "date" && <input type="date" className="border rounded px-2 py-1" disabled />}
              {q.type === "time" && <input type="time" className="border rounded px-2 py-1" disabled />}
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
  );
}
