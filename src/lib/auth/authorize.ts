import "server-only";
import { currentUser } from "./session";

export async function requireAdminUser() {
  const user = await currentUser();
  return user?.role === "admin" ? user : null;
}
