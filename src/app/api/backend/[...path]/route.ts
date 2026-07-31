import { NextRequest, NextResponse } from "next/server";
import { getValidAccessToken } from "@/lib/auth/token";

export const runtime = "nodejs";

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL ?? "http://localhost:5000";

/**
 * Same-origin proxy: the browser never learns the backend's real address or
 * attaches a bearer token itself — this route reads the session cookie
 * server-side and forwards a real Keycloak access token to the NestJS API.
 */
async function proxy(req: NextRequest, path: string[]): Promise<NextResponse> {
  const accessToken = await getValidAccessToken();

  const targetUrl = new URL(`${BACKEND_URL}/${path.join("/")}`);
  targetUrl.search = req.nextUrl.search;

  const headers = new Headers();
  const contentType = req.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  if (accessToken) headers.set("authorization", `Bearer ${accessToken}`);

  const hasBody = req.method !== "GET" && req.method !== "HEAD";

  const backendResponse = await fetch(targetUrl, {
    method: req.method,
    headers,
    body: hasBody ? await req.arrayBuffer() : undefined,
    cache: "no-store",
  });

  const responseHeaders = new Headers(backendResponse.headers);
  // Body is already decoded/re-chunked by fetch — let Next re-derive these.
  responseHeaders.delete("content-encoding");
  responseHeaders.delete("transfer-encoding");
  responseHeaders.delete("connection");

  return new NextResponse(backendResponse.body, {
    status: backendResponse.status,
    headers: responseHeaders,
  });
}

type RouteContext = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, { params }: RouteContext) {
  return proxy(req, (await params).path);
}
export async function POST(req: NextRequest, { params }: RouteContext) {
  return proxy(req, (await params).path);
}
export async function PUT(req: NextRequest, { params }: RouteContext) {
  return proxy(req, (await params).path);
}
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  return proxy(req, (await params).path);
}
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  return proxy(req, (await params).path);
}
