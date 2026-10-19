/** 生成稳定唯一 id（知识树节点 / 卡片 / 打卡记录统一使用） */
export function genId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // 极少数环境降级
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
  );
}
