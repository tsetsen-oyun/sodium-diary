const key = process.env.USDA_API_KEY;
const ids = [171287, 171077, 172475, 174924, 168878];

for (const id of ids) {
  const res = await fetch(`https://api.nal.usda.gov/fdc/v1/food/${id}?api_key=${key}`);
  if (!res.ok) {
    console.error(`\n== ${id}: HTTP ${res.status}`);
    continue;
  }
  const food = await res.json();
  console.log(`\n== ${id} | ${food.description}`);
  for (const p of food.foodPortions ?? []) {
    const unit = p.measureUnit?.name && p.measureUnit.name !== 'undetermined' ? p.measureUnit.name : '';
    const label = [p.amount, unit, p.modifier, p.portionDescription].filter(Boolean).join(' ');
    console.log(`  ${label} = ${p.gramWeight} g`);
  }
}