import { useAuth } from '~/shared/api/use-auth'

export default defineNuxtRouteMiddleware(async () => {
  const { data: session } = await useAuth().getSession()
  if (session) {
    return navigateTo('/')
  }
})
