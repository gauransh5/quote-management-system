import { loadTenantConfig } from "@/config/tenant";
import LoginForm from "./login-form";

/**
 * Login page — server component that passes tenant config to the client form.
 */
export default async function LoginPage() {
  const tenant = await loadTenantConfig();
  return <LoginForm companyName={tenant.companyName} />;
}
