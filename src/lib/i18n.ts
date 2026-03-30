// ── Translation dictionaries ─────────────────────────────

export type Lang = "pl" | "en";

const translations: Record<Lang, Record<string, string>> = {
  pl: {
    // Navigation
    dashboard: "Dashboard",
    subscriptions: "Subskrypcje",
    licenses: "Licencje",
    billing: "Płatności",
    settings: "Ustawienia",
    products: "Produkty",
    clients: "Klienci",
    emails: "Szablony email",
    logout: "Wyloguj",

    // Client panel
    client_panel: "Panel klienta",
    welcome_back: "Witaj ponownie",
    active_subscriptions: "Aktywne subskrypcje",
    active_licenses: "Aktywne licencje",
    addons: "Dodatki",
    your_subscriptions: "Twoje subskrypcje",
    your_licenses: "Twoje licencje",
    view_all: "Zobacz wszystkie",
    manage: "Zarządzaj",
    no_subscriptions: "Brak subskrypcji.",
    no_licenses: "Brak licencji. Kup subskrypcję aby rozpocząć.",
    renewal_date: "Data odnowienia",
    license_key: "Klucz licencji",
    domain: "Domena",
    features: "Funkcje",
    expires: "Wygasa",
    status: "Status",
    plan: "Plan",
    cancel: "Anuluj",
    cancel_subscription: "Anuluj subskrypcję",
    cancel_confirm: "Subskrypcja będzie aktywna do końca bieżącego okresu rozliczeniowego.",
    keep: "Zachowaj",
    cancelling: "Anulowanie...",
    set_domain: "Ustaw domenę",
    save: "Zapisz",
    copy: "Kopiuj",
    copied: "Skopiowano!",
    not_set: "Nie ustawiono — przypisz domenę",
    domain_locked: "Domena jest zablokowana. Skontaktuj się z pomocą techniczną.",

    // Billing
    billing_title: "Płatności",
    billing_desc: "Zarządzaj płatnościami, fakturami i dodatkami",
    stripe_portal: "Portal płatności Stripe",
    stripe_portal_desc: "Zmień metodę płatności, przeglądaj faktury, zarządzaj subskrypcją",
    manage_payment: "Zarządzaj płatnością",
    add_ons: "Dodatki",
    your_addons: "Twoje dodatki",
    no_addons: "Brak zakupionych dodatków.",
    add: "Dodaj",
    adding: "Dodawanie...",

    // Auth
    sign_in: "Zaloguj się",
    sign_up: "Zarejestruj się",
    email: "Email",
    password: "Hasło",
    forgot_password: "Zapomniałeś hasła?",
    create_account: "Utwórz konto",
    already_have_account: "Masz już konto?",
    no_account: "Nie masz konta?",
    reset_password: "Zresetuj hasło",
    send_reset_link: "Wyślij link resetujący",
    new_password: "Nowe hasło",
    confirm_password: "Potwierdź hasło",
    password_reset_success: "Hasło zostało zmienione pomyślnie.",
    reset_link_sent: "Jeśli konto istnieje, link resetujący został wysłany.",

    // Common
    loading: "Ładowanie...",
    error: "Błąd",
    success: "Sukces",
    network_error: "Błąd sieci",
    search: "Szukaj...",
    all_status: "Wszystkie statusy",
    active: "Aktywna",
    past_due: "Zaległa",
    canceled: "Anulowana",
    incomplete: "Niekompletna",
    previous: "Poprzednia",
    next: "Następna",
    page_of: "Strona {{page}} z {{total}}",
  },
  en: {
    // Navigation
    dashboard: "Dashboard",
    subscriptions: "Subscriptions",
    licenses: "Licenses",
    billing: "Billing",
    settings: "Settings",
    products: "Products",
    clients: "Clients",
    emails: "Email Templates",
    logout: "Log out",

    // Client panel
    client_panel: "Client Panel",
    welcome_back: "Welcome back",
    active_subscriptions: "Active Subscriptions",
    active_licenses: "Active Licenses",
    addons: "Add-ons",
    your_subscriptions: "Your Subscriptions",
    your_licenses: "Your Licenses",
    view_all: "View all",
    manage: "Manage",
    no_subscriptions: "No subscriptions yet.",
    no_licenses: "No licenses yet. Purchase a subscription to get started.",
    renewal_date: "Renewal Date",
    license_key: "License Key",
    domain: "Domain",
    features: "Features",
    expires: "Expires",
    status: "Status",
    plan: "Plan",
    cancel: "Cancel",
    cancel_subscription: "Cancel Subscription",
    cancel_confirm: "Your subscription will remain active until the end of the current billing period.",
    keep: "Keep",
    cancelling: "Cancelling...",
    set_domain: "Set Domain",
    save: "Save",
    copy: "Copy",
    copied: "Copied!",
    not_set: "Not set — assign your domain",
    domain_locked: "Domain is locked. Contact support to change.",

    // Billing
    billing_title: "Billing",
    billing_desc: "Manage payments, invoices, and add-ons",
    stripe_portal: "Stripe Billing Portal",
    stripe_portal_desc: "Update payment method, view invoices, manage subscription",
    manage_payment: "Manage Payment",
    add_ons: "Add-ons",
    your_addons: "Your Add-ons",
    no_addons: "No add-ons purchased yet.",
    add: "Add",
    adding: "Adding...",

    // Auth
    sign_in: "Sign In",
    sign_up: "Sign Up",
    email: "Email",
    password: "Password",
    forgot_password: "Forgot password?",
    create_account: "Create Account",
    already_have_account: "Already have an account?",
    no_account: "Don't have an account?",
    reset_password: "Reset Password",
    send_reset_link: "Send Reset Link",
    new_password: "New Password",
    confirm_password: "Confirm Password",
    password_reset_success: "Your password has been reset successfully.",
    reset_link_sent: "If an account exists, a reset link has been sent.",

    // Common
    loading: "Loading...",
    error: "Error",
    success: "Success",
    network_error: "Network error",
    search: "Search...",
    all_status: "All Status",
    active: "Active",
    past_due: "Past Due",
    canceled: "Canceled",
    incomplete: "Incomplete",
    previous: "Previous",
    next: "Next",
    page_of: "Page {{page}} of {{total}}",
  },
};

export default translations;

// ── Helper: get translation ──────────────────────────────

export function t(lang: Lang, key: string, vars?: Record<string, string>): string {
  let text = translations[lang]?.[key] || translations.en[key] || key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replace(new RegExp(`{{${k}}}`, "g"), v);
    }
  }
  return text;
}
