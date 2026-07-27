export function isValidLeadPhone(value) {
  const phone = String(value || '').trim()
  if (!phone || !/^\+?[\d\s()./-]+$/.test(phone)) return false

  const digits = phone.replace(/\D/g, '')
  return digits.length >= 7 && digits.length <= 15
}
