import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
const envEntries = fs
  .readFileSync(envPath, 'utf8')
  .split(/\r?\n/)
  .filter(Boolean)
  .filter((line) => !line.trim().startsWith('#'))
  .map((line) => {
    const separator = line.indexOf('=');
    const key = line.slice(0, separator);
    const value = line.slice(separator + 1).replace(/^"|"$/g, '');
    return [key, value] as const;
  });

for (const [key, value] of envEntries) {
  process.env[key] ??= value;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  const { data: brands, error: brandError } = await supabase
    .from('brands')
    .select('id, name')
    .ilike('name', '%Oh My Dog%');

  if (brandError || !brands?.length) {
    console.error('Brand "Oh My Dog" not found', brandError);
    return;
  }

  const brandId = brands[0].id;
  console.log(`Found Brand ID: ${brandId} for Oh My Dog`);

  // 1. Expense Categories (should follow migration seed, but ensure they exist for this brand if needed)
  // Actually, standard categories have brand_id NULL.

  const { data: categories } = await supabase
    .from('expense_categories')
    .select('id, name');

  const getCatId = (name: string) => categories?.find(c => c.name.toLowerCase() === name.toLowerCase())?.id;

  // 2. Fixed Expenses
  const expenses = [
    // Salário Ede (Oct 25 - Mar 26)
    ...['2025-10-01', '2025-11-01', '2025-12-01', '2026-01-01', '2026-02-01', '2026-03-01'].map(date => ({
      brand_id: brandId,
      category_id: getCatId('Salários'),
      description: 'Salário Ede',
      amount: 5000,
      incurred_on: date
    })),
    // Equipment
    { brand_id: brandId, category_id: getCatId('Equipamentos'), description: 'Equipamentos', amount: 471.70, incurred_on: '2025-09-01' },
    { brand_id: brandId, category_id: getCatId('Equipamentos'), description: 'Equipamentos', amount: 471.70, incurred_on: '2025-10-01' },
    { brand_id: brandId, category_id: getCatId('Equipamentos'), description: 'Equipamentos', amount: 471.70, incurred_on: '2025-11-01' },
    { brand_id: brandId, category_id: getCatId('Equipamentos'), description: 'Equipamentos', amount: 471.70, incurred_on: '2025-12-01' },
    { brand_id: brandId, category_id: getCatId('Equipamentos'), description: 'Equipamentos', amount: 471.70, incurred_on: '2026-01-01' },
    { brand_id: brandId, category_id: getCatId('Equipamentos'), description: 'Equipamentos', amount: 471.70, incurred_on: '2026-02-01' },
    // IA
    { brand_id: brandId, category_id: getCatId('IA'), description: 'IA (Assinaturas)', amount: 99, incurred_on: '2025-09-01' },
    { brand_id: brandId, category_id: getCatId('IA'), description: 'IA (Assinaturas)', amount: 329, incurred_on: '2025-10-01' },
    { brand_id: brandId, category_id: getCatId('IA'), description: 'IA (Assinaturas)', amount: 149, incurred_on: '2025-11-01' },
    { brand_id: brandId, category_id: getCatId('IA'), description: 'IA (Assinaturas)', amount: 259, incurred_on: '2025-12-01' },
    { brand_id: brandId, category_id: getCatId('IA'), description: 'IA (Assinaturas)', amount: 199, incurred_on: '2026-01-01' },
    // Services
    { brand_id: brandId, category_id: getCatId('Serviços'), description: 'Serviços', amount: 1100, incurred_on: '2025-11-01' },
  ];

  const filteredExpenses = expenses.filter(e => e.category_id);
  const { error: expError } = await supabase.from('brand_expenses').insert(filteredExpenses);
  if (expError) console.error('Error inserting expenses', expError);
  else console.log('Fixed expenses inserted successfully');

  // 3. CMV Rules (Base)
  // Logic: set_cmv_rule is a function. We'll use RPC or direct insert.
  // Direct insert into cmv_history is easier for the script.
  const cmvRules = [
    { brand_id: brandId, match_type: 'TYPE', match_value: 'regata', match_label: 'Regata', cmv_unit: 37, valid_from: '2025-01-01' },
    { brand_id: brandId, match_type: 'TYPE', match_value: 'cropped (tee)', match_label: 'Cropped (tee)', cmv_unit: 37, valid_from: '2025-01-01' },
    { brand_id: brandId, match_type: 'TYPE', match_value: 'infantil (tee)', match_label: 'Infantil (tee)', cmv_unit: 37, valid_from: '2025-01-01' },
    { brand_id: brandId, match_type: 'TYPE', match_value: 'body infantil', match_label: 'Body infantil', cmv_unit: 37, valid_from: '2025-01-01' },
    { brand_id: brandId, match_type: 'TYPE', match_value: 'camiseta classica/fem', match_label: 'Camiseta clássica/fem', cmv_unit: 44, valid_from: '2025-01-01' },
    { brand_id: brandId, match_type: 'TYPE', match_value: 'peruana', match_label: 'Peruana', cmv_unit: 59, valid_from: '2025-01-01' },
    { brand_id: brandId, match_type: 'TYPE', match_value: 'oversized', match_label: 'Oversized', cmv_unit: 69, valid_from: '2025-01-01' },
    { brand_id: brandId, match_type: 'TYPE', match_value: 'cropped moletom', match_label: 'Cropped moletom', cmv_unit: 69, valid_from: '2025-01-01' },
    { brand_id: brandId, match_type: 'TYPE', match_value: 'sueter moletom', match_label: 'Suéter moletom', cmv_unit: 90, valid_from: '2025-01-01' },
    { brand_id: brandId, match_type: 'TYPE', match_value: 'hoodie moletom', match_label: 'Hoodie moletom', cmv_unit: 110, valid_from: '2025-01-01' },
    
    // Threshold March 2026 (Inkrivel Plan)
    { brand_id: brandId, match_type: 'TYPE', match_value: 'camiseta classica/fem', match_label: 'Camiseta clássica/fem', cmv_unit: 49.90, valid_from: '2026-03-01' },
    { brand_id: brandId, match_type: 'TYPE', match_value: 'peruana', match_label: 'Peruana', cmv_unit: 65, valid_from: '2026-03-01' },
    { brand_id: brandId, match_type: 'TYPE', match_value: 'infantil (tee)', match_label: 'Mini / Infantil', cmv_unit: 46, valid_from: '2026-03-01' },
    { brand_id: brandId, match_type: 'TYPE', match_value: 'body infantil', match_label: 'Body', cmv_unit: 46, valid_from: '2026-03-01' },
    { brand_id: brandId, match_type: 'TYPE', match_value: 'regata', match_label: 'Regata', cmv_unit: 46, valid_from: '2026-03-01' },
    { brand_id: brandId, match_type: 'TYPE', match_value: 'oversized', match_label: 'Oversized', cmv_unit: 75, valid_from: '2026-03-01' },
    { brand_id: brandId, match_type: 'TYPE', match_value: 'cropped (tee)', match_label: 'Cropped', cmv_unit: 44, valid_from: '2026-03-01' },
  ];

  // We should close old rules (set valid_to) but direct insert for new ones with valid_from is also fine
  // if we want to follow the DB logic exactly.
  // For a seed, let's just insert.
  const { error: cmvError } = await supabase.from('cmv_history').insert(cmvRules.map(r => ({ ...r, sku: r.match_value })));
  if (cmvError) console.error('Error inserting CMV rules', cmvError);
  else console.log('CMV rules inserted successfully');
}

seed();
