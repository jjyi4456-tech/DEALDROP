// Zero-dependency REST Client for Supabase
// Works out-of-the-box in standard browser / fetch environment without needing npm install

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://rmezxckwjtidxylzngpf.supabase.co';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

class SupabaseRestClient {
  constructor(url, key) {
    this.url = url.replace(/\/+$/, '');
    this.key = key;
    this.auth = new SupabaseAuth(this);
    this.functions = new SupabaseFunctions(this);
    this.storage = new SupabaseStorage(this);
  }

  getToken() {
    return this.auth.getToken() || this.key;
  }

  getHeaders(extra = {}) {
    const token = this.getToken();
    return {
      'apikey': this.key,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      ...extra
    };
  }

  from(tableName) {
    return new TableQuery(this, tableName);
  }
}

class TableQuery {
  constructor(client, table) {
    this.client = client;
    this.table = table;
    this.params = new URLSearchParams();
  }

  select(columns = '*') {
    this.params.set('select', columns);
    return this;
  }

  eq(column, value) {
    this.params.append(column, `eq.${value}`);
    return this;
  }

  neq(column, value) {
    this.params.append(column, `neq.${value}`);
    return this;
  }

  gt(column, value) {
    this.params.append(column, `gt.${value}`);
    return this;
  }

  gte(column, value) {
    this.params.append(column, `gte.${value}`);
    return this;
  }

  lt(column, value) {
    this.params.append(column, `lt.${value}`);
    return this;
  }

  lte(column, value) {
    this.params.append(column, `lte.${value}`);
    return this;
  }

  in(column, values) {
    this.params.append(column, `in.(${values.join(',')})`);
    return this;
  }

  order(column, { ascending = true } = {}) {
    this.params.append('order', `${column}.${ascending ? 'asc' : 'desc'}`);
    return this;
  }

  limit(count) {
    this.params.set('limit', count);
    return this;
  }

  async single() {
    this.params.set('limit', '1');
    const url = `${this.client.url}/rest/v1/${this.table}?${this.params.toString()}`;
    const res = await fetch(url, {
      headers: this.client.getHeaders({ 'Accept': 'application/vnd.pgrst.object+json' })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      return { data: null, error: err };
    }
    const data = await res.json();
    return { data, error: null };
  }

  async then(resolve, reject) {
    const url = `${this.client.url}/rest/v1/${this.table}?${this.params.toString()}`;
    try {
      const res = await fetch(url, { headers: this.client.getHeaders() });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        return resolve({ data: null, error: err });
      }
      const data = await res.json();
      return resolve({ data, error: null });
    } catch (err) {
      return resolve({ data: null, error: err });
    }
  }

  async insert(recordOrRecords) {
    const url = `${this.client.url}/rest/v1/${this.table}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: this.client.getHeaders(),
      body: JSON.stringify(recordOrRecords)
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { data: null, error: data };
    return { data: Array.isArray(recordOrRecords) ? data : data?.[0], error: null };
  }

  async update(patch) {
    const url = `${this.client.url}/rest/v1/${this.table}?${this.params.toString()}`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: this.client.getHeaders(),
      body: JSON.stringify(patch)
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { data: null, error: data };
    return { data, error: null };
  }

  async delete() {
    const url = `${this.client.url}/rest/v1/${this.table}?${this.params.toString()}`;
    const res = await fetch(url, {
      method: 'DELETE',
      headers: this.client.getHeaders()
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { data: null, error: data };
    return { data, error: null };
  }
}

class SupabaseAuth {
  constructor(client) {
    this.client = client;
    this.STORAGE_KEY = 'sb_session';
    this.handleUrlHash();
  }

  handleUrlHash() {
    if (typeof window === 'undefined') return;
    try {
      const hash = window.location.hash;
      if (!hash || !hash.includes('access_token=')) return;

      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const expiresIn = params.get('expires_in');
      const tokenType = params.get('token_type') || 'bearer';

      if (accessToken) {
        // Build session object
        const session = {
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_in: expiresIn ? Number(expiresIn) : 3600,
          token_type: tokenType,
          user: null
        };
        this.saveSession(session);

        // Fetch user data from Supabase Auth
        fetch(`${this.client.url}/auth/v1/user`, {
          headers: {
            'apikey': this.client.key,
            'Authorization': `Bearer ${accessToken}`
          }
        })
          .then(res => res.json())
          .then(userData => {
            if (userData && userData.id) {
              session.user = userData;
              this.saveSession(session);
              // Clean up hash from URL
              const cleanUrl = window.location.pathname + window.location.search;
              window.history.replaceState(null, '', cleanUrl);
              // Reload or trigger auth check
              window.dispatchEvent(new Event('storage'));
              window.location.reload();
            }
          })
          .catch(err => {
            console.error('[SupabaseAuth] Failed to fetch user profile:', err);
          });
      }
    } catch (e) {
      console.warn('[SupabaseAuth] Error parsing hash tokens:', e);
    }
  }

  getToken() {
    try {
      const session = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || 'null');
      return session?.access_token || null;
    } catch {
      return null;
    }
  }

  getUser() {
    try {
      const session = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || 'null');
      return session?.user || null;
    } catch {
      return null;
    }
  }

  saveSession(session) {
    if (session) {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }

  async signUp({ email, password }) {
    const res = await fetch(`${this.client.url}/auth/v1/signup`, {
      method: 'POST',
      headers: {
        'apikey': this.client.key,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) return { data: null, error: data };
    if (data.session) this.saveSession(data.session);
    return { data, error: null };
  }

  async signInWithPassword({ email, password }) {
    const res = await fetch(`${this.client.url}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'apikey': this.client.key,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) return { data: null, error: data };
    this.saveSession(data);
    return { data, error: null };
  }

  async signInWithOAuth({ provider, options = {} }) {
    const defaultRedirect = window.location.origin;
    let redirectTo = options.redirectTo || defaultRedirect;
    if (redirectTo.startsWith('/')) {
      redirectTo = `${window.location.origin}${redirectTo}`;
    }
    const authUrl = `${this.client.url}/auth/v1/authorize?provider=${provider}&redirect_to=${encodeURIComponent(redirectTo)}`;
    window.location.href = authUrl;
  }

  async signOut() {
    const token = this.getToken();
    if (token) {
      fetch(`${this.client.url}/auth/v1/logout`, {
        method: 'POST',
        headers: this.client.getHeaders()
      }).catch(() => {});
    }
    this.saveSession(null);
    return { error: null };
  }
}

class SupabaseFunctions {
  constructor(client) {
    this.client = client;
  }

  async invoke(functionName, { body = {} } = {}) {
    const res = await fetch(`${this.client.url}/functions/v1/${functionName}`, {
      method: 'POST',
      headers: this.client.getHeaders(),
      body: JSON.stringify(body)
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { data: null, error: data };
    return { data, error: null };
  }
}

class SupabaseStorage {
  constructor(client) {
    this.client = client;
  }

  from(bucket) {
    return {
      upload: async (path, file) => {
        const res = await fetch(`${this.client.url}/storage/v1/object/${bucket}/${path}`, {
          method: 'POST',
          headers: {
            ...this.client.getHeaders(),
            'Content-Type': file.type || 'application/octet-stream'
          },
          body: file
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) return { data: null, error: data };
        return { data, error: null };
      },
      getPublicUrl: (path) => ({
        data: { publicUrl: `${this.client.url}/storage/v1/object/public/${bucket}/${path}` }
      })
    };
  }
}

export const supabase = new SupabaseRestClient(SUPABASE_URL, SUPABASE_KEY);
