DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'consulting_months' AND policyname = 'Anon can view consulting months'
  ) THEN
    CREATE POLICY "Anon can view consulting months"
    ON public.consulting_months
    FOR SELECT
    USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'framework_instances' AND policyname = 'Anon can manage framework instances'
  ) THEN
    CREATE POLICY "Anon can manage framework instances"
    ON public.framework_instances
    FOR ALL
    USING (true)
    WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'framework_answers' AND policyname = 'Anon can manage framework answers'
  ) THEN
    CREATE POLICY "Anon can manage framework answers"
    ON public.framework_answers
    FOR ALL
    USING (true)
    WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'frameworks' AND policyname = 'Anon can view frameworks'
  ) THEN
    CREATE POLICY "Anon can view frameworks"
    ON public.frameworks
    FOR SELECT
    USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'framework_questions' AND policyname = 'Anon can view framework questions'
  ) THEN
    CREATE POLICY "Anon can view framework questions"
    ON public.framework_questions
    FOR SELECT
    USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'ai_analyses' AND policyname = 'Anon can view ai analyses'
  ) THEN
    CREATE POLICY "Anon can view ai analyses"
    ON public.ai_analyses
    FOR SELECT
    USING (true);
  END IF;
END $$;