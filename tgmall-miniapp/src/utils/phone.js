// 柬埔寨手机号校验与输入格式化
// 与后端 auth.schema.js 保持一致：+855 + 8 或 9 位数字，首位非 0
export const PHONE_REGEX = /^\+855[1-9]\d{7,8}$/;

export function isValidPhone(phone) {
  return PHONE_REGEX.test(String(phone || ''));
}

// 输入时自动格式化：保留前导 +，其余仅保留数字
export function formatPhoneInput(raw) {
  if (!raw) return raw;
  let digits = raw.replace(/[^0-9]/g, '');
  // 如果用户已经输入 +，则保留 + 在开头
  if (String(raw).startsWith('+')) {
    digits = '+' + digits;
  } else {
    digits = '+' + digits;
  }
  return digits;
}
