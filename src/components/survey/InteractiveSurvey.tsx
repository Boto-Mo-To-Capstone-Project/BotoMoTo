"use client";

import { FormSchema, Question } from "@/types/survey";
import { useState } from "react";
import Button from "@/components/Button";

type Props = { 
  schema: FormSchema;
  onSubmit: (responses: Record<string, any>) => void;
  isSubmitting?: boolean;
};

export default function InteractiveSurvey({ schema, onSubmit, isSubmitting = false }: Props) {
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (questionId: string, value: any) => {
    setResponses(prev => ({ ...prev, [questionId]: value }));
    // Clear error when user starts typing
    if (errors[questionId]) {
      setErrors(prev => ({ ...prev, [questionId]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    schema.questions.forEach((question: Question) => {
      if (question.required && (!responses[question.id] || responses[question.id] === "")) {
        newErrors[question.id] = "This field is required";
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(responses);
    }
  };

  const renderQuestion = (q: Question) => {
    const hasError = errors[q.id];
    const inputClasses = `w-full border rounded px-2 py-1 ${hasError ? 'border-red-500' : 'border-gray-300'}`;

    return (
      <div key={q.id} className="shadow-sm rounded-lg p-4 bg-gray-50">
        <div className="font-medium text-lg">
          {q.label} {q.required && <span className="text-red-600">*</span>}
        </div>
        {q.description && <div className="text-base text-gray-500 mt-1">{q.description}</div>}
        <div className="mt-2">
          {q.type === "short_text" && (
            <input 
              className={inputClasses}
              placeholder="Your answer"
              value={responses[q.id] || ""}
              onChange={(e) => handleInputChange(q.id, e.target.value)}
            />
          )}
          
          {q.type === "long_text" && (
            <textarea 
              className={inputClasses}
              rows={3} 
              placeholder="Your detailed answer"
              value={responses[q.id] || ""}
              onChange={(e) => handleInputChange(q.id, e.target.value)}
            />
          )}
          
          {q.type === "multiple_choice" && Array.isArray((q as any).options) && (
            <div className="space-y-2">
              {(q as any).options.map((option: any) => (
                <label key={option.id} className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name={q.id}
                    value={option.id}
                    checked={responses[q.id] === option.id}
                    onChange={(e) => handleInputChange(q.id, e.target.value)}
                    className="cursor-pointer h-4 w-4 accent-primary"
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          )}
          
          {q.type === "checkboxes" && Array.isArray((q as any).options) && (
            <div className="space-y-2">
              {(q as any).options.map((option: any) => (
                <label key={option.id} className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={Array.isArray(responses[q.id]) && responses[q.id].includes(option.id)}
                    onChange={(e) => {
                      const currentValues = Array.isArray(responses[q.id]) ? responses[q.id] : [];
                      if (e.target.checked) {
                        handleInputChange(q.id, [...currentValues, option.id]);
                      } else {
                        handleInputChange(q.id, currentValues.filter((v: string) => v !== option.id));
                      }
                    }}
                    className="cursor-pointer h-4 w-4 accent-primary"
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          )}
          
          {q.type === "dropdown" && Array.isArray((q as any).options) && (
            <select 
              className={inputClasses}
              value={responses[q.id] || ""}
              onChange={(e) => handleInputChange(q.id, e.target.value)}
            >
              <option value="">Select an option</option>
              {(q as any).options.map((option: any) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
          )}
          
          {q.type === "date" && (
            <input 
              type="date" 
              className={inputClasses}
              value={responses[q.id] || ""}
              onChange={(e) => handleInputChange(q.id, e.target.value)}
            />
          )}
          
          {q.type === "time" && (
            <input 
              type="time" 
              className={inputClasses}
              value={responses[q.id] || ""}
              onChange={(e) => handleInputChange(q.id, e.target.value)}
            />
          )}
          
          {q.type === "linear_scale" && (
            <div className="flex items-center gap-5 justify-start">
              <span className="text-base text-gray-500">{(q as any).minLabel || "Low"}</span>
              <div className="flex gap-5">
                {Array.from({ length: ((q as any).max ?? 5) - ((q as any).min ?? 1) + 1 }).map((_, i) => {
                  const value = (q as any).min + i;
                  return (
                    <label key={i} className="flex flex-col items-center text-base cursor-pointer">
                      <input 
                        type="radio" 
                        name={q.id}
                        value={value}
                        checked={responses[q.id] === value}
                        onChange={(e) => handleInputChange(q.id, parseInt(e.target.value))}
                        className="cursor-pointer h-4 w-4 accent-primary"
                      />
                      {value}
                    </label>
                  );
                })}
              </div>
              <span className="text-base text-gray-500">{(q as any).maxLabel || "High"}</span>
            </div>
          )}
        </div>
        {hasError && <div className="text-red-500 text-sm mt-1">{hasError}</div>}
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-center space-y-2 mb-10">
        <h2 className="voter-election-heading">{schema.title}</h2>
        {schema.description && <p className="voter-election-desc">{schema.description}</p>}
      </div>
      
      <div className="space-y-4">
        {schema.questions.map(renderQuestion)}
      </div>
      
      <div className="pt-6 flex justify-center">
        <Button
          type="submit"
          variant="long_primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Submitting..." : "Submit Survey"}
        </Button>
      </div>
    </form>
  );
}
