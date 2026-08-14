CREATE TABLE public.materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  title text NOT NULL,
  file_name text NOT NULL,
  mime_type text NOT NULL DEFAULT 'text/plain',
  storage_path text,
  size_bytes integer NOT NULL DEFAULT 0,
  char_count integer NOT NULL DEFAULT 0,
  extracted_text text,
  status text NOT NULL DEFAULT 'uploaded',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.materials TO authenticated;
GRANT ALL ON public.materials TO service_role;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own materials" ON public.materials FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER materials_updated BEFORE UPDATE ON public.materials FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.material_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  model text NOT NULL DEFAULT 'openrouter/auto',
  summary text,
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.material_analyses TO authenticated;
GRANT ALL ON public.material_analyses TO service_role;
ALTER TABLE public.material_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own analyses" ON public.material_analyses FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE CASCADE,
  material_id uuid REFERENCES public.materials(id) ON DELETE SET NULL,
  parent_id uuid REFERENCES public.topics(id) ON DELETE CASCADE,
  title text NOT NULL,
  kind text NOT NULL DEFAULT 'topic',
  description text,
  key_concepts text[] NOT NULL DEFAULT '{}'::text[],
  prerequisites text[] NOT NULL DEFAULT '{}'::text[],
  difficulty integer NOT NULL DEFAULT 3,
  estimated_minutes integer NOT NULL DEFAULT 45,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.topics TO authenticated;
GRANT ALL ON public.topics TO service_role;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own topics" ON public.topics FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER topics_updated BEFORE UPDATE ON public.topics FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX topics_user_subject_idx ON public.topics(user_id, subject_id);

CREATE TABLE public.learning_objectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  text text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_objectives TO authenticated;
GRANT ALL ON public.learning_objectives TO service_role;
ALTER TABLE public.learning_objectives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own objectives" ON public.learning_objectives FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.learning_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE CASCADE,
  material_id uuid REFERENCES public.materials(id) ON DELETE SET NULL,
  title text NOT NULL,
  target_date date,
  daily_minutes integer NOT NULL DEFAULT 120,
  preferred_days integer[] NOT NULL DEFAULT '{0,1,2,3,4,5,6}'::integer[],
  knowledge_level text NOT NULL DEFAULT 'beginner',
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'active',
  feasibility jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_plans TO authenticated;
GRANT ALL ON public.learning_plans TO service_role;
ALTER TABLE public.learning_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own plans" ON public.learning_plans FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER learning_plans_updated BEFORE UPDATE ON public.learning_plans FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.plan_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.learning_plans(id) ON DELETE CASCADE,
  topic_id uuid REFERENCES public.topics(id) ON DELETE CASCADE,
  scheduled_date date NOT NULL,
  activity_type text NOT NULL DEFAULT 'learn',
  title text NOT NULL,
  description text,
  estimated_minutes integer NOT NULL DEFAULT 30,
  actual_minutes integer NOT NULL DEFAULT 0,
  priority integer NOT NULL DEFAULT 3,
  status text NOT NULL DEFAULT 'pending',
  locked boolean NOT NULL DEFAULT false,
  source text NOT NULL DEFAULT 'ai',
  sort_order integer NOT NULL DEFAULT 0,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_activities TO authenticated;
GRANT ALL ON public.plan_activities TO service_role;
ALTER TABLE public.plan_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own activities" ON public.plan_activities FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER plan_activities_updated BEFORE UPDATE ON public.plan_activities FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX plan_activities_user_date_idx ON public.plan_activities(user_id, scheduled_date);

CREATE TABLE public.assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id uuid REFERENCES public.topics(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES public.learning_plans(id) ON DELETE SET NULL,
  activity_id uuid REFERENCES public.plan_activities(id) ON DELETE SET NULL,
  kind text NOT NULL DEFAULT 'self',
  score numeric NOT NULL DEFAULT 0,
  max_score numeric NOT NULL DEFAULT 100,
  notes text,
  taken_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessments TO authenticated;
GRANT ALL ON public.assessments TO service_role;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own assessments" ON public.assessments FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.performance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id uuid REFERENCES public.topics(id) ON DELETE CASCADE,
  activity_id uuid REFERENCES public.plan_activities(id) ON DELETE SET NULL,
  session_id uuid REFERENCES public.study_sessions(id) ON DELETE SET NULL,
  activity_type text NOT NULL DEFAULT 'learn',
  score numeric,
  confidence integer,
  difficulty integer,
  completion numeric NOT NULL DEFAULT 1,
  planned_minutes integer NOT NULL DEFAULT 0,
  actual_minutes integer NOT NULL DEFAULT 0,
  reflection text,
  signals jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.performance_records TO authenticated;
GRANT ALL ON public.performance_records TO service_role;
ALTER TABLE public.performance_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own performance" ON public.performance_records FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.topic_mastery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  mastery numeric NOT NULL DEFAULT 0,
  state text NOT NULL DEFAULT 'not_started',
  ease numeric NOT NULL DEFAULT 2.5,
  interval_days integer NOT NULL DEFAULT 0,
  reps integer NOT NULL DEFAULT 0,
  lapses integer NOT NULL DEFAULT 0,
  last_reviewed_at timestamptz,
  next_review_date date,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, topic_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.topic_mastery TO authenticated;
GRANT ALL ON public.topic_mastery TO service_role;
ALTER TABLE public.topic_mastery ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own mastery" ON public.topic_mastery FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER topic_mastery_updated BEFORE UPDATE ON public.topic_mastery FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.mastery_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  mastery numeric NOT NULL,
  state text NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mastery_history TO authenticated;
GRANT ALL ON public.mastery_history TO service_role;
ALTER TABLE public.mastery_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own mastery history" ON public.mastery_history FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.revision_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES public.learning_plans(id) ON DELETE CASCADE,
  due_date date NOT NULL,
  interval_days integer NOT NULL DEFAULT 1,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.revision_schedule TO authenticated;
GRANT ALL ON public.revision_schedule TO service_role;
ALTER TABLE public.revision_schedule ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own revisions" ON public.revision_schedule FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER revision_schedule_updated BEFORE UPDATE ON public.revision_schedule FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.plan_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES public.learning_plans(id) ON DELETE CASCADE,
  adjusted_on date NOT NULL DEFAULT CURRENT_DATE,
  reason text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_adjustments TO authenticated;
GRANT ALL ON public.plan_adjustments TO service_role;
ALTER TABLE public.plan_adjustments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own adjustments" ON public.plan_adjustments FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own material files read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'materials' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "own material files insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'materials' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "own material files update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'materials' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "own material files delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'materials' AND auth.uid()::text = (storage.foldername(name))[1]);