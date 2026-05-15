import { redirect } from "next/navigation";

// (app)/page.tsx resolves to "/" — redirect to /home to avoid conflict with app/page.tsx
export default function AppRootPage() {
  redirect("/home");
}
