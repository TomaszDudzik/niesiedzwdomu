import { NextRequest, NextResponse } from "next/server";

function unauthorizedResponse(isApiRoute: boolean) {
  const challenge = 'Basic realm="Admin Portal", charset="UTF-8"';

  if (isApiRoute) {
    return NextResponse.json(
      { error: "Unauthorized admin access." },
      {
        status: 401,
        headers: { "WWW-Authenticate": challenge },
      },
    );
  }

  return new NextResponse("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": challenge },
  });
}

function configErrorResponse(isApiRoute: boolean) {
  if (isApiRoute) {
    return NextResponse.json(
      {
        error: "Admin auth is not configured. Set ADMIN_BASIC_AUTH_USER and ADMIN_BASIC_AUTH_PASS.",
      },
      { status: 503 },
    );
  }

  return new NextResponse("Admin auth is not configured.", { status: 503 });
}

function isValidBasicAuth(request: NextRequest, expectedUser: string, expectedPass: string) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Basic ")) {
    return false;
  }

  const base64Credentials = authHeader.slice(6).trim();
  if (!base64Credentials) {
    return false;
  }

  let decoded = "";
  try {
    decoded = atob(base64Credentials);
  } catch {
    return false;
  }

  const separatorIndex = decoded.indexOf(":");
  if (separatorIndex < 0) {
    return false;
  }

  const user = decoded.slice(0, separatorIndex);
  const pass = decoded.slice(separatorIndex + 1);

  return user === expectedUser && pass === expectedPass;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAdminPage = pathname.startsWith("/admin");
  const isAdminApi = pathname.startsWith("/api/admin");

  if (!isAdminPage && !isAdminApi) {
    return NextResponse.next();
  }

  const internalToken = process.env.ADMIN_INTERNAL_API_TOKEN?.trim();
  if (isAdminApi && internalToken) {
    const incomingInternalToken = request.headers.get("x-internal-admin-token")?.trim();
    if (incomingInternalToken && incomingInternalToken === internalToken) {
      return NextResponse.next();
    }
  }

  const basicUser = process.env.ADMIN_BASIC_AUTH_USER?.trim();
  const basicPass = process.env.ADMIN_BASIC_AUTH_PASS?.trim();

  if (!basicUser || !basicPass) {
    return configErrorResponse(isAdminApi);
  }

  if (!isValidBasicAuth(request, basicUser, basicPass)) {
    return unauthorizedResponse(isAdminApi);
  }

  return NextResponse.next();
}

export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
