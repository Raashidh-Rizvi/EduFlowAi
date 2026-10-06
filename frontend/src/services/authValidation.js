export const AUTH_MESSAGES = {
  name: 'Full name must be between 2 and 200 characters.',
  email: 'Enter a valid email address of at most 254 characters.',
  password: 'Password must be at least 8 characters, include uppercase, lowercase, a number and a special character, and be at most 72 UTF-8 bytes.',
  loginPassword: 'Password is required and must be at most 72 UTF-8 bytes.',
  confirmation: 'Passwords must match.',
};
export const normalizeEmail = email => email.trim().toLowerCase();
export function validateAuthentication({ fullName = '', email = '', password = '', confirmPassword = '' }, registering) {
  if (registering && (fullName.trim().length < 2 || fullName.trim().length > 200)) return AUTH_MESSAGES.name;
  const normalized = normalizeEmail(email);
  if (normalized.length > 254 || !/^[A-Za-z0-9!#$%&'*+\/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+\/=?^_`{|}~-]+)*@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/.test(normalized)) return AUTH_MESSAGES.email;
  const validPassword = password.trim().length > 0 && new TextEncoder().encode(password).length <= 72 && !password.includes('\0');
  if (registering && (!validPassword || password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9\s]/.test(password))) return AUTH_MESSAGES.password;
  if (!validPassword) return AUTH_MESSAGES.loginPassword;
  if (registering && (!confirmPassword || password !== confirmPassword)) return AUTH_MESSAGES.confirmation;
  return null;
}
