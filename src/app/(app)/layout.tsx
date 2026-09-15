import { AppShell } from "@/components/app-shell";
import { NotificationProvider } from "@/lib/notifications-context";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <NotificationProvider>
      <AppShell>{children}</AppShell>
    </NotificationProvider>
  );
}
