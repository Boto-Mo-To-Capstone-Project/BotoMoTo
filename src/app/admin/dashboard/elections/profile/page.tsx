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
import { useLogout } from "@/hooks/useLogout";
import { DeleteTransferModal } from "@/components/DeleteTransferModal";

const ProfilePage = () => {
  const { data: session, update } = useSession();

  const [personalData, setPersonalData] = useState({
    fullName: "",
    email: "",
    accountCreated: "",
    organizationName: "",
    organizationEmail: "",
    numberOfMembers: "",
    profileImage: ""
  });
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showChangePassModal, setShowChangePassModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showDeleteTransferModal, setShowDeleteTransferModal] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<{
    oldPassword?: string[];
    newPassword?: string[];
    confirmPassword?: string[];
  }>({});
  const [transferErrors, setTransferErrors] = useState<{
    newAdminEmail?: string[];
    currentPassword?: string[];
    transferReason?: string[];
  }>({});
  const logout = useLogout();

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

  const handleChangePhoto = () => {
    // Trigger file input click
    const input = document.getElementById('profile-image-input') as HTMLInputElement;
    if (input) {
      input.click();
    }
  };

  const handleProfileImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Basic validation
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/png', 'image/jpg', 'image/jpeg', 'image/gif', 'image/webp'];
    
    if (file.size > maxSize) {
      toast.error('File size must be less than 5MB');
      return;
    }
    
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a valid image file (PNG, JPG, JPEG, GIF, WebP)');
      return;
    }

    // Upload the image immediately
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('profileImage', file);

      const response = await fetch('/api/users/profile/image', {
        method: 'PUT',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        // Update local state with new profile image URL
        setPersonalData(prev => ({ ...prev, profileImage: result.data.image }));
        toast.success("Profile image updated successfully");
        
        // Refresh the session to update the sidebar avatar
        await update();
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to update profile image");
      }
    } catch (error) {
      console.error("Error updating profile image:", error);
      toast.error("Failed to update profile image");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = (e: React.FormEvent) => {
    e.preventDefault();
    setShowDeleteTransferModal(true);
  };

  // Handle Delete/Transfer Modal Actions
  const handleDeleteTransferAction = async (data: { 
    action: "delete" | "transfer"; 
    transferData?: {
      newAdminEmail: string;
      currentPassword: string;
      transferReason: string;
    }
  }) => {
    if (data.action === "delete") {
      await confirmDelete();
    } else if (data.action === "transfer" && data.transferData) {
      await handleAdminTransfer(data.transferData);
    }
    setShowDeleteTransferModal(false);
  };

  // ✅ Delete (soft delete toggle)
  const confirmDelete = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/users/delete-self`, { method: "PATCH" });
      const data = await res.json();
      setLoading(false);
      if (data.success) {
        toast.success("Admin successfully deleted")
        await logout();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
    }
  };

  const handleAdminTransfer = async (data: {
    newAdminEmail: string;
    currentPassword: string;
    transferReason: string;
  }) => {
    setTransferErrors({});
    
    try {
      const response = await fetch('/api/admin/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (response.ok) {
        toast.success("Admin transfer completed successfully. You will be logged out.");
        // Log out the user since they're account is now deleted
        setTimeout(async () => {
          await logout();
        }, 2000);
      } else {
        const error = await response.json();
        
        if (error.error && typeof error.error === 'object') {
          setTransferErrors(error.error);
        } else {
          toast.error(error.message || "Failed to transfer admin rights");
        }
      }
    } catch (error) {
      console.error("Error transferring admin:", error);
      toast.error("Failed to transfer admin rights");
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="app h-full flex flex-col min-h-[calc(100vh-4rem)] bg-gray-50">
        <div className="flex-1 bg-white w-full min-w-0 pt-0 md:pt-0 p-4 md:p-8">
          {/* Toolbar */}
          <div className="main-toolbar sticky top-16 z-30 bg-white flex flex-col md:flex-row md:items-center md:gap-4 gap-2 mb-6 py-3 px-2 sm:px-5">
            <div className="flex-1 flex justify-end gap-2 animate-pulse">
              <div className="h-10 bg-gray-200 rounded-md w-[100px]"></div>
            </div>
          </div>

          {/* Heading */}
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-32 mb-2 px-2 sm:px-5"></div>
            <div className="h-4 bg-gray-200 rounded w-80 mb-6 px-2 sm:px-5"></div>
          </div>

          {/* Main Card */}
          <div className="main-content px-2 sm:px-5">
            <div className="w-full bg-white rounded-2xl shadow-lg border border-gray-200 p-6 space-y-10 animate-pulse">

              {/* Personal Information Section */}
              <div>
                <div className="h-5 bg-gray-200 rounded w-48 mb-6"></div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                  {/* Profile Photo */}
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-gray-200"></div>
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                  </div>

                  {/* Full Name */}
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-28"></div>
                    <div className="h-10 bg-gray-200 rounded w-full"></div>
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-28"></div>
                    <div className="h-10 bg-gray-200 rounded w-full"></div>
                  </div>
                </div>
              </div>

              {/* Organization Section */}
              <div>
                <div className="h-5 bg-gray-200 rounded w-60 mb-6"></div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-32"></div>
                      <div className="h-10 bg-gray-200 rounded w-full"></div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <hr className="border-gray-200" />

              {/* Account Settings Section */}
              <div>
                <div className="h-5 bg-gray-200 rounded w-52 mb-6"></div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
                  {/* Change Password */}
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                    <div className="h-10 bg-gray-200 rounded w-[140px]"></div>
                  </div>

                  {/* Account Created */}
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-40"></div>
                    <div className="h-10 bg-gray-200 rounded w-full"></div>
                  </div>

                  {/* Delete Account */}
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                    <div className="h-10 bg-gray-200 rounded w-[180px]"></div>
                  </div>
                </div>
              </div>
            </div>
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
              label={saving ? "Updating" : "Update"}
              variant="action-primary"
              icon={<MdSave size={20} className="fill-current" />}
              title="Update Profile"
              className="min-w-[100px]"
              onClick={handleSaveProfile}
            />
          </div>
        </div>

        {/* Heading */}
        <h2 className="text-md font-bold mb-2 px-2 sm:px-5">Profile</h2>
        <p className="text-gray-600 mb-6 px-2 sm:px-5">
          View and update your personal information and account settings.
        </p>

        {/* Main Card */}
        <div className="main-content px-2 sm:px-5">
          <div className="w-full bg-white rounded-2xl shadow-lg border border-gray-200 p-6 space-y-10">
            
            {/* Personal Information Section */}
            <div>
              <h3 className="text-sm font-semibold mb-4">Personal Information</h3>
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
                      disabled={uploading}
                      className="text-xs text-blue-600 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {uploading ? "Uploading..." : "Change"}
                    </button>
                  </div>
                  {/* Hidden file input */}
                  <input
                    id="profile-image-input"
                    type="file"
                    accept="image/png,image/jpg,image/jpeg,image/gif,image/webp,image/*"
                    onChange={handleProfileImageUpload}
                    className="hidden"
                  />
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
              <h3 className="text-sm font-semibold mb-4">Organization Information</h3>
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
              <h3 className="text-sm font-semibold mb-4">Account Settings</h3>
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
                  variant= "action-primary"
                  onClick={handleDelete}
                    label="Delete / Transfer Account"
                  />
                </div>
              </div>
            </div>

            {/* Delete/Transfer Modal */}
            <DeleteTransferModal
              open={showDeleteTransferModal}
              onClose={() => {
                setShowDeleteTransferModal(false);
                setTransferErrors({}); // Clear errors when modal closes
              }}
              onSave={handleDeleteTransferAction}
              errors={transferErrors}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
