import type { AuthUser } from "@/context/AuthContext";

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toString(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  return null;
}

export function buildAuthUserProfile(
  payload: unknown,
  fallbacks?: { email?: string; fullName?: string; userId?: unknown }
): AuthUser | null {
  const record =
    payload && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : {};

  const idCandidate =
    record.id ??
    record.user_id ??
    record.userId ??
    fallbacks?.userId ??
    null;
  const id = toNumber(idCandidate);

  const firstName =
    toString(record.first_name) ?? toString(record.firstName) ?? null;
  const lastName =
    toString(record.last_name) ?? toString(record.lastName) ?? null;

  const email =
    toString(record.email) ?? toString(fallbacks?.email) ?? null;

  const explicitFullName =
    toString(record.full_name) ??
    toString(record.fullName) ??
    toString(fallbacks?.fullName);

  const nameFromParts = [firstName, lastName]
    .filter((part): part is string => Boolean(part))
    .join(" ");

  const joinedFullName =
    explicitFullName ?? (nameFromParts.length > 0 ? nameFromParts : null);

  if (
    id === null &&
    email === null &&
    joinedFullName === null &&
    firstName === null &&
    lastName === null
  ) {
    return null;
  }

  return {
    id,
    email,
    firstName,
    lastName,
    fullName: joinedFullName,
  };
}
