"use client";
import { useState } from "react";
import { InputField } from "@/components/InputField";
import { SubmitButton } from "@/components/SubmitButton";
import { MdSave } from "react-icons/md";
import { ChangePassModal } from "@/components/ChangePassModal";
import { AccountModal } from "@/components/DeactDeleteModal";

const initialData = {
  fullName: "Juan Dela Cruz",
  email: "juan.delacruz@email.com",
  accountCreated: "2023-01-15",
  organizationName: "Sample Org",
  organizationEmail: "org@email.com",
  numberOfMembers: "120",
};

const ProfilePage = () => {
  const [personalData, setPersonalData] = useState(initialData);
  const [showChangePassModal, setShowChangePassModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  // Remove passwordData state, handled in modal

  const handleChangePhoto = () => alert("Change avatar clicked");
  // Remove handleDeleteAccount, handled in modal

  return (
    <div className="app h-full flex flex-col min-h-[calc(100vh-4rem)] bg-gray-50">
      <div className="flex-1 bg-white w-full min-w-0 pt-0 md:pt-0 p-4 md:p-8">
        {/* Toolbar */}
        <div className="main-toolbar sticky top-16 z-30 bg-white flex flex-col md:flex-row md:items-center md:gap-4 gap-2 mb-6 py-3 px-2 sm:px-5">
          <div className="flex-1 flex justify-end gap-2">
            <SubmitButton
              label="Cancel"
              variant="action"
              className="min-w-[100px]"
            />
            
            <SubmitButton
              label="Save"
              variant="action-primary"
              icon={<MdSave size={20} className="fill-current" />}
              title="Save"
              className="min-w-[100px]"
            />
          </div>
        </div>

        {/* Heading */}
        <h2 className="text-lg font-semibold mb-2 px-2 sm:px-5">Profile</h2>
        <p className="text-gray-600 mb-6 px-2 sm:px-5">
          View and update your personal information and account settings.
        </p>

        {/* Main Card */}
        <div className="main-content px-2 sm:px-5">
          <div className="w-full max-w-7xl bg-white rounded-2xl shadow-lg border border-gray-200 p-6 space-y-10">
            
            {/* Personal Information Section */}
            <div>
              <h3 className="text-md font-semibold mb-4">Personal Information</h3>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                
                {/* Profile Photo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Profile
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="relative inline-flex items-center justify-center w-12 h-12 overflow-hidden bg-gray-100 rounded-full">
                      <span className="font-medium text-gray-600">JL</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleChangePhoto}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Change
                    </button>
                  </div>
                </div>

                {/* Full Name */}
                <div>
                  <InputField
                    label="Full Name"
                    type="text"
                    value={personalData.fullName}
                    onChange={e =>
                      setPersonalData({ ...personalData, fullName: e.target.value })
                    }
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                {/* Email Address (read-only with gray border) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={personalData.email}
                    disabled
                    className="w-full rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 text-sm text-gray-700"
                  />
                </div>
              </div>
            </div>

            {/* Organization Section */}
            <div>
              <h3 className="text-md font-semibold mb-4">Organization Information</h3>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <InputField
                  label="Organization Name"
                  type="text"
                  value={personalData.organizationName}
                  onChange={e =>
                    setPersonalData({ ...personalData, organizationName: e.target.value })
                  }
                />
                <InputField
                  label="Organization Email"
                  type="email"
                  value={personalData.organizationEmail}
                  onChange={e =>
                    setPersonalData({ ...personalData, organizationEmail: e.target.value })
                  }
                />
                <InputField
                  label="Number of Voters/Members"
                  type="number"
                  value={personalData.numberOfMembers}
                  onChange={e =>
                    setPersonalData({ ...personalData, numberOfMembers: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Divider */}
            <hr className="border-gray-200" />

            {/* Account Settings Section */}
            <div>
              <h3 className="text-md font-semibold mb-4">Account Settings</h3>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
                
                {/* Change Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <SubmitButton
                    type="button"
                    label="Change Password"
                    variant="action-primary"
                    onClick={() => setShowChangePassModal(true)}
                    className="min-w-[140px]"
                  />
                  <ChangePassModal
                    open={showChangePassModal}
                    onClose={() => setShowChangePassModal(false)}
                    onSave={data => {
                      // TODO: handle password change logic here
                      setShowChangePassModal(false);
                    }}
                  />
                </div>

                {/* Account Created */}
                <InputField
                  label="Account Creation Date"
                  type="text"
                  value={personalData.accountCreated}
                  disabled
                />

                {/* Delete Account */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">&nbsp;</label>
                  <SubmitButton
                    type="button"
                    label="Delete / Deactivate Account"
                    variant="action-primary"
                    onClick={() => setShowAccountModal(true)}
                    className="min-w-[180px]"
                  />
                  <AccountModal
                    open={showAccountModal}
                    onClose={() => setShowAccountModal(false)}
                    onSave={data => {
                      // TODO: handle deactivate/delete logic here
                      setShowAccountModal(false);
                    }}
                  />
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
