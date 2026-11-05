// 라우터·QueryClient·전역 Provider (wireframe 0장 라우트).
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { BrowserRouter, MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import { ApiError, setUnauthorizedHandler } from "@/api/client";
import { ToastProvider, useToast } from "@/components/base/Toast";
import { AppShell } from "@/components/layout/AppShell";
import { RequireAuth } from "@/components/layout/RequireAuth";
import { GuestOnly, NotFoundRedirect } from "@/components/layout/RouteFallback";
import { CurrentPetProvider } from "@/state/currentPet";
import { SettingsProvider } from "@/state/settings";
import Licenses from "@/pages/Licenses";
import StyleGuide from "@/pages/StyleGuide";
import W01Login from "@/pages/W01Login";
import W02Signup from "@/pages/W02Signup";
import W03PetForm from "@/pages/W03PetForm";
import W04Pets from "@/pages/W04Pets";
import W05Dashboard from "@/pages/W05Dashboard";
import W07Health from "@/pages/W07Health";
import W08Weights from "@/pages/W08Weights";
import W09Chat from "@/pages/W09Chat";
import W10History from "@/pages/W10History";
import W11Preferences from "@/pages/W11Preferences";
import W12Me from "@/pages/W12Me";

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // 4xx는 다시 시도해도 같으므로 재시도하지 않는다
        retry: (n, err) => !(err instanceof ApiError && err.status >= 400 && err.status < 500) && n < 1,
        staleTime: 30_000,
        refetchOnWindowFocus: false,
      },
    },
  });
}

/** 401 전역 처리: 캐시를 비우고 로그인으로 보낸다 (W00) */
function UnauthorizedBridge({ client }: { client: QueryClient }) {
  const navigate = useNavigate();
  const toast = useToast();
  useEffect(() => {
    setUnauthorizedHandler(() => {
      client.clear();
      toast("다시 로그인해 주세요", { tone: "error" });
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      navigate(`/login?next=${next}`, { replace: true });
    });
  }, [client, navigate, toast]);
  return null;
}

function Protected({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <CurrentPetProvider>
        <AppShell>{children}</AppShell>
      </CurrentPetProvider>
    </RequireAuth>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      {/* 리다이렉트(폴백) 규칙: wireframe.md 0장 */}
      <Route
        path="/login"
        element={
          <GuestOnly>
            <W01Login />
          </GuestOnly>
        }
      />
      <Route
        path="/signup"
        element={
          <GuestOnly>
            <W02Signup />
          </GuestOnly>
        }
      />
      <Route
        path="/"
        element={
          <Protected>
            <W05Dashboard />
          </Protected>
        }
      />
      <Route
        path="/pets"
        element={
          <Protected>
            <W04Pets />
          </Protected>
        }
      />
      <Route
        path="/pets/new"
        element={
          <Protected>
            <W03PetForm />
          </Protected>
        }
      />
      <Route
        path="/pets/:id/edit"
        element={
          <Protected>
            <W03PetForm />
          </Protected>
        }
      />
      <Route
        path="/health"
        element={
          <Protected>
            <W07Health />
          </Protected>
        }
      />
      <Route
        path="/weights"
        element={
          <Protected>
            <W08Weights />
          </Protected>
        }
      />
      <Route
        path="/chat"
        element={
          <Protected>
            <W09Chat />
          </Protected>
        }
      />
      <Route
        path="/chat/history"
        element={
          <Protected>
            <W10History />
          </Protected>
        }
      />
      <Route
        path="/chat/:threadId"
        element={
          <Protected>
            <W09Chat />
          </Protected>
        }
      />
      <Route
        path="/preferences"
        element={
          <Protected>
            <W11Preferences />
          </Protected>
        }
      />
      <Route
        path="/me"
        element={
          <Protected>
            <W12Me />
          </Protected>
        }
      />
      <Route
        path="/licenses"
        element={
          <Protected>
            <Licenses />
          </Protected>
        }
      />
      {import.meta.env.DEV && <Route path="/_styleguide" element={<StyleGuide />} />}
      <Route path="*" element={<NotFoundRedirect />} />
    </Routes>
  );
}

export function Providers({
  children,
  client,
  initialPath,
}: {
  children: ReactNode;
  client?: QueryClient;
  initialPath?: string;
}) {
  const [qc] = useState(() => client ?? makeQueryClient());
  const Router = initialPath ? MemoryRouter : BrowserRouter;
  const routerProps = initialPath ? { initialEntries: [initialPath] } : {};
  return (
    <QueryClientProvider client={qc}>
      <SettingsProvider>
        <Router {...routerProps}>
          <ToastProvider>
            <UnauthorizedBridge client={qc} />
            {children}
          </ToastProvider>
        </Router>
      </SettingsProvider>
    </QueryClientProvider>
  );
}

export default function App() {
  return (
    <Providers>
      <AppRoutes />
    </Providers>
  );
}
