-- Permitir delete de artes para usuarios sem auth (designers via staff login)
CREATE POLICY "Anyone can delete arts from valid work months"
ON public.arts FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM work_months wm 
    WHERE wm.id = arts.work_month_id
  )
);

-- Permitir insert de artes para designers sem auth session
CREATE POLICY "Anyone can insert arts to valid work months"
ON public.arts FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM work_months wm 
    WHERE wm.id = work_month_id
  )
);