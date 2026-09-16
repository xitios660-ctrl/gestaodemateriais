export const MAX_QUANTITY = 1000000000;
export const materialKey = (categoryId, itemId) => `${categoryId}:${itemId}`;
export const materialStep = (item) => item.measure === 'metro' ? item.multiple : 1;
export const measureLabel = (item) => item.measure === 'metro' ? 'm' : 'un';
export const formatQuantity = (quantity) => Number(quantity).toLocaleString('pt-BR');
export function validQuantity(value, item) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 && n <= MAX_QUANTITY && n % materialStep(item) === 0;
}
export function snapQuantity(value, item) {
  const n = Number(value);
  const step = materialStep(item);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(Math.ceil(n / step) * step, Math.floor(MAX_QUANTITY / step) * step);
}
export function selectedMaterials(categories, quantities) {
  return categories.flatMap(category => (category.materials || []).filter(item => Number(quantities[materialKey(category.id, item.id)]) > 0).map(item => ({
    ...item, category_id: category.id, category_name: category.name, item_id: item.id,
    quantity: Number(quantities[materialKey(category.id, item.id)]),
  })));
}
