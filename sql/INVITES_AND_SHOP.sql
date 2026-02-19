-- Pozvánky pre obyvateľov + obchod (odmeny)
-- Spustiť v Supabase SQL Editore

-- 0) Prepojenie obyvateľa na Supabase Auth účet
ALTER TABLE public.obyvatelia
  ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_obyvatelia_auth_user_id
  ON public.obyvatelia(auth_user_id)
  WHERE auth_user_id IS NOT NULL;

-- 1) Tabuľka pozvánok (audit + pairing)
CREATE TABLE IF NOT EXISTS public.pozvanky_obyvatelia (
  id               bigserial PRIMARY KEY,
  obec_id          bigint NOT NULL REFERENCES public.obce(id) ON DELETE CASCADE,
  obyvatel_id      bigint NOT NULL REFERENCES public.obyvatelia(id) ON DELETE CASCADE,
  email            text   NOT NULL,
  invited_user_id  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  accepted_at      timestamptz
);

CREATE INDEX IF NOT EXISTS idx_pozvanky_obec_id ON public.pozvanky_obyvatelia(obec_id);
CREATE INDEX IF NOT EXISTS idx_pozvanky_obyvatel_id ON public.pozvanky_obyvatelia(obyvatel_id);

ALTER TABLE public.pozvanky_obyvatelia ENABLE ROW LEVEL SECURITY;

-- Starosta môže spravovať pozvánky svojej obce
DROP POLICY IF EXISTS "Mayor can manage invites" ON public.pozvanky_obyvatelia;
CREATE POLICY "Mayor can manage invites" ON public.pozvanky_obyvatelia
FOR ALL
USING (obec_id IN (SELECT id FROM public.obce WHERE auth_user_id = auth.uid()))
WITH CHECK (obec_id IN (SELECT id FROM public.obce WHERE auth_user_id = auth.uid()));

-- 2) Odmeny (katalóg)
CREATE TABLE IF NOT EXISTS public.odmeny (
  id          bigserial PRIMARY KEY,
  obec_id     bigint NOT NULL REFERENCES public.obce(id) ON DELETE CASCADE,
  nazov       text NOT NULL,
  popis       text,
  cena_bodov  integer NOT NULL CHECK (cena_bodov > 0),
  aktivna     boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Ak tabuľka už existovala bez stĺpca `aktivna`, doplň ho
ALTER TABLE public.odmeny
  ADD COLUMN IF NOT EXISTS aktivna boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_odmeny_obec_id ON public.odmeny(obec_id);

-- 3) Nákupy odmien
CREATE TABLE IF NOT EXISTS public.odmeny_nakupy (
  id          bigserial PRIMARY KEY,
  obec_id     bigint NOT NULL REFERENCES public.obce(id) ON DELETE CASCADE,
  odmena_id   bigint NOT NULL REFERENCES public.odmeny(id) ON DELETE RESTRICT,
  obyvatel_id bigint NOT NULL REFERENCES public.obyvatelia(id) ON DELETE CASCADE,
  body_cena   integer NOT NULL CHECK (body_cena > 0),
  stav        text NOT NULL DEFAULT 'rezervovane'
    CHECK (stav IN ('rezervovane','schvalene','odmietnute','vydane')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_odmeny_nakupy_obec_id ON public.odmeny_nakupy(obec_id);
CREATE INDEX IF NOT EXISTS idx_odmeny_nakupy_obyvatel_id ON public.odmeny_nakupy(obyvatel_id);

-- 4) RLS pre odmeny / nákupy
ALTER TABLE public.odmeny ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.odmeny_nakupy ENABLE ROW LEVEL SECURITY;

-- Zmaž staré politiky, ak už existujú
DROP POLICY IF EXISTS "Mayor can manage rewards" ON public.odmeny;
DROP POLICY IF EXISTS "Resident can view rewards in own municipality" ON public.odmeny;
DROP POLICY IF EXISTS "Mayor can manage reward purchases" ON public.odmeny_nakupy;
DROP POLICY IF EXISTS "Resident can view own purchases" ON public.odmeny_nakupy;
DROP POLICY IF EXISTS "Resident can buy reward" ON public.odmeny_nakupy;

-- Starosta (admin) vidí/spravuje odmeny svojej obce
CREATE POLICY "Mayor can manage rewards" ON public.odmeny
FOR ALL
USING (obec_id IN (SELECT id FROM public.obce WHERE auth_user_id = auth.uid()))
WITH CHECK (obec_id IN (SELECT id FROM public.obce WHERE auth_user_id = auth.uid()));

-- Starosta (admin) vidí/spravuje nákupy odmien svojej obce
CREATE POLICY "Mayor can manage reward purchases" ON public.odmeny_nakupy
FOR ALL
USING (obec_id IN (SELECT id FROM public.obce WHERE auth_user_id = auth.uid()))
WITH CHECK (obec_id IN (SELECT id FROM public.obce WHERE auth_user_id = auth.uid()));

-- Obyvateľ vidí odmeny iba svojej obce (a len aktívne)
CREATE POLICY "Resident can view rewards in own municipality" ON public.odmeny
FOR SELECT
USING (
  aktivna = true
  AND EXISTS (
    SELECT 1
    FROM public.obyvatelia o
    WHERE o.auth_user_id = auth.uid()
      AND o.obec_id = odmeny.obec_id
  )
);

-- Obyvateľ vidí iba svoje nákupy
CREATE POLICY "Resident can view own purchases" ON public.odmeny_nakupy
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.obyvatelia o
    WHERE o.auth_user_id = auth.uid()
      AND o.id = odmeny_nakupy.obyvatel_id
  )
);

-- Obyvateľ môže vytvoriť nákup iba pre seba a iba v svojej obci
CREATE POLICY "Resident can buy reward" ON public.odmeny_nakupy
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.obyvatelia o
    JOIN public.odmeny r ON r.id = odmeny_nakupy.odmena_id
    WHERE o.auth_user_id = auth.uid()
      AND o.id = odmeny_nakupy.obyvatel_id
      AND o.obec_id = r.obec_id
      AND odmeny_nakupy.obec_id = r.obec_id
      AND r.aktivna = true
  )
);

