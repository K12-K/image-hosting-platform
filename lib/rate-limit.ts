import { supabaseAdmin } from './supabase-server';
import { config } from './config';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  error?: string;
}

export async function checkRateLimit(ip: string): Promise<RateLimitResult> {
  const windowMs = config.rateLimitWindowMinutes * 60 * 1000;
  const windowStart = new Date(Date.now() - windowMs);
  const dayStart = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const { count: windowCount } = await supabaseAdmin
    .from('rate_limits')
    .select('*', { count: 'exact', head: true })
    .eq('ip', ip)
    .eq('request_type', 'upload')
    .gte('created_at', windowStart.toISOString())
    .then(({ count, error }) => ({ count: count || 0, error }));

  if (windowCount >= config.rateLimitMaxRequests) {
    return {
      allowed: false,
      remaining: 0,
      error: `Rate limit exceeded. Max ${config.rateLimitMaxRequests} uploads per ${config.rateLimitWindowMinutes} minutes.`,
    };
  }

  const { count: dayCount } = await supabaseAdmin
    .from('rate_limits')
    .select('*', { count: 'exact', head: true })
    .eq('ip', ip)
    .eq('request_type', 'upload')
    .gte('created_at', dayStart.toISOString())
    .then(({ count, error }) => ({ count: count || 0, error }));

  if (dayCount >= config.dailyUploadLimit) {
    return {
      allowed: false,
      remaining: 0,
      error: `Daily upload limit (${config.dailyUploadLimit}) exceeded.`,
    };
  }

  return {
    allowed: true,
    remaining: config.rateLimitMaxRequests - windowCount,
  };
}

export async function recordUpload(ip: string): Promise<void> {
  await supabaseAdmin.from('rate_limits').insert({
    ip,
    request_type: 'upload',
  });
}

export async function cleanupOldRateLimits(): Promise<number> {
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const { data, error } = await supabaseAdmin
    .from('rate_limits')
    .delete()
    .lt('created_at', cutoff.toISOString())
    .select('id');

  return data?.length || 0;
}
