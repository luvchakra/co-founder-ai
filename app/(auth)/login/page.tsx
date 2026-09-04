import { AuthForm } from "@/components/auth/auth-form";
import { login } from "@/app/(auth)/actions";

export default function LoginPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-xl font-semibold">Sign in</h1>
      <AuthForm mode="login" action={login} />
    </main>
  );
}
