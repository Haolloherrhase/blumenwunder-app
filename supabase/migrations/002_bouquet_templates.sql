-- Migration: Add Bouquet Templates
-- This adds support for predefined bouquet templates that can be sold multiple times

-- Bouquet Templates (Predefined bouquets like "Rosenstrauß Standard")
CREATE TABLE bouquet_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  base_price DECIMAL(10,2) NOT NULL, -- Selling price
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Template Items (Flowers in the template)
CREATE TABLE bouquet_template_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID REFERENCES bouquet_templates(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  material_id UUID REFERENCES materials(id),
  quantity INTEGER NOT NULL,
  CHECK ((product_id IS NOT NULL AND material_id IS NULL) OR (product_id IS NULL AND material_id IS NOT NULL))
);

-- Enable RLS
ALTER TABLE bouquet_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE bouquet_template_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow authenticated users full access to bouquet_templates"
  ON bouquet_templates FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users full access to bouquet_template_items"
  ON bouquet_template_items FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
