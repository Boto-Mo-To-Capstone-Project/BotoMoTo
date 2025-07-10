// components/RememberMeAndForgotPassword.tsx
export function RememberMeAndForgotPassword() {
  return (
    <div className="w-[380px] flex items-center justify-between text-sm">
      <label className="flex items-center gap-2">
        <input type="checkbox" className="form-checkbox border-gray-300 rounded" />
        <span className="text-[var(--color-black)]">Remember for 30 days</span>
      </label>
      <a href="#" className="text-[var(--color-primary)] hover:underline font-medium">
        Forgot password
      </a>
    </div>
  );
}