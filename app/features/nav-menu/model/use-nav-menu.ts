import { useAuth } from "~/shared/api";

export async function useNavMenu() {
  const authClient = useAuth();

  const { data: session } = await authClient.useSession((url, opts) =>
    useFetch(url, {
      ...opts,
      key: "auth-session",
      headers: import.meta.server ? useRequestHeaders(["cookie"]) : undefined
    })
  );
  return { session };
}
