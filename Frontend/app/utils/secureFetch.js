import { cookies } from 'next/headers';
import { jwtDecode } from 'jwt-decode';

const API_BASE_URL = 'https://api.blogever.buttnetworks.com';

function isTokenExpiring(token, threshold = 60) {
  if (!token) return true;
  try {
    const { exp } = jwtDecode<{ exp: number }>(token);
    const now = Math.floor(Date.now() / 1000);
    return exp - now < threshold;
  } catch {
    return true;
  }
}

async function refreshAccessToken(refreshToken) {
  const res = await fetch(`${API_BASE_URL}/api/authrefresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
    cache: 'no-store',
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data.accessToken ;
}

export async function secureFetch(
  endpoint,
  options = {}
) {
  const cookieStore = cookies();

  let accessToken = cookieStore.get('accessToken')?.value;
  const refreshToken = cookieStore.get('refreshToken')?.value;

  if (!accessToken || isTokenExpiring(accessToken)) {
    if (!refreshToken) {
      throw new Error('Not authenticated');
    }

    const newAccessToken = await refreshAccessToken(refreshToken);

    if (!newAccessToken) {
      cookieStore.delete('accessToken');
      cookieStore.delete('refreshToken');
      throw new Error('Session expired');
    }

    cookieStore.set('accessToken', newAccessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
    });

    accessToken = newAccessToken;
  }

  return fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });
}
