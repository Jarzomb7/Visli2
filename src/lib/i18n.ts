export type Lang = "pl" | "en";

export const translations: Record<Lang, Record<string, string>> = {
  pl: {
    // Nav
    dashboard: "Dashboard",
    licenses: "Licencje",
    products: "Produkty",
    subscriptions: "Subskrypcje",
    clients: "Klienci",
    emails: "E-maile",
    settings: "Ustawienia",
    sign_out: "Wyloguj się",

    // Client nav
    billing: "Płatności",

    // Dashboard
    dashboard_title: "Dashboard",
    dashboard_desc: "Przegląd zarządzania licencjami",
    total_licenses: "Wszystkie licencje",
    active: "Aktywne",
    expired: "Wygasłe",
    validations: "Walidacje",
    total_subscriptions: "Subskrypcje",
    active_subs: "Aktywne sub.",
    total_clients: "Klienci",
    monthly_revenue: "Przychód mies.",
    annual_revenue: "Przychód roczny",
    new_license: "Nowa licencja",
    recent_licenses: "Ostatnie licencje",

    // Billing
    billing_title: "Płatności",
    billing_desc: "Zarządzaj płatnościami, fakturami i dodatkami",
    manage_subscription: "Zarządzaj płatnością",
    manage_subscription_desc: "Przeglądaj faktury, zmień metodę płatności, zmień plan lub anuluj subskrypcję — wszystko w jednym miejscu.",
    opens_stripe_portal: "Otwiera bezpieczny portal Stripe",
    addons: "Dodatki",
    your_addons: "Twoje dodatki",
    no_addons: "Brak zakupionych dodatków.",

    // Common
    loading: "Ładowanie...",
    save: "Zapisz",
    cancel: "Anuluj",
    create: "Utwórz",
    edit: "Edytuj",
    delete: "Usuń",
    search: "Szukaj",
    status: "Status",
    domain: "Domena",
    plan: "Plan",
    email: "E-mail",
    password: "Hasło",
    login: "Zaloguj się",
    register: "Zarejestruj się",
    forgot_password: "Zapomniałeś hasła?",
    reset_password: "Resetuj hasło",
    back_to_login: "Powrót do logowania",
    no_account: "Nie masz konta?",
    create_account: "Utwórz konto",

    // Products
    products_title: "Produkty",
    products_desc: "Zarządzaj produktami i cenami Stripe",
    new_product: "Nowy produkt",

    // Subscriptions
    subscriptions_title: "Subskrypcje",
    subscriptions_desc: "Zarządzanie subskrypcjami Stripe",

    // Clients
    clients_title: "Klienci",
    clients_desc: "Zarządzanie klientami",

    // Emails
    emails_title: "Szablony e-mail",
    emails_desc: "Edytuj szablony e-mail z podglądem na żywo",

    // Settings
    settings_title: "Ustawienia",
    settings_desc: "Konfiguracja systemu i integracje",

    // Licenses
    licenses_title: "Licencje",
    licenses_desc: "Zarządzanie kluczami licencyjnymi",
  },
  en: {
    // Nav
    dashboard: "Dashboard",
    licenses: "Licenses",
    products: "Products",
    subscriptions: "Subscriptions",
    clients: "Clients",
    emails: "Emails",
    settings: "Settings",
    sign_out: "Sign Out",

    // Client nav
    billing: "Billing",

    // Dashboard
    dashboard_title: "Dashboard",
    dashboard_desc: "License management overview",
    total_licenses: "Total Licenses",
    active: "Active",
    expired: "Expired",
    validations: "Validations",
    total_subscriptions: "Subscriptions",
    active_subs: "Active Subs",
    total_clients: "Total Clients",
    monthly_revenue: "Monthly Revenue",
    annual_revenue: "Annual Revenue",
    new_license: "New License",
    recent_licenses: "Recent Licenses",

    // Billing
    billing_title: "Billing",
    billing_desc: "Manage payments, invoices, and addons",
    manage_subscription: "Manage Subscription",
    manage_subscription_desc: "View invoices, update your payment method, change your plan, or cancel your subscription — all in one place.",
    opens_stripe_portal: "Opens secure Stripe billing portal",
    addons: "Add-ons",
    your_addons: "Your Add-ons",
    no_addons: "No add-ons purchased yet.",

    // Common
    loading: "Loading...",
    save: "Save",
    cancel: "Cancel",
    create: "Create",
    edit: "Edit",
    delete: "Delete",
    search: "Search",
    status: "Status",
    domain: "Domain",
    plan: "Plan",
    email: "Email",
    password: "Password",
    login: "Sign In",
    register: "Register",
    forgot_password: "Forgot password?",
    reset_password: "Reset Password",
    back_to_login: "Back to Login",
    no_account: "Don't have an account?",
    create_account: "Create one",

    // Products
    products_title: "Products",
    products_desc: "Manage products and Stripe pricing",
    new_product: "New Product",

    // Subscriptions
    subscriptions_title: "Subscriptions",
    subscriptions_desc: "Stripe subscription management",

    // Clients
    clients_title: "Clients",
    clients_desc: "Client management",

    // Emails
    emails_title: "Email Templates",
    emails_desc: "Edit email templates with live preview",

    // Settings
    settings_title: "Settings",
    settings_desc: "System configuration and integrations",

    // Licenses
    licenses_title: "Licenses",
    licenses_desc: "License key management",
  },
};

export function t(lang: Lang, key: string, vars?: Record<string, string>): string {
  let text = translations[lang]?.[key] || translations.en[key] || key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replace(new RegExp(`{{${k}}}`, "g"), v);
    }
  }
  return text;
}
