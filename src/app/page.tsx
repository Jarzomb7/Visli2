import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

export const dynamic = "force-dynamic";

export default async function Home() {
  const token = cookies().get("visli_token")?.value;

  if (!token) {
    redirect("/login");
  }

  try {
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || "visli-default-jwt-secret-change-in-production-32chars!"
    );
    const { payload } = await jwtVerify(token, secret);
    const role = (payload as { role?: string }).role;

    if (role === "admin") {
      redirect("/dashboard");
    } else if (role) {
      redirect("/app/dashboard");
    } else {
      redirect("/login");
    }
  } catch {
    redirect("/login");
  }
}
