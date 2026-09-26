/** Persistent ordered index for direct physical children. Only scalar summaries are cached: no draft
 * proxies or entity copies survive publication. Path copying keeps a root move independent
 * of its descendants and of unrelated containers. Rebuilt from canonical placement on load. */
export interface ObjectIndexNode<T> {
  readonly key: string;
  readonly value: T;
  readonly left?: ObjectIndexNode<T>;
  readonly right?: ObjectIndexNode<T>;
  readonly height: number;
  readonly maximum: number;
}
type Tree<T> = ObjectIndexNode<T> | undefined;
const height = <T>(tree: Tree<T>) => tree?.height ?? 0;
const node = <T>(key: string, value: T, left: Tree<T>, right: Tree<T>): ObjectIndexNode<T> => ({
  key,
  value,
  left,
  right,
  height: Math.max(height(left), height(right)) + 1,
  maximum: Math.max(typeof value === 'number' ? value : 0, left?.maximum ?? 0, right?.maximum ?? 0),
});
function rotateLeft<T>(tree: ObjectIndexNode<T>): ObjectIndexNode<T> {
  const right = tree.right!;
  return node(
    right.key,
    right.value,
    node(tree.key, tree.value, tree.left, right.left),
    right.right,
  );
}
function rotateRight<T>(tree: ObjectIndexNode<T>): ObjectIndexNode<T> {
  const left = tree.left!;
  return node(left.key, left.value, left.left, node(tree.key, tree.value, left.right, tree.right));
}
function balance<T>(tree: ObjectIndexNode<T>): ObjectIndexNode<T> {
  if (height(tree.left) - height(tree.right) > 1) {
    const left = tree.left!;
    return rotateRight(
      height(left.left) < height(left.right)
        ? node(tree.key, tree.value, rotateLeft(left), tree.right)
        : tree,
    );
  }
  if (height(tree.right) - height(tree.left) > 1) {
    const right = tree.right!;
    return rotateLeft(
      height(right.right) < height(right.left)
        ? node(tree.key, tree.value, tree.left, rotateRight(right))
        : tree,
    );
  }
  return tree;
}
export function objectIndexGet<T>(tree: Tree<T>, key: string): T | undefined {
  while (tree) {
    if (key === tree.key) return tree.value;
    tree = key < tree.key ? tree.left : tree.right;
  }
  return undefined;
}
export function objectIndexSet<T>(tree: Tree<T>, key: string, value: T | undefined): Tree<T> {
  if (!tree) return value === undefined ? undefined : node(key, value, undefined, undefined);
  if (key < tree.key)
    return balance(node(tree.key, tree.value, objectIndexSet(tree.left, key, value), tree.right));
  if (key > tree.key)
    return balance(node(tree.key, tree.value, tree.left, objectIndexSet(tree.right, key, value)));
  if (value !== undefined) return node(key, value, tree.left, tree.right);
  if (!tree.left) return tree.right;
  if (!tree.right) return tree.left;
  let successor = tree.right;
  while (successor.left) successor = successor.left;
  return balance(
    node(
      successor.key,
      successor.value,
      tree.left,
      objectIndexSet(tree.right, successor.key, undefined),
    ),
  );
}
export function* objectIndexEntries<T>(tree: Tree<T>, after = ''): Generator<[string, T]> {
  if (!tree) return;
  if (tree.key > after) {
    yield* objectIndexEntries(tree.left, after);
    yield [tree.key, tree.value];
  }
  yield* objectIndexEntries(tree.right, after);
}
