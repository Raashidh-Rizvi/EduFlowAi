import { AUTH_MESSAGES } from './authValidation';

// Only known authentication/validation messages may be displayed verbatim.
const safeMessages = new Set([
  ...Object.values(AUTH_MESSAGES),
  'Your account is inactive. Contact an administrator.',
  'Invalid email or password.',
  'This user account is inactive.',
  'Public registration only allows Student accounts.',
  'Full name is required and must be at most 200 characters.',
  'A valid email address is required.',
  'Password must be at least 8 characters and at most 72 UTF-8 bytes.',
  'A user with this email address already exists.',
]);

export function getAuthenticationErrorMessage(error) {
  const status = error?.response?.status;
  const message = error?.response?.data?.message;
  const validation = Object.values(error?.response?.data?.errors || {}).flat().filter(value => safeMessages.has(value));
  if ((status === 400 || status === 422) && validation.length) return [...new Set(validation)].join(' ');
  if (!status || status >= 500) {
    return 'Authentication service unavailable. We cannot reach the API. Please try again later.';
  }
  if ((status === 400 || status === 401) && safeMessages.has(message)) return message;
  if (status === 401) return 'Invalid email or password.';
  if (status === 400 || status === 422) return 'Please check your name, email and password and try again.';
  if (status === 429) return 'Too many authentication attempts. Please try again later.';
  if (status === 403) return 'You do not have permission to sign in to this service.';
  return 'Authentication could not be completed. Please try again later.';
}
