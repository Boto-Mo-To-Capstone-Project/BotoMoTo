"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { InputField } from "@/components/InputField";
import { SubmitButton } from "@/components/SubmitButton";
import { MdSave } from "react-icons/md";
import { ChangePassModal } from "@/components/ChangePassModal";
import { AccountModal } from "@/components/DeactDeleteModal";
import { AvatarLarge } from "@/components/Avatar";
import toast from "react-hot-toast";

const ProfilePage = () => {
  const { data: session } = useSession();

  const [personalData, setPersonalData] = useState({
    fullName: "",
    email: "",
    accountCreated: "",
    organizationName: "",
    organizationEmail: "",
    numberOfMembers: "",
    profileImage: ""
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showChangePassModal, setShowChangePassModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<{
    oldPassword?: string[];
    newPassword?: string[];
    confirmPassword?: string[];
  }>({});

  // Fetch user profile on component mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch('/api/users/profile');
        if (response.ok) {
          const result = await response.json();
          const profile = result.data;
          setPersonalData({
            fullName: profile.name || "",
            email: profile.email || "",
            accountCreated: profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "",
            organizationName: profile.organization?.name || "",
            organizationEmail: profile.organization?.email || "",
            numberOfMembers: profile.organization?.membersCount?.toString() || "",
            profileImage: profile.image || ""
          });
        } else {
          toast.error("Failed to load profile data");
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
        toast.error("Failed to load profile data");
      } finally {
        setLoading(false);
      }
    };

    if (session) {
      fetchProfile();
    }
  }, [session]);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: personalData.fullName,
          organizationName: personalData.organizationName,
          organizationEmail: personalData.organizationEmail,
          numberOfMembers: personalData.numberOfMembers,
        }),
      });
      
      if (response.ok) {
        toast.success("Profile updated successfully");
      } else {
        const error = await response.json();
        if (error.error && typeof error.error === 'object') {
          // Show specific field errors
          Object.entries(error.error).forEach(([field, messages]) => {
            if (Array.isArray(messages)) {
              toast.error(`${field}: ${messages.join(', ')}`);
            }
          });
        } else {
          toast.error(error.message || "Failed to update profile");
        }
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (data: { oldPassword: string; newPassword: string; confirmPassword: string }) => {
    setPasswordErrors({}); // Clear previous errors
    
    try {
      const response = await fetch('/api/users/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (response.ok) {
        toast.success("Password changed successfully");
        setShowChangePassModal(false);
        setPasswordErrors({}); // Clear errors on success
      } else {
        const error = await response.json();
        
        // Handle field-specific validation errors like signup page
        if (error.error && typeof error.error === 'object') {
          const errors: typeof passwordErrors = {};
          
          // Extract field-specific errors
          if (error.error.oldPassword) {
            errors.oldPassword = error.error.oldPassword;
          }
          if (error.error.newPassword) {
            errors.newPassword = error.error.newPassword;
          }
          if (error.error.confirmPassword) {
            errors.confirmPassword = error.error.confirmPassword;
          }
          
          setPasswordErrors(errors);
        } else {
          // Show general error as toast for non-field errors
          toast.error(error.message || "Failed to change password");
        }
      }
    } catch (error) {
      console.error("Error changing password:", error);
      toast.error("Failed to change password");
    }
  };

  const handleChangePhoto = () => toast("Change avatar functionality will be implemented soon");

  if (loading) {
    return (
      <div className="app h-full flex flex-col min-h-[calc(100vh-4rem)] bg-gray-50">
        <div className="flex-1 bg-white w-full min-w-0 pt-0 md:pt-0 p-4 md:p-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Loading profile...</div>
          </div>
        </div>
      </div>
    );
  }

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
              label={saving ? "Saving" : "Save"}
              variant="action-primary"
              icon={<MdSave size={20} className="fill-current" />}
              title="Save"
              className="min-w-[100px]"
              onClick={handleSaveProfile}
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
                    <AvatarLarge
                      name={personalData.fullName || "User"}
                      image={personalData.profileImage}
                      alt={`${personalData.fullName} profile picture`}
                    />
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
                    setPersonalData({ ...personalData, numberOfMembers: Math.max(0, Number(e.target.value)).toString() })
                  }
                  min={1}
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
                    onClick={() => {
                      setPasswordErrors({}); // Clear any previous errors
                      setShowChangePassModal(true);
                    }}
                    className="min-w-[140px]"
                  />
                  <ChangePassModal
                    open={showChangePassModal}
                    onClose={() => {
                      setShowChangePassModal(false);
                      setPasswordErrors({}); // Clear errors when modal closes
                    }}
                    onSave={handleChangePassword}
                    errors={passwordErrors}
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
