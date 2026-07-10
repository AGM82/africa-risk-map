import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="bg-background flex min-h-screen items-center justify-center p-8">
      <SignIn />
    </main>
  );
}
