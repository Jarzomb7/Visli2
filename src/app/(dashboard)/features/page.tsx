"use client";

import { useEffect, useState } from "react";

interface Feature {
  id: number;
  code: string;
  name: string;
  description: string | null;
  category: string | null;
}

interface PlanFeatureRow {
  plan: string;
  product: string | null;
  featureCode: string;
}

const PRODUCTS = ["BOOKING_SYSTEM", "CHATBOT_AI"];
const PLANS = ["basic", "pro"];

const productLabels: Record<string, string> = {
  BOOKING_SYSTEM: "Booking System",
  CHATBOT_AI: "Chatbot AI",
};

const categoryColors: Record<string, string> = {
  booking: "bg-blue-500/10 text-blue-400",
  chatbot: "bg-violet-500/10 text-violet-400",
  analytics: "bg-amber-500/10 text-amber-400",
  general: "bg-white/[0.06] text-white/50",
};

export default function FeaturesPage() {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [planFeatures, setPlanFeatures] = useState<PlanFeatureRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeProduct, setActiveProduct] = useState(PRODUCTS[0]);

  useEffect(() => {
    fetch("/api/features")
      .then((r) => r.json())
      .then((d) => {
        setFeatures(d.features || []);
        setPlanFeatures(d.planFeatures || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const hasFeature = (product: string, plan: string, featureCode: string) => {
    return planFeatures.some(
      (pf) => pf.product === product && pf.plan === plan && pf.featureCode === featureCode
    );
  };

  const productFeatures = features.filter((f) => {
    return planFeatures.some(
      (pf) => pf.product === activeProduct && pf.featureCode === f.code
    );
  });

  // Group by category
  const categories = Array.from(new Set(productFeatures.map((f) => f.category || "general")));

  if (loading) {
    return (
      <div className="animate-fade-in pt-8 lg:pt-0">
        <div className="h-8 w-48 rounded-lg bg-white/[0.06] animate-pulse mb-8" />
        <div className="glass-card h-96 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-8 pt-8 lg:pt-0">
        <h1 className="font-display text-2xl font-bold tracking-tight text-white">Features</h1>
        <p className="mt-1 text-sm text-white/40">Feature access per plan and product</p>
      </div>

      {/* Product tabs */}
      <div className="mb-6 flex gap-2">
        {PRODUCTS.map((p) => (
          <button
            key={p}
            onClick={() => setActiveProduct(p)}
            className={`rounded-xl border px-5 py-2.5 text-sm font-medium transition-all ${
              activeProduct === p
                ? "border-[#3b5eee]/50 bg-[#3b5eee]/10 text-[#5f83f4]"
                : "border-white/[0.06] bg-white/[0.02] text-white/40 hover:border-white/[0.12] hover:text-white/60"
            }`}
          >
            {productLabels[p] || p}
          </button>
        ))}
      </div>

      {/* Feature matrix */}
      <div className="glass-card overflow-hidden">
        <div className="border-b border-white/[0.05] px-6 py-4">
          <h2 className="font-display text-base font-semibold text-white">
            {productLabels[activeProduct]} — Feature Matrix
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.05]">
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-white/30">Feature</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-white/30">Category</th>
                {PLANS.map((plan) => (
                  <th key={plan} className="px-6 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-white/30">
                    {plan}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                productFeatures
                  .filter((f) => (f.category || "general") === cat)
                  .map((feature) => (
                    <tr key={feature.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-white/80">{feature.name}</p>
                          {feature.description && (
                            <p className="mt-0.5 text-[11px] text-white/25">{feature.description}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${categoryColors[cat] || categoryColors.general}`}>
                          {cat}
                        </span>
                      </td>
                      {PLANS.map((plan) => (
                        <td key={plan} className="px-6 py-4 text-center">
                          {hasFeature(activeProduct, plan, feature.code) ? (
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10">
                              <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                              </svg>
                            </span>
                          ) : (
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.03]">
                              <svg className="w-4 h-4 text-white/10" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))
              ))}
              {productFeatures.length === 0 && (
                <tr>
                  <td colSpan={2 + PLANS.length} className="px-6 py-16 text-center text-sm text-white/30">
                    No features configured for this product. Run seed to create defaults.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary cards */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {PLANS.map((plan) => {
          const count = productFeatures.filter((f) => hasFeature(activeProduct, plan, f.code)).length;
          return (
            <div key={plan} className="glass-card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-white/30">{plan} Plan</p>
                  <p className="mt-2 font-display text-2xl font-bold text-white">{count} <span className="text-base text-white/30">features</span></p>
                </div>
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${
                  plan === "pro" ? "from-violet-500/20 to-violet-600/10" : "from-blue-500/20 to-blue-600/10"
                }`}>
                  <span className={plan === "pro" ? "text-violet-400" : "text-blue-400"}>
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                  </span>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {productFeatures
                  .filter((f) => hasFeature(activeProduct, plan, f.code))
                  .map((f) => (
                    <span key={f.code} className="rounded-md bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 text-[10px] font-medium text-white/40">
                      {f.code}
                    </span>
                  ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
