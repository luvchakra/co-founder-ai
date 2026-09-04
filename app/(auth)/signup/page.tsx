import { AuthForm } from "@/components/auth/auth-form";
import { signup } from "@/app/(auth)/actions";

export default function SignupPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-xl font-semibold">Create your account</h1>
      <AuthForm mode="signup" action={signup} />
    </main>
  );
}
