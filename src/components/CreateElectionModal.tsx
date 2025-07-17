import React, { useState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { InputField } from "@/components/InputField";

interface CreateElectionModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    description: string;
    dateBegin: string;
    dateEnd: string;
  }) => void;
}

export function CreateElectionModal({ open, onClose, onSave }: CreateElectionModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [dateBegin, setDateBegin] = useState("");
  const [dateEnd, setDateEnd] = useState("");

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-[420px] relative px-4 pt-8 pb-8 mx-auto text-left space-y-6 border border-gray-200">
        <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-700" onClick={onClose}>&times;</button>
        <h2 className="text-xl font-bold mb-1">Create Election</h2>
        <p className="text-gray-600 mb-4">Fill out the form to create a new election.</p>
        <form
          onSubmit={e => {
            e.preventDefault();
            onSave({ name, description, dateBegin, dateEnd });
          }}
          className="flex flex-col gap-4 text-left w-full"
        >
          <InputField label="Election Name" value={name} onChange={e => setName(e.target.value)} placeholder="Enter your election name" />
          <InputField label="Election Description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Enter a description..." textarea={true} rows={3} />
          <InputField label="Set Date Time (Begin)" value={dateBegin} onChange={e => setDateBegin(e.target.value)} type="datetime-local" />
          <InputField label="Set Date Time (End)" value={dateEnd} onChange={e => setDateEnd(e.target.value)} type="datetime-local" />
          <div className="flex justify-end gap-2 mt-2">
            <SubmitButton label="Cancel" variant="small-action" type="button" onClick={onClose} />
            <SubmitButton label="Save" variant="small" type="submit" />
          </div>
        </form>
      </div>
    </div>
  );
} 