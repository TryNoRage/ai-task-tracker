import { AuthForm } from "@/components/AuthForm";
import { isGoogleEnabled } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return <AuthForm mode="login" googleEnabled={isGoogleEnabled} />;
}
