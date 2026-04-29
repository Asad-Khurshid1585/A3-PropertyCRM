export const normalizePhoneNumber = (value: string) => {
  return value.replace(/[^\d]/g, "");
};

export const toWhatsappLink = (phone: string, message?: string) => {
  const normalized = normalizePhoneNumber(phone);
  const base = `https://wa.me/${normalized}`;
  if (message) {
    return `${base}?text=${encodeURIComponent(message)}`;
  }
  return base;
};
