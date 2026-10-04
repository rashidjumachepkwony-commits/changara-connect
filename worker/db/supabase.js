const getSupabaseConfig = (env = {}) => ({
  url: String(env.SUPABASE_URL || '').replace(/\/+$/, ''),
  serviceRoleKey: String(env.SUPABASE_SERVICE_ROLE_KEY || '').trim(),
  storageBucket: env.SUPABASE_STORAGE_BUCKET || 'uploads'
});

const isValidSupabaseUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && Boolean(url.hostname);
  } catch {
    return false;
  }
};

export const ensureSupabaseConfigured = (env = {}) => {
  const config = getSupabaseConfig(env);
  const missing = [];

  if (!isValidSupabaseUrl(config.url)) missing.push('SUPABASE_URL');
  if (!config.serviceRoleKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');

  return { config, isConfigured: missing.length === 0, missing };
};

export const checkSupabaseConnection = async (env = {}) => {
  const { isConfigured, missing } = ensureSupabaseConfigured(env);
  const supabaseUrlConfigured = !missing.includes('SUPABASE_URL');
  const serviceRoleKeyConfigured = !missing.includes('SUPABASE_SERVICE_ROLE_KEY');
  const supabaseClientInitialized = isConfigured;

  if (!isConfigured) {
    return {
      supabaseConfigured: false,
      supabaseUrlConfigured,
      serviceRoleKeyConfigured,
      supabaseClientInitialized,
      supabaseConnectionVerified: false,
      supabaseConnectionStatus: 'configuration_missing'
    };
  }

  try {
    await supabaseRequest(env, '/rest/v1/users?select=id&limit=0');
    return {
      supabaseConfigured: true,
      supabaseUrlConfigured: true,
      serviceRoleKeyConfigured: true,
      supabaseClientInitialized: true,
      supabaseConnectionVerified: true,
      supabaseConnectionStatus: 'connected'
    };
  } catch (error) {
    const status = error instanceof SupabaseError ? error.status : 0;
    const connectionStatus = status === 401 || status === 403
      ? 'credentials_rejected'
      : status === 404
        ? 'schema_unavailable'
        : 'unreachable';
    return {
      supabaseConfigured: true,
      supabaseUrlConfigured: true,
      serviceRoleKeyConfigured: true,
      supabaseClientInitialized: true,
      supabaseConnectionVerified: false,
      supabaseConnectionStatus: connectionStatus
    };
  }
};

export class SupabaseError extends Error {
  constructor(message, status = 500, details = '') {
    super(message);
    this.name = 'SupabaseError';
    this.status = status;
    this.details = details;
  }
}

export const supabaseRequest = async (env, resourcePath, options = {}) => {
  const { config, isConfigured, missing } = ensureSupabaseConfigured(env);
  if (!isConfigured) {
    throw new SupabaseError(`Supabase configuration is missing: ${missing.join(', ')}`, 503);
  }

  const response = await fetch(`${config.url}${resourcePath.startsWith('/') ? '' : '/'}${resourcePath}`, {
    ...options,
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      ...(options.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const message = data && typeof data === 'object'
      ? data.message || data.error_description || data.error || 'Supabase request failed.'
      : 'Supabase request failed.';
    throw new SupabaseError(message, response.status, typeof data === 'string' ? data : '');
  }

  return { data, headers: response.headers, status: response.status };
};

export const restQuery = async (env, table, params = {}, options = {}) => {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) query.set(key, String(value));
  }
  const search = query.toString();
  const path = `/rest/v1/${encodeURIComponent(table)}${search ? `?${search}` : ''}`;
  const response = await supabaseRequest(env, path, options);
  const range = response.headers.get('content-range');
  const total = range && range.includes('/') && range.split('/')[1] !== '*'
    ? Number(range.split('/')[1])
    : null;

  return { rows: Array.isArray(response.data) ? response.data : response.data ? [response.data] : [], total };
};

export const uploadObject = async (env, file, prefix = 'listings') => {
  const { config, isConfigured, missing } = ensureSupabaseConfigured(env);
  if (!isConfigured) {
    throw new SupabaseError(`Supabase configuration is missing: ${missing.join(', ')}`, 503);
  }

  const extensionByMimeType = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'audio/mpeg': 'mp3',
    'audio/mp4': 'm4a',
    'audio/aac': 'aac',
    'audio/wav': 'wav',
    'audio/x-wav': 'wav',
    'audio/ogg': 'ogg',
    'audio/webm': 'webm',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/quicktime': 'mov'
  };
  const extension = extensionByMimeType[file.type] || 'bin';
  const safePrefix = String(prefix).replace(/[^a-z0-9/_-]/gi, '-');
  const objectPath = `${safePrefix}/${crypto.randomUUID()}.${extension.toLowerCase()}`;
  const response = await supabaseRequest(
    env,
    `/storage/v1/object/${encodeURIComponent(config.storageBucket)}/${objectPath.split('/').map(encodeURIComponent).join('/')}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
        'x-upsert': 'false'
      },
      body: file
    }
  );

  return {
    path: objectPath,
    url: `${config.url}/storage/v1/object/public/${encodeURIComponent(config.storageBucket)}/${objectPath.split('/').map(encodeURIComponent).join('/')}`,
    response: response.data
  };
};
