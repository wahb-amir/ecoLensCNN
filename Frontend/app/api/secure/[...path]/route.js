import { secureFetch } from '@/app/utils/secureFetch';
import { NextResponse } from 'next/server';

export async function GET(
  req,
  { params }
) {
  return handle(req, params.path);
}

export async function POST(
  req,
  { params }
) {
  return handle(req, params.path);
}

async function handle(req, path) {
  const url = '/' + path.join('/');
  const body =
    req.method === 'GET' ? undefined : await req.text();

  const res = await secureFetch(url, {
    method: req.method,
    body,
    headers: {
      'Content-Type': req.headers.get('content-type') ?? 'application/json',
    },
  });

  return new NextResponse(res.body, {
    status: res.status,
    headers: res.headers,
  });
}
