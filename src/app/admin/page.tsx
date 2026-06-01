import { AdminDashboard } from "@/components/admin-dashboard";
import { LoginForm } from "@/components/login-form";
import { getSession } from "@/lib/auth";
import { loadSiteData } from "@/lib/site-data";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getSession();

  if (!session) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-12">
        <div className="glass-card w-full max-w-md rounded-[2rem] px-6 py-7">
          <p className="text-xs uppercase tracking-[0.35em] text-[#b98d7b]">Admin login</p>
          <h1 className="mt-3 text-3xl font-semibold text-[#4d3e39]">进入后台</h1>
          <p className="mt-2 text-sm leading-7 text-[#7a6258]">
            用固定账号密码登录后，就可以直接在网站里添加照片、日记、时间轴和地点。
          </p>
          <div className="mt-6">
            <LoginForm />
          </div>
        </div>
      </main>
    );
  }

  const data = await loadSiteData();
  return <AdminDashboard data={data} username={session.username} />;
}
