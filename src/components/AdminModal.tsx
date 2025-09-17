import { useState, useEffect } from "react";
import { InputField } from "@/components/InputField";
import { SubmitButton } from "@/components/SubmitButton";
import ConfirmationModal from "./ConfirmationModal";
import toast from "react-hot-toast";

export function AdminModal({
  admin,        // the admins object being edited
  onClose,
  onUpdated,   // parent will update table
}: {
  admin: any;
  onClose: () => void;
  onUpdated: (admin: any) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ password: "" });
  const [adminData, setAdminData] = useState<any>(null); // <-- store full admin

  const [modalConfig, setModalConfig] = useState<any>(null);
  const [confirmationOpen, setConfirmationOpen] = useState(false);

  // ✅ Load latest admin info (GET)
  useEffect(() => {
    if (!admin) return;
    setLoading(true);
    fetch(`/api/admins/${admin.id}`)
      .then((res) => res.json())
      .then((res) => {
        if (res.success) {
          setAdminData(res.data.admin); // <-- save admin object
          setForm({  password: "" });
        }
      })
      .finally(() => setLoading(false));
  }, [admin]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setConfirmationOpen(true);
    setModalConfig({
        title: "Confirm Edit",
        description: "Are you sure you want to save the changes to this admin?",
        confirmLabel: "Save Changes",
        cancelLabel: "Cancel",
        variant: "edit",
        onConfirm: async () => {
        await confirmSave();
        },
    });
    setConfirmationOpen(true);
    };

  const handleDelete = (e: React.FormEvent) => {
    e.preventDefault();
    setConfirmationOpen(true);
    setModalConfig({
        title: "Confirm Delete",
        description: `Confirm ${adminData.isDeleted ? "RESTORE " : "DELETE "} the admin "${adminData?.email ?? "..."}"?`,
        confirmLabel: "Yes",
        cancelLabel: "Cancel",
        variant: "edit",
        onConfirm: async () => {
        await confirmDelete();
        },
    });
    setConfirmationOpen(true);
    };

  // ✅ Update (PATCH)
  const confirmSave = async () => {
    setLoading(true);
    const res = await fetch(`/api/admins/${admin.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (data.success) {
      onUpdated(data.data.user); // pass updated user
      onClose();
    } else {
      toast.error(data.message);
    }
  };

  // ✅ Delete (soft delete toggle)
  const confirmDelete = async () => {
    setLoading(true);
    const res = await fetch(`/api/admins/${admin.id}`, { method: "DELETE" });
    const data = await res.json();
    setLoading(false);
    if (data.success) {
      onUpdated(data.data.user); // pass updated user
      onClose();
    } else {
      toast.error(data.message);
    }
  };
  if (!admin) return null
  return (
    <div
      className="fixed inset-0 z-[100] flex justify-center items-center bg-black/30 backdrop-blur-sm lg:ml-68">
      <div className="relative max-w-4xl max-h-screen p-10 flex flex-col justify-center w-full">
        <div className="bg-white rounded-lg shadow-sm overflow-y-auto max-h-[80vh]">
          {/* Modal header */}
          <div className="flex items-center justify-between p-4 border-b rounded-t border-gray-200">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Edit Admin Password</h3>
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
            <p className="text-sm mb-4">
              You are changing the password of <span className="font-semibold text-primary">{adminData?.email ?? "Loading..."}</span>
            </p>

            {/* Form */}
            <form
              className="grid gap-4 mb-4 grid-cols-2">
              <div className="col-span-1">
                <InputField
                  name="password"
                  label="New password*"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Enter new password"                
                />
              </div>

              <div className="col-span-2 flex justify-end gap-2 mt-2">
                {/* ✅ Delete / Restore button */}
                <SubmitButton
                  type="button"
                  variant={adminData?.isDeleted ? "action" : "action-primary"}
                  onClick={handleDelete}
                    label={
                      loading
                        ? "Processing..."
                        : adminData?.isDeleted
                        ? "Restore Admin"
                        : "Delete Admin"
                    }
                />
                <SubmitButton
                  type="button"
                  variant="action"
                  onClick={onClose}
                  label="Cancel"
                />
                <SubmitButton
                  type="submit"
                  variant="small"
                  label="Save"
                  className="px-5 py-2.5 text-sm font-medium rounded-lg" // Match the size of the Save button
                  onClick={handleSubmit}
                />
              </div>
            </form>
          </div>
        </div>
      </div>
      {/* ✅ Confirmation Modal */}
      <ConfirmationModal
          open={confirmationOpen}
          onClose={() => setConfirmationOpen(false)}
        {...modalConfig}
      />
    </div>
  );
}
