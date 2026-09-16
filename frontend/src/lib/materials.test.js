import {materialKey, selectedMaterials, snapQuantity, validQuantity} from './materials';
const meter={id:'drop',name:'Drop Externo',measure:'metro',multiple:500};
const unit={id:'hgu',name:'HGU',measure:'unidade',multiple:1};
test('quantities snap to stock multiples and reject fractions',()=>{
  expect(snapQuantity(501,meter)).toBe(1000);
  expect(snapQuantity(500,meter)).toBe(500);
  expect(snapQuantity(1499,meter)).toBe(1500);
  expect(validQuantity(750,meter)).toBe(false);
  expect(validQuantity(1500,meter)).toBe(true);
  expect(validQuantity(1.5,unit)).toBe(false);
  expect(snapQuantity(2.1,unit)).toBe(3);
  expect(snapQuantity(-500,meter)).toBe(0);
  expect(snapQuantity(Infinity,meter)).toBe(0);
});
test('multiple category selections are retained and zero is excluded',()=>{
  const cats=[{id:'a',name:'Cabos',materials:[meter]},{id:'b',name:'Equipamentos',materials:[unit]}];
  const selection=selectedMaterials(cats,{[materialKey('a','drop')]:1000,[materialKey('b','hgu')]:3});
  expect(selection.map(i=>[i.category_name,i.quantity])).toEqual([['Cabos',1000],['Equipamentos',3]]);
  expect(selectedMaterials(cats,{'a:drop':0,'b:hgu':3}).map(i=>i.item_id)).toEqual(['hgu']);
});
