import type { User } from "@shared/schema";

export function isUnauthorizedError(error: Error): boolean {
  return /^401: .*Unauthorized/.test(error.message);
}

type UserForDisplay = Pick<User, 'id' | 'firstName' | 'lastName' | 'email'>;

/**
 * Returns a meaningful display name for a user with intelligent fallbacks
 * 1. Any available name parts (firstName and/or lastName)
 * 2. Email local part (before @) if no names are available
 * 3. User-{id prefix} as final fallback
 */
export function getDisplayName(user: UserForDisplay): string {
  // Use any available non-empty name parts
  const nameComponents = [user.firstName, user.lastName]
    .map(name => name?.trim())
    .filter(Boolean);
  
  if (nameComponents.length > 0) {
    return nameComponents.join(' ');
  }
  
  // Fall back to email local part (before @)
  if (user.email) {
    const trimmedEmail = user.email.trim();
    const emailLocalPart = trimmedEmail.split('@')[0];
    if (emailLocalPart) {
      return emailLocalPart;
    }
  }
  
  // Final fallback to User-{id prefix}
  return `User-${user.id.slice(0, 6)}`;
}