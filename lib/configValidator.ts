export const checkConfig = () => {
  const required = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  };
  const missing = Object.entries(required)
    .filter(([_, v]) => !v)
    .map(([k]) => k);
  return { valid: missing.length === 0, missing };
};
