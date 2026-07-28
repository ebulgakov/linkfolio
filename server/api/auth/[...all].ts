export default defineEventHandler((event) => {
  const path = event.context.params?.all ?? ''
  const target = `${process.env.NEON_AUTH_BASE_URL}/${path}`

  // Nitro's dev server reports the browser-facing request as `x-forwarded-proto: http`
  // (since `pnpm dev` serves plain HTTP locally). Forwarding that verbatim makes Neon Auth's
  // edge think this hop is insecure and issue an HTTPS-upgrade redirect, which then crashes
  // Node's fetch on redirect-body replay for buffered POST bodies. This proxy call to Neon
  // always happens over HTTPS regardless of how the browser reached us, so report that instead.
  return proxyRequest(event, target, {
    fetchOptions: { headers: { 'x-forwarded-proto': 'https' } }
  })
})
