// Payload guards for server actions. Prevents pathological / abusive writes
// (multi-megabyte titles or documents) from reaching the database.

export const LIMITS = {
  title: 2_000,
  icon: 32,
  content: 2_000_000, // ~2MB of ProseMirror JSON
  tag: 60,
  cell: 20_000,
  propertyName: 200,
  email: 320,
  password: 200,
} as const;

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

/** Throws if `value` exceeds `max` characters. Returns the trimmed value. */
export function limit(value: string, max: number, field: string): string {
  if (typeof value !== "string") {
    throw new ValidationError(`${field} must be text`);
  }
  if (value.length > max) {
    throw new ValidationError(`${field} is too long (max ${max} characters)`);
  }
  return value;
}
