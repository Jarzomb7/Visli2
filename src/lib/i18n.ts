export type Lang = "pl" | "en";

const translations: Record<Lang, Record<string, string>> = {
  pl: {
    dashboard: "Dashboard", subscriptions: "Subskrypcje", licenses: "Licencje",
    billing: "Płatności", settings: "Ustawienia", products: "Produkty",
    clients: "Klienci", emails: "Szablony email", logout: "Wyloguj",
    client_panel: "Panel klienta", welcome_back: "Witaj ponownie",
    active_subscriptions: "Aktywne subskrypcje", active_licenses: "Aktywne licencje",
    addons: "Dodatki", your_subscriptions: "Twoje subskrypcje",
    your_licenses: "Twoje licencje", view_all: "Zobacz wszystkie", manage: "Zarządzaj",
    no_subscriptions: "Brak subskrypcji.", no_licenses: "Brak licencji.",
    renewal_date: "Data odnowienia", license_key: "Klucz licencji",
    domain: "Domena", expires: "Wygasa", status: "Status", plan: "Plan",
    cancel: "Anuluj", cancel_subscription: "Anuluj subskrypcję",
    cancel_confirm: "Subskrypcja będzie aktywna do końca okresu rozliczeniowego.",
    keep: "Zachowaj", cancelling: "Anulowanie...",
    set_domain: "Ustaw domenę", save: "Zapisz", copy: "Kopiuj", copied: "Skopiowano!",
    not_set: "Nie ustawiono", billing_title: "Płatności",
    billing_desc: "Zarządzaj płatnościami, fakturami i dodatkami",
    stripe_portal: "Portal płatności Stripe",
    stripe_portal_desc: "Zmień metodę płatności, przeglądaj faktury, zarządzaj subskrypcją",
    manage_payment: "Zarządzaj płatnością",
    add_ons: "Dodatki", your_addons: "Twoje dodatki",
    no_addons: "Brak zakupionych dodatków.", add: "Dodaj", adding: "Dodawanie...",
    sign_in: "Zaloguj się", email: "Email", password: "Hasło",
    forgot_password: "Zapomniałeś hasła?",
    network_error: "Błąd sieci", search: "Szukaj...",
    loading: "Ładowanie...",
  },
  en: {
    dashboard: "Dashboard", subscriptions: "Subscriptions", licenses: "Licenses",
    billing: "Billing", settings: "Settings", products: "Products",
    clients: "Clients", emails: "Email Templates", logout: "Log out",
    client_panel: "Client Panel", welcome_back: "Welcome back",
    active_subscriptions: "Active Subscriptions", active_licenses: "Active Licenses",
    addons: "Add-ons", your_subscriptions: "Your Subscriptions",
    your_licenses: "Your Licenses", view_all: "View all", manage: "Manage",
    no_subscriptions: "No subscriptions yet.", no_licenses: "No licenses yet.",
    renewal_date: "Renewal Date", license_key: "License Key",
    domain: "Domain", expires: "Expires", status: "Status", plan: "Plan",
    cancel: "Cancel", cancel_subscription: "Cancel Subscription",
    cancel_confirm: "Your subscription will remain active until the end of the billing period.",
    keep: "Keep", cancelling: "Cancelling...",
    set_domain: "Set Domain", save: "Save", copy: "Copy", copied: "Copied!",
    not_set: "Not set", billing_title: "Billing",
    billing_desc: "Manage payments, invoices, and add-ons",
    stripe_portal: "Stripe Billing Portal",
    stripe_portal_desc: "Update payment method, view invoices, manage subscription",
    manage_payment: "Manage Payment",
    add_ons: "Add-ons", your_addons: "Your Add-ons",
    no_addons: "No add-ons purchased yet.", add: "Add", adding: "Adding...",
    sign_in: "Sign In", email: "Email", password: "Password",
    forgot_password: "Forgot password?",
    network_error: "Network error", search: "Search...",
    loading: "Loading...",
  },
};

export default translations;

export function t(lang: Lang, key: string, vars?: Record<string, string>): string {
  let text = translations[lang]?.[key] || translations.en[key] || key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replace(new RegExp(`{{${k}}}`, "g"), v);
    }
  }
  return text;
}
