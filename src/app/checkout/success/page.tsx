export default function CheckoutSuccessPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[#060d2b]" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-emerald-500/[0.06] rounded-full blur-[120px]" />
      </div>
      <div className="glass-card w-full max-w-md p-10 text-center animate-fade-in">
        <div className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10">
          <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="font-display text-2xl font-bold text-white">Payment Successful!</h1>
        <p className="mt-3 text-sm text-white/40 leading-relaxed">
          Your subscription is now active. A license key has been automatically generated and linked to your domain.
          You can start using the plugin immediately.
        </p>
      </div>
    </div>
  );
}
