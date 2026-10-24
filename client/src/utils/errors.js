export function getErrorMessage(err, fallback = 'Something went wrong. Please try again.') {
  if (err?.response) return err.response.data?.error?.message || fallback;
  if (err?.code === 'ECONNABORTED') return 'The request timed out. Please try again.';
  if (err?.request) return 'Cannot reach the server. Check your connection and try again.';
  return fallback;
}

// Maps server-side validation details to { fieldName: message }.
export function getFieldErrors(err) {
  const details = err?.response?.data?.error?.details;
  if (!Array.isArray(details)) return {};
  return Object.fromEntries(details.map((d) => [d.field, d.message]));
}
