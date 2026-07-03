import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ForgotForm } from "@/components/auth/ForgotForm";

export default async function ForgotPage() {
  if (await getSession()) redirect("/app");
  return <ForgotForm />;
}
