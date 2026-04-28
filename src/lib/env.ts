export const getEnv = () => {
  return {
    MONGODB_URI:
      process.env.MONGODB_URI || "mongodb://localhost:27017/property_dealer_crm",
    JWT_SECRET: process.env.JWT_SECRET || "dev_secret_change_me",
    APP_URL: process.env.APP_URL || "http://localhost:3000",
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
    ADMIN_EMAIL: process.env.ADMIN_EMAIL || "admin@crm.local",
    SMTP_HOST: process.env.SMTP_HOST || "",
    SMTP_PORT: Number(process.env.SMTP_PORT || "587"),
    SMTP_USER: process.env.SMTP_USER || "",
    SMTP_PASS: process.env.SMTP_PASS || "",
    EMAIL_FROM: process.env.EMAIL_FROM || "crm@example.com",
  };
};
