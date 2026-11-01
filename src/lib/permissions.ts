// Permission checks shared by server and client code. The UI hides what a person cannot do;
// the API checks again on every call.

import type { Permission, User } from "@/lib/types";

export function can(user: Pick<User, "permissions">, permission: Permission): boolean {
  return user.permissions.includes(permission);
}
