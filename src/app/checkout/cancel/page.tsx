import Link from "next/link";

export default function CheckoutCancelPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[#060d2b]" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-red-500/[0.04] rounded-full blur-[120px]" />
      </div>
      <div className="glass-card w-full max-w-md p-10 text-center animate-fade-in">
        <div className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.06]">
          <svg className="w-8 h-8 text-white/40" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="font-display text-2xl font-bold text-white">Payment Cancelled</h1>
        <p className="mt-3 text-sm text-white/40 leading-relaxed">
          Your payment was not processed. No charges were made.
        </p>
        <Link href="/" className="btn-primary mt-6 inline-block">Go Back</Link>
      </div>
    </div>
  );
}
