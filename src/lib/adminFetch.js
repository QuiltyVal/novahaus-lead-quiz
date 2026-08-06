'use client'

// A tab left open across a deploy still holds the old page but no current
// session. Its next request comes back 401, and showing that as text strands
// the operator on a screen whose buttons all fail. Sending them to the login
// page is the only useful answer, so it happens here rather than in every
// caller.
export async function adminFetch(input, init) {
  const response = await fetch(input, init)

  if (response.status === 401) {
    window.location.assign('/admin/login')
    // Never resolves: the page is navigating away, and a caller that kept
    // rendering would flash an error the operator cannot act on.
    await new Promise(() => {})
  }

  return response
}
