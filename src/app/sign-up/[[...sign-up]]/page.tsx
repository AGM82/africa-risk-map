import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="bg-background flex min-h-screen items-center justify-center p-8">
      <SignUp />
    </main>
  );
}
