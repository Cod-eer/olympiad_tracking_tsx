import { auth, clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server';
import path from 'path';


const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/backend(.*)",
  "/result(.*)",
  "/api(.*)",
  "/olympiad_hub(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  const { userId } = await auth();
  const { pathname } = request.nextUrl;

  if (pathname === "/" && userId) {
    // redirect to dashboard if authorized
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});



export const config = {
  matcher: [
    // skipping Next.js files
    "/((?!_next|.*\\..*).*)",
    "/",
  ],
}