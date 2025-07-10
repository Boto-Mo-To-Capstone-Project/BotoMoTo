"use client";

export default function OrganizationProfile() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-[var(--background)] text-[var(--foreground)] pt-40 pb-20">
      <div className="w-full max-w-md space-y-6 text-left">
        {/* Heading */}
        <div className="text-center space-y-1">
          <p className="text-2xl font-semibold text-[var(--color-black)]">Organization Profile</p>
          <p className="text-sm text-[var(--color-gray)]">
            Tell us who represents your organization. Information should match the formal letter.
          </p>
        </div>

        {/* Form */}
        <form className="space-y-4">
          {/* First Name */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-black)] mb-1">
              First name
            </label>
            <input
              type="text"
              placeholder="Enter your first name"
              className="w-full border border-[var(--color-secondary)] rounded-md px-3 h-[44px] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]"
            />
          </div>

          {/* Last Name */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-black)] mb-1">
              Last name
            </label>
            <input
              type="text"
              placeholder="Enter your last name"
              className="w-full border border-[var(--color-secondary)] rounded-md px-3 h-[44px] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]"
            />
          </div>

          {/* Organization Name */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-black)] mb-1">
              Organization Name
            </label>
            <input
              type="text"
              placeholder="Enter your organization name"
              className="w-full border border-[var(--color-secondary)] rounded-md px-3 h-[44px] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]"
            />
          </div>

          {/* Organization Email */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-black)] mb-1">
              Organization Email Address
            </label>
            <input
              type="email"
              placeholder="Enter your organization email address"
              className="w-full border border-[var(--color-secondary)] rounded-md px-3 h-[44px] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]"
            />
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-black)] mb-1">
              Your organization letter
            </label>
            <p className="text-xs text-[var(--color-gray)] mb-2">
              This will be used to approve your election request on our system.
            </p>
            <div className="w-full border-2 border-dashed border-gray-300 rounded-md flex items-center justify-center py-6 text-sm text-[var(--color-gray)] hover:bg-gray-50 transition">
              Click to upload or drag and drop<br />
              <span className="text-xs text-gray-400">PDF (max. 5MB)</span>
            </div>

            {/* Uploaded File Sample */}
            <div className="flex items-center justify-between mt-2 border border-gray-200 rounded-md p-2 text-sm">
              <span className="truncate">📄 Sample_Letter.pdf</span>
              <button type="button" className="text-[var(--color-primary)] hover:underline">
                Download
              </button>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 mt-4">
            <button
              type="button"
              className="px-4 h-[40px] border border-gray-300 rounded-md text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 h-[40px] bg-[var(--color-primary)] text-white rounded-md text-sm font-semibold hover:brightness-90"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
