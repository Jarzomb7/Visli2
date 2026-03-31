"use client";

import { useEffect, useState } from "react";

type Plan = {
  id: number;
  name: string;
  description: string | null;
  priceMonthly: number;
  stripePriceId: string;
};

type Subscription = {
  id: number;
  status: string;
  plan: string;
};

export default function Page() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");

  useEffect(() => {
    const loadData = async () => {
      const [subsData, meData] = await Promise.all([
        fetch("/api/client/subscriptions").then((res) => res.json()),
        fetch("/api/auth/me").then((res) => res.json()),
      ]);

      setPlans(subsData.plans || []);
      setSubs(subsData.subscriptions || []);
      setEmail(meData.user?.email || "");
      setLoading(false);
    };

    loadData().catch(() => setLoading(false));
  }, []);

  const buyPlan = async (planId: number) => {
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId, email }),
    });

    const data = await res.json();
    if (data.url) window.location.href = data.url;
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Subskrypcja</h1>
      {subs.length > 0 && <p>Aktywne subskrypcje: {subs.length}</p>}
      {plans.length === 0 && <p>Brak planów</p>}
      {plans.map((plan) => (
        <div key={plan.id}>
          <h2>{plan.name}</h2>
          <p>{plan.priceMonthly} zł / msc</p>
          <button onClick={() => buyPlan(plan.id)}>Kup</button>
        </div>
      ))}
    </div>
  );
}
