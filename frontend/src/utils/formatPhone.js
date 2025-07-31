export default function formatPhoneNumber(phone) {
  if (!phone) return "";
  const input = ("" + phone).replace(/\D/g, "");
  let formattedInput = "";
  if (input.length > 0) {
    formattedInput = `(${input.substring(0, 3)}`;
  }
  if (input.length > 3) {
    formattedInput += `) ${input.substring(3, 6)}`;
  }
  if (input.length > 6) {
    formattedInput += `-${input.substring(6, 10)}`;
  }
  return formattedInput;
}
