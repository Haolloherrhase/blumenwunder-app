-- 008_unify_categories_and_remove_vat.sql

-- 1. Rename existing "Dekorationen" to "Dekoration" to keep products intact
UPDATE categories SET name = 'Dekoration' WHERE name = 'Dekorationen';

-- 2. Ensure all 4 categories exist exactly as specified
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Schnittblumen') THEN
        INSERT INTO categories (name) VALUES ('Schnittblumen');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Topfpflanzen') THEN
        INSERT INTO categories (name) VALUES ('Topfpflanzen');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Dekoration') THEN
        INSERT INTO categories (name) VALUES ('Dekoration');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Materialien') THEN
        INSERT INTO categories (name) VALUES ('Materialien');
    END IF;
END $$;
