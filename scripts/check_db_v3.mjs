
import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://oigoxrgstbkpaheabpwv.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pZ294cmdzdGJrcGFoZWFicHd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3ODE3NzAsImV4cCI6MjA4NTM1Nzc3MH0.MRZYsP6w3fGHkCFHxMb71hNpErGxe2VMDSpyLV14ALY');

async function check() {
    console.log('Checking transactions table for vat_rate...');
    const { data: trans, error: err } = await supabase.from('transactions').select('vat_rate, vat_amount').limit(1);
    if (err) console.error('Error transactions:', err.message);
    else console.log('Transactions VAT columns OK');
}

check();
