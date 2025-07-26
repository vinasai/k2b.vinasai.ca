const formatPhoneNumber = (phone = "") => {
  // strip out any non‑digits
  const digits = phone.replace(/\D/g, "");
  // if it's exactly 8 digits, insert a dash in the middle
  if (digits.length === 10) {
    return digits.replace(/(\d{3})(\d{3})(\d{4})/, "($1) $2-$3");
  }
  // otherwise, return as‑is (or add more rules here)
  return phone;
};

module.exports = formatPhoneNumber;
