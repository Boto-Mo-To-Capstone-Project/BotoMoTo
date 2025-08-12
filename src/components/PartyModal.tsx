import { useState } from "react";
import { AuthHeading } from "@/components/AuthHeading";
import { InputField } from "@/components/InputField";
import { SubmitButton } from "@/components/SubmitButton";
import { FiPlus } from "react-icons/fi";
import { HexColorPicker } from "react-colorful";

const PRESET_COLORS = ["#85d336", "#f87171", "#60a5fa", "#fbbf24", "#a78bfa", "#34d399"];

type PartyModalProps = {
  open: boolean;
  onClose: () => void;
  onSave: (data: { partyName: string; selectedColor: string }) => void;
  initialData?: { partyName: string; selectedColor: string };
};

export function PartyModal({
  open,
  onClose,
  onSave,
  initialData = { partyName: "", selectedColor: "#85d336" },
}: PartyModalProps) {
  const [partyName, setPartyName] = useState(initialData.partyName);
  const [selectedColor, setSelectedColor] = useState(initialData.selectedColor);
  const [showColorPicker, setShowColorPicker] = useState(false);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex justify-center items-center bg-black/30 backdrop-blur-sm lg:ml-68" 
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}>
      <div className="relative max-w-4xl max-h-screen p-10 flex flex-col justify-center w-full">
        <div className="bg-white rounded-lg shadow-sm overflow-y-auto max-h-[80vh] w-full">
          {/* Modal header */}
          <div className="flex items-center justify-between p-4 border-b rounded-t border-gray-200">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Party Form</h3>
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
              Create a party/group and assign a color to which candidates may belong.
            </p>
          <form
            onSubmit={e => {
              e.preventDefault();
              onSave({ partyName, selectedColor });
              onClose();
            }}
            className="grid gap-4 mb-4 grid-cols-2"
          >
            <div className="col-span-2">
              <InputField
                label="Party Name*"
                type="text"
                value={partyName}
                onChange={e => setPartyName(e.target.value)}
                placeholder="Enter Party (e.g., Mabait)"
                style={{ color: selectedColor }}
                required
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pick the color that represents your party
              </label>
              {/* Left: Color controls */}
              <div>
                <div className="flex items-center gap-4 mb-2">
                  {/* Plus button */}
                  <button
                    type="button"
                    className={`w-10 h-10 flex items-center justify-center rounded-full border-2 ${showColorPicker ? "border-green-500" : "border-gray-400"} text-gray-600 hover:border-green-500 transition-colors`}
                    onClick={() => setShowColorPicker((prev) => !prev)}
                    tabIndex={-1}
                  >
                    <FiPlus size={24} />
                  </button>
                  {/* Circle preview */}
                  <div className="w-10 h-10 rounded-full border-2 border-gray-200 flex-shrink-0" style={{ backgroundColor: selectedColor }} />
                  {/* Square preview */}
                  <div className="w-10 h-10 rounded border-2 border-gray-200 flex-shrink-0" style={{ backgroundColor: selectedColor }} />
                  {/* Hex code */}
                  <span className="font-mono text-gray-700">{selectedColor}</span>
                </div>
                <div className="flex gap-4 mb-2">
                  {PRESET_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${selectedColor === color ? "border-green-600 shadow-md" : "border-white shadow"}`}
                      style={{ backgroundColor: color }}
                      onClick={() => {
                        setSelectedColor(color);
                        setShowColorPicker(false);
                      }}
                      aria-label={`Choose ${color}`}
                    />
                  ))}
                </div>
              </div>
              {/* Right: Color picker */}
              {showColorPicker && (
                <div>
                  <HexColorPicker color={selectedColor} onChange={setSelectedColor} />
                </div>
              )}
            </div>
            <div className="col-span-2 flex justify-end gap-2 mt-2">
              <SubmitButton
                type="button"
                variant="action"
                onClick={onClose}
                label="Cancel"
              />
              <SubmitButton
                type="submit"
                variant="small"
                label="Add"
                className="px-5 py-2.5 text-sm font-medium rounded-lg"
              />
            </div>
          </form>
          </div>
        </div>
      </div>
    </div>
  );
}