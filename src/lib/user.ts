import type { User } from "@/db/schema";
import type { AuthUser } from "@/app/types";

export function toAuthUser(user: User): AuthUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    countryCode: user.countryCode,
    provider: user.provider,
  };
}
