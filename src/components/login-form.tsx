"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/actions";

const initialState = { error: "" };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="mb-2 block text-sm text-[#7f645b]" htmlFor="username">
          账号
        </label>
        <input
          id="username"
          name="username"
          className="w-full rounded-2xl border border-white/70 bg-white/70 px-4 py-3 outline-none ring-0 placeholder:text-[#b39a90]"
          placeholder="输入共同账号"
          required
        />
      </div>
      <div>
        <label className="mb-2 block text-sm text-[#7f645b]" htmlFor="password">
          密码
        </label>
        <input
          id="password"
          name="password"
          type="password"
          className="w-full rounded-2xl border border-white/70 bg-white/70 px-4 py-3 outline-none ring-0 placeholder:text-[#b39a90]"
          placeholder="输入密码"
          required
        />
      </div>
      {state.error ? <p className="text-sm text-[#b05d5d]">{state.error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-2xl bg-[#7f6255] px-4 py-3 text-white transition hover:bg-[#695147] disabled:opacity-60"
      >
        {pending ? "登录中..." : "进入后台"}
      </button>
    </form>
  );
}
