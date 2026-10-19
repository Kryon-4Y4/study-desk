import { KnowledgeNode } from "../types";
import { genId } from "../utils/id";

/** 知识树纯函数，不依赖 DOM / 插件实例，便于单测 */

function sortByOrder(nodes: KnowledgeNode[]): KnowledgeNode[] {
  return [...nodes].sort((a, b) => a.order - b.order);
}

export function getRootNodes(nodes: KnowledgeNode[]): KnowledgeNode[] {
  return sortByOrder(nodes.filter((n) => n.parentId === null));
}

export function getChildren(
  nodes: KnowledgeNode[],
  parentId: string | null
): KnowledgeNode[] {
  return sortByOrder(nodes.filter((n) => n.parentId === parentId));
}

export function getNode(
  nodes: KnowledgeNode[],
  id: string
): KnowledgeNode | undefined {
  return nodes.find((n) => n.id === id);
}

/** 递归收集某节点的所有后代 id（含自身） */
export function collectSubtreeIds(
  nodes: KnowledgeNode[],
  id: string
): Set<string> {
  const result = new Set<string>([id]);
  const walk = (pid: string) => {
    for (const n of nodes) {
      if (n.parentId === pid) {
        result.add(n.id);
        walk(n.id);
      }
    }
  };
  walk(id);
  return result;
}

/** 从根到某节点的祖先 id 序列（不含自身） */
export function getAncestorIds(
  nodes: KnowledgeNode[],
  id: string
): string[] {
  const path: string[] = [];
  let cur = getNode(nodes, id);
  while (cur && cur.parentId) {
    path.unshift(cur.parentId);
    cur = getNode(nodes, cur.parentId);
  }
  return path;
}

export function addNode(
  nodes: KnowledgeNode[],
  parentId: string | null,
  title: string
): KnowledgeNode[] {
  const siblings = nodes.filter((n) => n.parentId === parentId);
  const maxOrder = siblings.length
    ? Math.max(...siblings.map((n) => n.order))
    : -1;
  const node: KnowledgeNode = {
    id: genId(),
    parentId,
    title,
    order: maxOrder + 1,
    notePaths: [],
  };
  return [...nodes, node];
}

/** 删除节点（含整个子树） */
export function removeNode(
  nodes: KnowledgeNode[],
  id: string
): KnowledgeNode[] {
  const ids = collectSubtreeIds(nodes, id);
  return nodes.filter((n) => !ids.has(n.id));
}

export function renameNode(
  nodes: KnowledgeNode[],
  id: string,
  title: string
): KnowledgeNode[] {
  return nodes.map((n) => (n.id === id ? { ...n, title } : n));
}

/** 移动节点到新父节点（防止移入自身子树） */
export function moveNode(
  nodes: KnowledgeNode[],
  id: string,
  newParentId: string | null
): KnowledgeNode[] {
  if (newParentId && collectSubtreeIds(nodes, id).has(newParentId)) {
    return nodes;
  }
  const siblings = nodes.filter(
    (n) => n.parentId === newParentId && n.id !== id
  );
  const maxOrder = siblings.length
    ? Math.max(...siblings.map((n) => n.order))
    : -1;
  return nodes.map((n) =>
    n.id === id ? { ...n, parentId: newParentId, order: maxOrder + 1 } : n
  );
}

/** 同级上移(-1)/下移(+1)，交换 order */
export function reorderNode(
  nodes: KnowledgeNode[],
  id: string,
  delta: -1 | 1
): KnowledgeNode[] {
  const node = getNode(nodes, id);
  if (!node) return nodes;
  const siblings = getChildren(nodes, node.parentId);
  const idx = siblings.findIndex((n) => n.id === id);
  const target = idx + delta;
  if (target < 0 || target >= siblings.length) return nodes;
  const a = siblings[idx];
  const b = siblings[target];
  return nodes.map((n) =>
    n.id === a.id
      ? { ...n, order: b.order }
      : n.id === b.id
        ? { ...n, order: a.order }
        : n
  );
}

/** 更新节点关联的笔记路径 */
export function setNodeNotes(
  nodes: KnowledgeNode[],
  id: string,
  notePaths: string[]
): KnowledgeNode[] {
  return nodes.map((n) => (n.id === id ? { ...n, notePaths } : n));
}

/**
 * 解析 Markdown 标题层级为知识点节点：
 * `# ` 为根、`## ` 为子、`### ` 为孙……逐级构建树，notePaths 留空。
 * 仅识别 1~6 级标题（# 到 ######），其余内容忽略。
 */
export function markdownToNodes(md: string): KnowledgeNode[] {
  const nodes: KnowledgeNode[] = [];
  const stack: { id: string; level: number }[] = [];
  const orderMap = new Map<string, number>(); // parentKey -> 下一个 order

  for (const raw of md.split(/\r?\n/)) {
    const m = raw.match(/^(#{1,6})\s+(.+)$/);
    if (!m) continue;
    const level = m[1].length;
    const title = m[2].replace(/\s+#+\s*$/, "").trim();
    if (!title) continue;

    // 弹出层级 >= 当前的栈项，定位父节点
    while (stack.length && stack[stack.length - 1].level >= level) {
      stack.pop();
    }
    const parentId = stack.length ? stack[stack.length - 1].id : null;
    const parentKey = parentId ?? "__root__";
    const order = orderMap.get(parentKey) ?? 0;
    orderMap.set(parentKey, order + 1);

    const node: KnowledgeNode = {
      id: genId(),
      parentId,
      title,
      order,
      notePaths: [],
    };
    nodes.push(node);
    stack.push({ id: node.id, level });
  }
  return nodes;
}
