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
  disableSave?: boolean;
};

export function PartyModal({
  open,
  onClose,
  onSave,
  initialData = { partyName: "", selectedColor: "#85d336" },
  disableSave,
}: PartyModalProps) {
  const [partyName, setPartyName] = useState(initialData.partyName);
  const [selectedColor, setSelectedColor] = useState(initialData.selectedColor);
  const [showColorPicker, setShowColorPicker] = useState(false);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-[95vw] sm:max-w-md md:max-w-lg lg:max-w-xl relative px-4 sm:px-6 pt-8 pb-8 mx-2 sm:mx-4 text-center space-y-6 border border-gray-200 max-h-[90vh] overflow-visible break-words">
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-700"
          onClick={onClose}
        >
          &times;
        </button>
        <AuthHeading title="Party Form" subtitle="Register and manage political parties or groups to which candidates may belong." />
        <form
          onSubmit={e => {
            e.preventDefault();
            onSave({ partyName, selectedColor });
            onClose();
          }}
          className="flex flex-col gap-4 text-left w-full"
        >
          <div className="mb-4">
            <InputField
              label="Party"
              type="text"
              value={partyName}
              onChange={e => setPartyName(e.target.value)}
              placeholder="Enter Party (e.g., Mabait)"
              style={{ color: selectedColor }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pick the color that represents your party
            </label>
            <p
              className="text-sm text-gray-500 mb-4"
              style={{ color: selectedColor }}
            >
              (Example: Mabait)
            </p>
            <div className="flex items-start gap-6">
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
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <SubmitButton label="Cancel" variant="small-action" type="button" onClick={onClose} />
            <SubmitButton
              label="Add"
              variant="small"
              type="submit"
            />
          </div>
        </form>
      </div>
    </div>
  );
}