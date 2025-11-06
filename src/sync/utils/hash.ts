/**
 * 内容哈希计算工具
 */

/**
 * 计算内容哈希（SHA-256）
 */
export async function calculateHash(
  type: string,
  value: string,
): Promise<string> {
  const content = `${type}:${value}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(content);

  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return hashHex;
}

/**
 * 验证哈希是否匹配
 */
export async function verifyHash(
  type: string,
  value: string,
  expectedHash: string,
): Promise<boolean> {
  const actualHash = await calculateHash(type, value);
  return actualHash === expectedHash;
}
