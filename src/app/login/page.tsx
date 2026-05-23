import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-zinc-900">Aussie Organizer</h1>
          <p className="text-sm text-zinc-500 mt-1">Sign in to continue</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
