export default function CheckEmailPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-xl font-semibold">Check your email</h1>
      <p className="max-w-sm text-muted-foreground">
        We&apos;ve sent you a confirmation link. Click it to finish creating your account,
        then sign in.
      </p>
    </main>
  );
}
