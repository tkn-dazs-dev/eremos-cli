import { Command } from 'commander';
import { apiCall, requireAuth } from '../api/client.js';
import { ApiError, withErrorHandler } from '../utils/errors.js';
import { printJson, printKeyValue, type FieldDef } from '../utils/output.js';
import { safePathSegment } from '../utils/sanitize.js';

const profileFields: FieldDef[] = [
  { key: 'id', label: 'ID' },
  { key: 'handle', label: 'Handle', transform: (v) => `@${v}` },
  { key: 'name', label: 'Name' },
  { key: 'bio', label: 'Bio' },
  { key: 'avatar_url', label: 'Avatar' },
  { key: 'website', label: 'Website' },
  { key: 'role', label: 'Role' },
  { key: 'is_admin', label: 'Admin', transform: (v) => (v ? 'Yes' : 'No') },
  { key: 'onboarded_at', label: 'Onboarded' },
  { key: 'created_at', label: 'Created' },
  { key: 'updated_at', label: 'Updated' },
];

const metaFields: FieldDef[] = [
  { key: 'email', label: 'Email' },
  { key: 'source', label: 'Source' },
];

type MeSource = 'users_me' | 'users_get_fallback';

export type MeData = {
  profile: Record<string, unknown>;
  email: string | null;
  source: MeSource;
  warnings?: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  const parts = token.split('.');
  if (parts.length < 2) return {};
  try {
    const decoded = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8')) as unknown;
    return isRecord(decoded) ? decoded : {};
  } catch {
    return {};
  }
}

function normalizeProfile(raw: Record<string, unknown>): Record<string, unknown> {
  const role = asString(raw.role);
  const isAdminRaw = raw.is_admin;
  const isAdmin =
    typeof isAdminRaw === 'boolean'
      ? isAdminRaw
      : role === 'admin'
        ? true
        : undefined;

  return {
    id: asString(raw.id),
    handle: asString(raw.handle),
    name: asString(raw.name) ?? asString(raw.display_name),
    bio: asString(raw.bio),
    avatar_url: asString(raw.avatar_url),
    website: asString(raw.website) ?? asString(raw.website_url),
    role,
    is_admin: isAdmin,
    onboarded_at: asString(raw.onboarded_at),
    created_at: asString(raw.created_at),
    updated_at: asString(raw.updated_at),
  };
}

function asProfileObject(data: Record<string, unknown>): Record<string, unknown> | null {
  if ('profile' in data && isRecord(data.profile)) return data.profile;
  return data;
}

function getEmail(data: Record<string, unknown>, tokenPayload: Record<string, unknown>): string | null {
  const apiEmail = asString(data.email);
  if (apiEmail) return apiEmail;
  const jwtEmail = asString(tokenPayload.email);
  return jwtEmail ?? null;
}

async function resolveFallbackProfile(
  tokenPayload: Record<string, unknown>,
  email: string | null,
  reason: string,
): Promise<MeData> {
  const userId = asString(tokenPayload.sub);
  if (!userId) {
    throw new Error('Unable to resolve current user ID from access token for `me` fallback.');
  }

  const fallback = await apiCall<Record<string, unknown>>(`/api/users/${safePathSegment(userId, 'User ID')}`);
  return {
    profile: normalizeProfile(fallback.data),
    email,
    source: 'users_get_fallback',
    warnings: [`/api/users/me was unavailable (${reason}); fell back to /api/users/{id}.`],
  };
}

export async function resolveMeData(accessToken: string): Promise<MeData> {
  const tokenPayload = decodeJwtPayload(accessToken);

  try {
    const result = await apiCall<Record<string, unknown>>('/api/users/me');
    const data = result.data;
    const email = getEmail(data, tokenPayload);
    const profile = asProfileObject(data);

    if (!profile) {
      throw new Error('Invalid /api/users/me response: profile object is missing.');
    }

    const embeddedError = asString(profile.error);
    if (embeddedError === 'OAUTH_NOT_ALLOWED') {
      return resolveFallbackProfile(tokenPayload, email, embeddedError);
    }
    if (embeddedError) {
      throw new Error(`/api/users/me returned profile error: ${embeddedError}`);
    }

    return {
      profile: normalizeProfile(profile),
      email,
      source: 'users_me',
    };
  } catch (err) {
    if (err instanceof ApiError && err.error.code === 'OAUTH_NOT_ALLOWED') {
      return resolveFallbackProfile(tokenPayload, asString(tokenPayload.email) ?? null, err.error.code);
    }
    throw err;
  }
}

export const meCommand = new Command('me')
  .description('Show current user profile (with OAuth-safe fallback)')
  .option('--show-email', 'Show email (may be sensitive)')
  .action(
    withErrorHandler(async (opts: { showEmail?: boolean }, cmd) => {
      const token = await requireAuth();
      const json = cmd.parent?.opts().json;
      const showEmail = opts.showEmail ?? false;
      const me = await resolveMeData(token);

      if (json) {
        const output = showEmail ? me : { ...me, email: undefined };
        printJson({ data: output });
      } else {
        printKeyValue(me.profile, profileFields);
        const visibleMetaFields = showEmail ? metaFields : metaFields.filter((field) => field.key !== 'email');
        printKeyValue(me, visibleMetaFields);
      }
    }),
  );
