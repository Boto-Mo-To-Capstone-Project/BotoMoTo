// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
// changed to edge-runtime/jose becase of edge runtime
// import { verifyToken } from '@/lib/jwt';
import { jwtVerify } from 'jose';


export async function middleware(req: NextRequest) {
  const token = req.cookies.get('token')?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  try {
    await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET));
    return NextResponse.next(); // allow request
  } catch (e) {
    console.error('Invalid token:', e);
    return NextResponse.redirect(new URL('/login', req.url));
  }
}

export const config = {
  matcher: ['/dashboard/:path*'], // apply to /dashboard and its subpaths
};
