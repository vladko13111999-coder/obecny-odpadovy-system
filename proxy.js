import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function proxy(request) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value
        },
        set(name, value, options) {
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name, options) {
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Obnovenie session - dôležité pre autentifikáciu
  const { data: { session } } = await supabase.auth.getSession()

  // Ak chceš presmerovávať neprihlásených používateľov z chránených stránok,
  // môžeš tu pridať podmienku. Napríklad:
  // const isAuthPage = request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/register')
  // if (!session && !isAuthPage) {
  //   return NextResponse.redirect(new URL('/login', request.url))
  // }

  return response
}

// Voliteľné: konfigurácia pre matcher (ak treba)
// export const config = {
//   matcher: ['/dashboard/:path*', '/upgrade'],
// }