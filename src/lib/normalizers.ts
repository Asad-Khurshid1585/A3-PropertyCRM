export const normalizePhoneNumber = (value: string) => {
  return value.replace(/[^\d]/g, "");
};

export const toWhatsappLink = (phone: string) => {
  const normalized = normalizePhoneNumber(phone);
  return `https://wa.me/${normalized}`;
};
