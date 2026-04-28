import Link from "next/link";
import { AuthForm } from "@/components/auth-form";

export default function LoginPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-3">
        <AuthForm mode="login" />
        <p className="text-center text-sm text-[var(--muted)]">
          Need an account? <Link className="font-semibold text-[var(--brand)]" href="/signup">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
