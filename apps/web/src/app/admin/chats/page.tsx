"use client";

import { useState } from "react";
import { RequireAdmin } from "@/components/RequireAdmin";
import { sendBroadcast } from "@/lib/admin-broadcast";
import { emailDirectMessage, sendDirectMessage } from "@/lib/direct-messages";
import { useUser } from "@/context/UserContext";

const AUDIENCES = [
  { id: "all", label: "All" },
  { id: "customers", label: "Customers only" },
  { id: "runners", label: "Runners only" },
  { id: "cuhk", label: "CUHK only" },
  { id: "cityu", label: "CityU only" },
] as const;

export default function AdminChatsPage() {
  return (
    <RequireAdmin>
      <AdminChats />
    </RequireAdmin>
  );
}

function AdminChats() {
  const { user } = useUser();
  const [audience, setAudience] = useState<(typeof AUDIENCES)[number]["id"]>("all");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [direct, setDirect] = useState("");

  async function sendAll() {
    setSending(true);
    setError("");
    setStatus("");
    try {
      const result = await sendBroadcast({
        group: "everyone",
        subject: "Message from GraceRun",
        body: message,
        audience,
      });
      setStatus(`Sent to ${result.sent ?? result.count ?? 0} people.`);
      setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send.");
    } finally {
      setSending(false);
    }
  }

  async function sendOne() {
    if (!user?.uid) return;
    setSending(true);
    setError("");
    setStatus("");
    try {
      await sendDirectMessage({
        userId: userId.trim(),
        senderId: user.uid,
        message: direct,
      });
      if (email.trim()) {
        await emailDirectMessage({
          to: email.trim(),
          recipientName: "",
          message: direct,
        });
      }
      setStatus("1:1 message sent.");
      setDirect("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send.");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-bold">Admin messages</h1>
      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="font-semibold">Send to all users</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {AUDIENCES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setAudience(item.id)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                audience === item.id ? "bg-[#ED1C24] text-white" : "bg-gray-100"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="mt-3 min-h-28 w-full rounded-xl border px-3 py-2 text-sm"
          placeholder="Message"
        />
        <button
          type="button"
          disabled={sending || !message.trim()}
          onClick={() => void sendAll()}
          className="mt-3 rounded-full bg-[#111827] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Send to all users
        </button>
      </section>
      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="font-semibold">Message one user</h2>
        <input
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder="User id"
          className="mt-3 w-full rounded-xl border px-3 py-2 text-sm"
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email (optional)"
          className="mt-2 w-full rounded-xl border px-3 py-2 text-sm"
        />
        <textarea
          value={direct}
          onChange={(e) => setDirect(e.target.value)}
          className="mt-2 min-h-24 w-full rounded-xl border px-3 py-2 text-sm"
          placeholder="Message from GraceRun"
        />
        <button
          type="button"
          disabled={sending || !userId.trim() || !direct.trim()}
          onClick={() => void sendOne()}
          className="mt-3 rounded-full bg-[#ED1C24] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Send 1:1
        </button>
      </section>
      {status ? <p className="text-sm text-green-700">{status}</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </main>
  );
}
