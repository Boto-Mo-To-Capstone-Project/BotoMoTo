"use client";

import { useState } from "react";
import { nanoid } from "nanoid";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { FormSchema, Question, QuestionType } from "@/types/survey";
import { SubmitButton } from "@/components/SubmitButton";
import { MdAdd, MdVisibility, MdSave, MdPublish } from "react-icons/md";

const DEFAULT_SCHEMA: FormSchema = { title: "Untitled Survey", description: "", questions: [] };

const TEMPLATES: Record<QuestionType, Partial<Question>> = {
  short_text: { type: "short_text", label: "Short answer" },
  long_text: { type: "long_text", label: "Paragraph" },
  multiple_choice: { type: "multiple_choice", label: "Multiple choice", options: [{ id: nanoid(), label: "Option 1" }] as any },
  checkboxes: { type: "checkboxes", label: "Checkboxes", options: [{ id: nanoid(), label: "Option 1" }] as any },
  dropdown: { type: "dropdown", label: "Dropdown", options: [{ id: nanoid(), label: "Option 1" }] as any },
  date: { type: "date", label: "Date" },
  time: { type: "time", label: "Time" },
  linear_scale: { type: "linear_scale", label: "Linear scale", min: 1, max: 5, minLabel: "Low", maxLabel: "High" } as any,
};

function makeQuestion(type: QuestionType): Question {
  const base = TEMPLATES[type]!;
  return { id: nanoid(), required: false, description: "", label: base.label || type, ...base } as Question;
}

type Props = {
  initial?: FormSchema;
  onSave?: (schema: FormSchema) => Promise<void> | void;
  onPublish?: (schema: FormSchema) => Promise<void> | void;
  onPreview?: (schema: FormSchema) => void;
};

export default function SurveyBuilder({ initial, onSave, onPublish, onPreview }: Props) {
  const [schema, setSchema] = useState<FormSchema>(initial || DEFAULT_SCHEMA);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const [typeToAdd, setTypeToAdd] = useState<QuestionType>("short_text");

  const addQuestion = (type: QuestionType) => setSchema(s => ({ ...s, questions: [...s.questions, makeQuestion(type)] }));
  const updateQuestion = (id: string, patch: Partial<Question>) =>
    setSchema(s => ({ ...s, questions: s.questions.map(q => (q.id === id ? { ...q, ...patch } as Question : q)) }));
  const removeQuestion = (id: string) => {
    setSchema(s => ({ ...s, questions: s.questions.filter(q => q.id !== id) }));
  };
  const duplicateQuestion = (id: string) => {
    setSchema(s => {
      const idx = s.questions.findIndex(q => q.id === id);
      if (idx === -1) return s;
      const copy = structuredClone(s.questions[idx]) as Question;
      copy.id = nanoid();
      const next = [...s.questions];
      next.splice(idx + 1, 0, copy);
      return { ...s, questions: next };
    });
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = schema.questions.findIndex(q => q.id === active.id);
    const to = schema.questions.findIndex(q => q.id === over.id);
    if (from !== -1 && to !== -1) setSchema(s => ({ ...s, questions: arrayMove(s.questions, from, to) }));
  };

  const questionTypes: QuestionType[] = [
    "short_text",
    "long_text",
    "multiple_choice",
    "checkboxes",
    "dropdown",
    "date",
    "time",
    "linear_scale",
  ];

  return (
    <div className="space-y-4">
      {/* Toolbar (Admin Elections style) */}
      <div className="main-toolbar sticky top-0 z-30 bg-white flex flex-col md:flex-row md:items-center md:gap-4 gap-2 py-3 px-2 sm:px-5 border rounded-lg">
        {/* Question type dropdown + Add */}
        <div className="flex-shrink-0 flex items-center gap-2">
          <label className="text-sm text-gray-600">Question type</label>
          <select
            className="h-[44px] md:h-10 rounded-md border border-gray-300 bg-white px-3 text-sm"
            value={typeToAdd}
            onChange={(e) => setTypeToAdd(e.target.value as QuestionType)}
          >
            {questionTypes.map((t) => (
              <option key={t} value={t}>
                {TEMPLATES[t]?.label || t}
              </option>
            ))}
          </select>
          <SubmitButton
            label=""
            variant="action"
            icon={<MdAdd size={20} />}
            title="Add question"
            onClick={() => addQuestion(typeToAdd)}
          />
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Actions */}
        <div className="flex-shrink-0 flex gap-2">
          <SubmitButton
            label=""
            variant="action"
            icon={<MdVisibility size={20} />}
            title="Preview"
            onClick={() => onPreview?.(schema)}
          />
          <SubmitButton
            label=""
            variant="action"
            icon={<MdSave size={20} />}
            title="Save draft"
            onClick={() => onSave?.(schema)}
          />
          <SubmitButton
            label=""
            variant="action-primary"
            icon={<MdPublish size={20} className="text-[var(--color-primary)]" />}
            title="Publish"
            onClick={() => onPublish?.(schema)}
          />
        </div>
      </div>

      {/* Canvas: Survey meta */}
      <div className="border rounded-lg bg-white p-4">
        <input
          className="w-full text-xl font-semibold outline-none mb-1"
          value={schema.title}
          onChange={e => setSchema(s => ({ ...s, title: e.target.value }))}
          placeholder="Survey title"
        />
        <textarea
          className="w-full text-sm outline-none resize-none"
          rows={2}
          value={schema.description || ""}
          onChange={e => setSchema(s => ({ ...s, description: e.target.value }))}
          placeholder="Survey description"
        />
      </div>

      {/* Canvas: Questions */}
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd} sensors={sensors}>
        <SortableContext items={schema.questions.map(q => q.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {schema.questions.map(q => (
              <div key={q.id} id={q.id} className="border rounded-lg bg-white p-4">
                <div className="flex justify-between items-center mb-2">
                  <div className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 capitalize">{q.type.replace("_", " ")}</div>
                  <div className="space-x-2">
                    <button className="text-xs px-2 py-1 rounded border" onClick={() => duplicateQuestion(q.id)}>Duplicate</button>
                    <button className="text-xs px-2 py-1 rounded border" onClick={() => removeQuestion(q.id)}>Remove</button>
                  </div>
                </div>
                <input
                  className="w-full font-medium outline-none"
                  value={q.label}
                  onChange={e => updateQuestion(q.id, { label: e.target.value })}
                  placeholder="Question"
                />
                <input
                  className="w-full text-sm outline-none mt-1"
                  value={q.description || ""}
                  onChange={e => updateQuestion(q.id, { description: e.target.value })}
                  placeholder="Description (optional)"
                />

                {"options" in q && Array.isArray((q as any).options) && (
                  <div className="mt-3 space-y-2">
                    {(q as any).options.map((opt: any, idx: number) => (
                      <div key={opt.id} className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">{idx + 1}.</span>
                        <input
                          className="flex-1 text-sm outline-none border rounded px-2 py-1"
                          value={opt.label}
                          onChange={e => {
                            const options = [...(q as any).options];
                            options[idx] = { ...opt, label: e.target.value };
                            updateQuestion(q.id, { ...(q as any), options } as any);
                          }}
                          placeholder={`Option ${idx + 1}`}
                        />
                        <button
                          className="text-xs px-2 py-1 rounded border"
                          onClick={() => {
                            const options = (q as any).options.filter((o: any) => o.id !== opt.id);
                            updateQuestion(q.id, { ...(q as any), options } as any);
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <button
                      className="text-xs px-2 py-1 rounded border"
                      onClick={() => {
                        const options = [ ...(q as any).options, { id: nanoid(), label: `Option ${(q as any).options.length + 1}` } ];
                        updateQuestion(q.id, { ...(q as any), options } as any);
                      }}
                    >
                      Add option
                    </button>
                  </div>
                )}

                {q.type === "linear_scale" && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <input
                      className="text-sm outline-none border rounded px-2 py-1"
                      type="number"
                      min={1}
                      max={10}
                      value={(q as any).min ?? 1}
                      onChange={e => updateQuestion(q.id, { ...(q as any), min: Number(e.target.value) } as any)}
                    />
                    <input
                      className="text-sm outline-none border rounded px-2 py-1"
                      type="number"
                      min={1}
                      max={10}
                      value={(q as any).max ?? 5}
                      onChange={e => updateQuestion(q.id, { ...(q as any), max: Number(e.target.value) } as any)}
                    />
                    <input
                      className="text-sm outline-none border rounded px-2 py-1"
                      placeholder="Min label"
                      value={(q as any).minLabel ?? ""}
                      onChange={e => updateQuestion(q.id, { ...(q as any), minLabel: e.target.value } as any)}
                    />
                    <input
                      className="text-sm outline-none border rounded px-2 py-1"
                      placeholder="Max label"
                      value={(q as any).maxLabel ?? ""}
                      onChange={e => updateQuestion(q.id, { ...(q as any), maxLabel: e.target.value } as any)}
                    />
                  </div>
                )}

                <div className="mt-3 flex items-center gap-2">
                  <label className="text-sm">Required</label>
                  <input type="checkbox" checked={!!q.required} onChange={() => updateQuestion(q.id, { required: !q.required })} />
                </div>
              </div>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
