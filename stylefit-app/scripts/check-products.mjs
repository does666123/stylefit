import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const products = JSON.parse(readFileSync(new URL('../src/data/products.json', import.meta.url), 'utf8'));
const categories = ['上装', '下装', '鞋', '包', '配饰'];
const scenes = ['日常通勤', '职场商务', '约会聚会', '派对活动', '旅行出游', '正式场合'];
const styles = ['休闲', '商务', '街头', '简约', '优雅', '运动'];
const seasons = ['春', '夏', '秋', '冬'];
const genders = ['male', 'female', 'unisex'];
const priceBands = ['100以下', '100-300', '300-500', '500-1000', '1000以上'];
const brandNames = ['森马', '优衣库', 'UNIQLO', 'MUJI', 'ZARA', '李维斯', "Levi's", 'Lee', 'FILA', '回力', '波司登'];

assert(products.length >= 250 && products.length <= 300, '商品总数必须为 250~300');
assert.equal(new Set(products.map((product) => product.id)).size, products.length, '商品 ID 必须唯一');

for (const product of products) {
  assert(categories.includes(product.category), `${product.id} 类目无效`);
  assert(brandNames.every((brand) => !product.name.includes(brand)), `${product.id} 包含品牌名`);
  assert(product.subCategory, `${product.id} 缺少二级类目`);
  assert(product.tags.scene.every((value) => scenes.includes(value)), `${product.id} 场景标签无效`);
  assert(product.tags.style.every((value) => styles.includes(value)), `${product.id} 风格标签无效`);
  assert(product.tags.season.every((value) => seasons.includes(value)), `${product.id} 季节标签无效`);
  assert(genders.includes(product.tags.gender), `${product.id} 性别标签无效`);
  assert(priceBands.includes(product.priceBand), `${product.id} 价位带无效`);
  assert(product.imageUrl.startsWith('https://images.unsplash.com/'), `${product.id} 图片来源无效`);
  assert.equal(typeof product.commissionUrl, 'string', `${product.id} 缺少推广链接字段`);
  assert.equal(typeof product.active, 'boolean', `${product.id} 缺少上下架字段`);
}

for (const category of categories) {
  assert.equal(products.filter((product) => product.category === category).length, 60, `${category} 数量不均衡`);
  for (const scene of scenes) {
    for (const gender of genders) {
      const count = products.filter((product) => (
        product.active
        && product.category === category
        && product.tags.gender === gender
        && product.tags.scene.includes(scene)
      )).length;
      assert(count >= 3, `${category} × ${scene} × ${gender} 少于 3 件`);
    }
  }
}

assert.deepEqual([...new Set(products.map((product) => product.priceBand))].sort(), [...priceBands].sort());

const distribution = Object.fromEntries(categories.map((category) => [
  category,
  products.filter((product) => product.category === category).length,
]));

console.log(JSON.stringify({ total: products.length, categories: distribution }, null, 2));
