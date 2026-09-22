export function getClientIP(request: Request): string {
  const headers = request.headers;

  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIP = headers.get('x-real-ip');
  if (realIP) return realIP.trim();

  const cfConnecting = headers.get('cf-connecting-ip');
  if (cfConnecting) return cfConnecting.trim();

  return 'unknown';
}
