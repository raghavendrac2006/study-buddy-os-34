import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ensureSession } from "@/lib/device-session";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  // Personal single-user app: no login screen. The workspace opens itself.
  beforeLoad: async () => {
    await ensureSession();
  },
  component: () => <Outlet />,
});
