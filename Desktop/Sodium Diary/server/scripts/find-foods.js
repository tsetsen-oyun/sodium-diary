const key = process.env.USDA_API_KEY;
const queries = [
  'egg whole raw fresh',
  'chicken breast raw skinless',
  'tofu raw firm',
  'bread white commercially prepared',
  'rice white long-grain cooked',
];

for (const q of queries) {
  const url = new URL('https://api.nal.usda.gov/fdc/v1/foods/search');
  url.search = new URLSearchParams({ query: q, dataType: 'SR Legacy', pageSize: '4', api_key: key });

  const res = await fetch(url);
  if (!res.ok) {
    console.error(`\n== ${q}: HTTP ${res.status}`);
    continue;
  }
  const data = await res.json();
  console.log(`\n== ${q}`);
  for (const f of data.foods ?? []) {
    const na = f.foodNutrients?.find((n) => n.nutrientNumber === '307');
    console.log(`${f.fdcId} | ${f.description} | sodium per 100 g: ${na ? `${na.value} ${na.unitName}` : 'MISSING'}`);
  }
}