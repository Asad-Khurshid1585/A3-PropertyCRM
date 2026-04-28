function getEnvVar(key: string, fallback: string): string {
  return process.env[key] || fallback;
}

export const getEnv = () => {
  return {
    MONGODB_URI: getEnvVar("MONGODB_URI", "mongodb://localhost:27017/property_dealer_crm"),
    JWT_SECRET: getEnvVar("JWT_SECRET", "dev_secret_change_me"),
    APP_URL: getEnvVar("APP_URL", "http://localhost:3000"),
    JWT_EXPIRES_IN: getEnvVar("JWT_EXPIRES_IN", "7d"),
    ADMIN_EMAIL: getEnvVar("ADMIN_EMAIL", "admin@crm.local"),
    SMTP_HOST: getEnvVar("SMTP_HOST", ""),
    SMTP_PORT: Number(getEnvVar("SMTP_PORT", "587")),
    SMTP_USER: getEnvVar("SMTP_USER", ""),
    SMTP_PASS: getEnvVar("SMTP_PASS", ""),
    EMAIL_FROM: getEnvVar("EMAIL_FROM", "crm@example.com"),
  };
};
