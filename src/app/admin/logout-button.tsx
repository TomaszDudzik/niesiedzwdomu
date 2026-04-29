"use client";

import { useRouter } from "next/navigation";

export function AdminLogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/auth", { method: "DELETE" });
    router.replace("/admin/login");
  }

  return (
    <button
      onClick={handleLogout}
      className="text-stone-500 hover:text-red-400 transition-colors text-xs"
    >
      Wyloguj
    </button>
  );
}
