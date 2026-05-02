import { AuthForm } from "@/components/AuthForm";
import { isGoogleEnabled } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default function RegisterPage() {
  return <AuthForm mode="register" googleEnabled={isGoogleEnabled} />;
}
