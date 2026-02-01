
import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://oigoxrgstbkpaheabpwv.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pZ294cmdzdGJrcGFoZWFicHd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3ODE3NzAsImV4cCI6MjA4NTM1Nzc3MH0.MRZYsP6w3fGHkCFHxMb71hNpErGxe2VMDSpyLV14ALY');

async function check() {
    console.log('Checking categories table...');
    const { data: cat, error: err1 } = await supabase.from('categories').select('*').limit(1);
    if (err1) console.error('Error categories:', err1.message);
    else console.log('Categories OK');

    console.log('Checking products table for vat_rate...');
    const { data: prod, error: err2 } = await supabase.from('products').select('vat_rate').limit(1);
    if (err2) console.error('Error products vat_rate:', err2.message);
    else console.log('Products vat_rate OK');

    console.log('Checking inventory table join...');
    const { data: inv, error: err3 } = await supabase.from('inventory').select('id, products(name)').limit(1);
    if (err3) console.error('Error inventory join:', err3.message);
    else console.log('Inventory join OK');
}

check();
