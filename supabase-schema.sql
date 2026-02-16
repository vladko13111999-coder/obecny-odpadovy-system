-- Obecný odpadový systém - Database Schema
-- Run this script in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: obce (municipalities)
CREATE TABLE IF NOT EXISTS obce (
    id BIGSERIAL PRIMARY KEY,
    nazov TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    velkost_obce TEXT NOT NULL CHECK (velkost_obce IN ('mala', 'stredna', 'velka')),
    subscription_status TEXT NOT NULL DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'expired', 'cancelled')),
    trial_start TIMESTAMPTZ DEFAULT NOW(),
    trial_end TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Table: obyvatelia (residents)
CREATE TABLE IF NOT EXISTS obyvatelia (
    id BIGSERIAL PRIMARY KEY,
    obec_id BIGINT NOT NULL REFERENCES obce(id) ON DELETE CASCADE,
    meno TEXT NOT NULL,
    priezvisko TEXT NOT NULL,
    ulica TEXT,
    cislo_popisne TEXT,
    celkove_body INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: vyvozy (waste collections)
CREATE TABLE IF NOT EXISTS vyvozy (
    id BIGSERIAL PRIMARY KEY,
    obec_id BIGINT NOT NULL REFERENCES obce(id) ON DELETE CASCADE,
    obyvatel_id BIGINT NOT NULL REFERENCES obyvatelia(id) ON DELETE CASCADE,
    datum DATE NOT NULL,
    typ_odpadu TEXT NOT NULL CHECK (typ_odpadu IN ('zmesovy', 'plast', 'papier', 'sklo')),
    mnozstvo_kg DECIMAL(10,2) NOT NULL,
    body INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: reporty (reports)
CREATE TABLE IF NOT EXISTS reporty (
    id BIGSERIAL PRIMARY KEY,
    obec_id BIGINT NOT NULL REFERENCES obce(id) ON DELETE CASCADE,
    kvartal INTEGER NOT NULL CHECK (kvartal BETWEEN 1 AND 4),
    rok INTEGER NOT NULL,
    subor_csv TEXT,
    subor_xml TEXT,
    vygenerovane_dna TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(obec_id, kvartal, rok)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_obyvatelia_obec_id ON obyvatelia(obec_id);
CREATE INDEX IF NOT EXISTS idx_vyvozy_obec_id ON vyvozy(obec_id);
CREATE INDEX IF NOT EXISTS idx_vyvozy_obyvatel_id ON vyvozy(obyvatel_id);
CREATE INDEX IF NOT EXISTS idx_vyvozy_datum ON vyvozy(datum);
CREATE INDEX IF NOT EXISTS idx_reporty_obec_id ON reporty(obec_id);
CREATE INDEX IF NOT EXISTS idx_obce_auth_user_id ON obce(auth_user_id);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE obce ENABLE ROW LEVEL SECURITY;
ALTER TABLE obyvatelia ENABLE ROW LEVEL SECURITY;
ALTER TABLE vyvozy ENABLE ROW LEVEL SECURITY;
ALTER TABLE reporty ENABLE ROW LEVEL SECURITY;

-- obce: Users can only see and update their own municipality
CREATE POLICY "Users can view their own municipality" ON obce
    FOR SELECT USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can update their own municipality" ON obce
    FOR UPDATE USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can insert their own municipality" ON obce
    FOR INSERT WITH CHECK (auth.uid() = auth_user_id);

-- obyvatelia: Users can only access residents from their municipality
CREATE POLICY "Users can view residents from their municipality" ON obyvatelia
    FOR SELECT USING (
        obec_id IN (SELECT id FROM obce WHERE auth_user_id = auth.uid())
    );

CREATE POLICY "Users can insert residents to their municipality" ON obyvatelia
    FOR INSERT WITH CHECK (
        obec_id IN (SELECT id FROM obce WHERE auth_user_id = auth.uid())
    );

CREATE POLICY "Users can update residents from their municipality" ON obyvatelia
    FOR UPDATE USING (
        obec_id IN (SELECT id FROM obce WHERE auth_user_id = auth.uid())
    );

CREATE POLICY "Users can delete residents from their municipality" ON obyvatelia
    FOR DELETE USING (
        obec_id IN (SELECT id FROM obce WHERE auth_user_id = auth.uid())
    );

-- vyvozy: Users can only access waste collections from their municipality
CREATE POLICY "Users can view waste collections from their municipality" ON vyvozy
    FOR SELECT USING (
        obec_id IN (SELECT id FROM obce WHERE auth_user_id = auth.uid())
    );

CREATE POLICY "Users can insert waste collections to their municipality" ON vyvozy
    FOR INSERT WITH CHECK (
        obec_id IN (SELECT id FROM obce WHERE auth_user_id = auth.uid())
    );

CREATE POLICY "Users can update waste collections from their municipality" ON vyvozy
    FOR UPDATE USING (
        obec_id IN (SELECT id FROM obce WHERE auth_user_id = auth.uid())
    );

CREATE POLICY "Users can delete waste collections from their municipality" ON vyvozy
    FOR DELETE USING (
        obec_id IN (SELECT id FROM obce WHERE auth_user_id = auth.uid())
    );

-- reporty: Users can only access reports from their municipality
CREATE POLICY "Users can view reports from their municipality" ON reporty
    FOR SELECT USING (
        obec_id IN (SELECT id FROM obce WHERE auth_user_id = auth.uid())
    );

CREATE POLICY "Users can insert reports to their municipality" ON reporty
    FOR INSERT WITH CHECK (
        obec_id IN (SELECT id FROM obce WHERE auth_user_id = auth.uid())
    );

-- Function to calculate points for waste collection
CREATE OR REPLACE FUNCTION calculate_waste_points()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate points: 2 points per kg for sorted waste (plast, papier, sklo), 0 for zmesovy
    IF NEW.typ_odpadu IN ('plast', 'papier', 'sklo') THEN
        NEW.body := ROUND(NEW.mnozstvo_kg * 2);
    ELSE
        NEW.body := 0;
    END IF;
    
    -- Update total points for the resident
    UPDATE obyvatelia 
    SET celkove_body = (
        SELECT COALESCE(SUM(body), 0) 
        FROM vyvozy 
        WHERE obyvatel_id = NEW.obyvatel_id
    ) + NEW.body
    WHERE id = NEW.obyvatel_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically calculate points on insert
CREATE TRIGGER trigger_calculate_waste_points
BEFORE INSERT ON vyvozy
FOR EACH ROW
EXECUTE FUNCTION calculate_waste_points();

-- Function to update points when waste collection is updated
CREATE OR REPLACE FUNCTION recalculate_resident_points()
RETURNS TRIGGER AS $$
BEGIN
    -- Recalculate total points for the resident
    UPDATE obyvatelia 
    SET celkove_body = (
        SELECT COALESCE(SUM(body), 0) 
        FROM vyvozy 
        WHERE obyvatel_id = COALESCE(NEW.obyvatel_id, OLD.obyvatel_id)
    )
    WHERE id = COALESCE(NEW.obyvatel_id, OLD.obyvatel_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to recalculate points on update or delete
CREATE TRIGGER trigger_recalculate_points_update
AFTER UPDATE ON vyvozy
FOR EACH ROW
EXECUTE FUNCTION recalculate_resident_points();

CREATE TRIGGER trigger_recalculate_points_delete
AFTER DELETE ON vyvozy
FOR EACH ROW
EXECUTE FUNCTION recalculate_resident_points();

-- Function to check and update expired trials
CREATE OR REPLACE FUNCTION check_expired_trials()
RETURNS void AS $$
BEGIN
    UPDATE obce
    SET subscription_status = 'expired'
    WHERE subscription_status = 'trial'
    AND trial_end < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create a storage bucket for reports (run this in Supabase Storage)
-- You need to manually create a bucket named 'reports' in Supabase Storage
-- and set it to public or create appropriate policies
