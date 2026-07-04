// Shared password policy — must match backend/auth.py PASSWORD_PATTERN:
// minimum 8 characters with at least 1 capital letter, 1 number and 1 special character.
export const PASSWORD_HINT =
  "Min 8 characters, with at least 1 capital letter, 1 number and 1 special character.";

export function validatePassword(pwd) {
  if (!pwd || pwd.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Z]/.test(pwd)) return "Password must contain at least 1 capital letter";
  if (!/\d/.test(pwd)) return "Password must contain at least 1 number";
  if (!/[^A-Za-z0-9]/.test(pwd)) return "Password must contain at least 1 special character";
  return null;
}
