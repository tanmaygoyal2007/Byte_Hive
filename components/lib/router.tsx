"use client";

import Link from "next/link";
import {
  useParams as useNextParams,
  usePathname,
  useRouter,
  useSearchParams as useNextSearchParams,
} from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ComponentProps } from "react";

const NAV_STATE_KEY = "__bytehive_nav_state__";

type NavigateOptions = {
  replace?: boolean;
  state?: unknown;
};

function getCurrentHash() {
  return typeof window === "undefined" ? "" : window.location.hash;
}

function getCurrentSearch() {
  return typeof window === "undefined" ? "" : window.location.search;
}

function getStateStorageKey(href: string) {
  return `${NAV_STATE_KEY}:${href}`;
}

function normalizeHref(href: string) {
  if (!href) return "/";
  return href.startsWith("/") ? href : `/${href}`;
}

function readStoredState(href: string) {
  if (typeof window === "undefined") return null;

  try {
    const stored = window.sessionStorage.getItem(getStateStorageKey(href));
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function writeStoredState(href: string, state: unknown) {
  if (typeof window === "undefined") return;

  try {
    if (state === undefined) {
      window.sessionStorage.removeItem(getStateStorageKey(href));
      return;
    }

    window.sessionStorage.setItem(getStateStorageKey(href), JSON.stringify(state));
  } catch {
  }
}

export function useNavigate() {
  const router = useRouter();

  return useCallback((href: string, options?: NavigateOptions) => {
    const nextHref = normalizeHref(href);
    writeStoredState(nextHref, options?.state);

    if (options?.replace) {
      router.replace(nextHref);
      return;
    }

    router.push(nextHref);
  }, [router]);
}

export function useParams<T extends Record<string, string | string[]>>() {
  return useNextParams<T>();
}

export function useSearchParams() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useNextSearchParams();

  const setSearchParams = (
    next:
      | URLSearchParams
      | string
      | Record<string, string | number | boolean | null | undefined>,
    options?: { replace?: boolean }
  ) => {
    const searchParams =
      typeof next === "string"
        ? new URLSearchParams(next)
        : next instanceof URLSearchParams
          ? next
          : new URLSearchParams(
              Object.entries(next).flatMap(([key, value]) => (
                value === undefined || value === null ? [] : [[key, String(value)]]
              ))
            );

    const query = searchParams.toString();
    const href = query ? `${pathname}?${query}` : pathname;

    if (options?.replace) {
      router.replace(href);
      return;
    }

    router.push(href);
  };

  return [params, setSearchParams] as const;
}

export function useLocation() {
  const pathname = usePathname();
  const [hash, setHash] = useState(getCurrentHash());
  const [search, setSearch] = useState(getCurrentSearch());

  useEffect(() => {
    const syncLocation = () => {
      setHash(getCurrentHash());
      setSearch(getCurrentSearch());
    };

    syncLocation();
    window.addEventListener("hashchange", syncLocation);
    window.addEventListener("popstate", syncLocation);
    return () => {
      window.removeEventListener("hashchange", syncLocation);
      window.removeEventListener("popstate", syncLocation);
    };
  }, [pathname]);

  return useMemo(
    () => ({
      pathname,
      search,
      hash,
      state: readStoredState(`${pathname}${search}${hash}`) ?? readStoredState(`${pathname}${search}`),
    }),
    [hash, pathname, search]
  );
}

type LinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  to: string;
};

export function RouterLink({ to, replace, scroll, prefetch, ...props }: LinkProps) {
  return <Link href={to} replace={replace} scroll={scroll} prefetch={prefetch} {...props} />;
}

export { RouterLink as Link };
