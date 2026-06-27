import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AuthForm } from "@/components/auth/AuthForm";
import { signup } from "../actions";

export default async function SignupPage() {
  if (await getSession()) redirect("/app");
  return <AuthForm mode="signup" action={signup} />;
}
