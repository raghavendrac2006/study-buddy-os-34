-- Practice question bank
CREATE TABLE public.practice_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'aptitude',
  topic text NOT NULL DEFAULT 'General',
  difficulty text NOT NULL DEFAULT 'medium',
  question text NOT NULL,
  options text[] NOT NULL DEFAULT '{}',
  correct_index integer NOT NULL DEFAULT 0,
  explanation text,
  estimated_seconds integer NOT NULL DEFAULT 90,
  source text,
  archived boolean NOT NULL DEFAULT false,
  times_attempted integer NOT NULL DEFAULT 0,
  times_correct integer NOT NULL DEFAULT 0,
  last_attempted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.practice_questions TO authenticated;
GRANT ALL ON public.practice_questions TO service_role;
ALTER TABLE public.practice_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own practice_questions" ON public.practice_questions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX practice_questions_user_idx ON public.practice_questions (user_id, category, archived);
CREATE INDEX practice_questions_topic_idx ON public.practice_questions (user_id, topic);
CREATE TRIGGER practice_questions_updated BEFORE UPDATE ON public.practice_questions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Practice sessions
CREATE TABLE public.practice_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode text NOT NULL DEFAULT 'mixed',
  practiced_on date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  question_count integer NOT NULL DEFAULT 0,
  correct_count integer NOT NULL DEFAULT 0,
  duration_seconds integer NOT NULL DEFAULT 0,
  target_minutes integer NOT NULL DEFAULT 12,
  topics jsonb NOT NULL DEFAULT '{}'::jsonb,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.practice_sessions TO authenticated;
GRANT ALL ON public.practice_sessions TO service_role;
ALTER TABLE public.practice_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own practice_sessions" ON public.practice_sessions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX practice_sessions_user_idx ON public.practice_sessions (user_id, practiced_on DESC);

-- Practice attempts
CREATE TABLE public.practice_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.practice_sessions(id) ON DELETE CASCADE,
  question_id uuid REFERENCES public.practice_questions(id) ON DELETE CASCADE,
  selected_index integer,
  is_correct boolean NOT NULL DEFAULT false,
  seconds_taken integer NOT NULL DEFAULT 0,
  topic text,
  category text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.practice_attempts TO authenticated;
GRANT ALL ON public.practice_attempts TO service_role;
ALTER TABLE public.practice_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own practice_attempts" ON public.practice_attempts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX practice_attempts_user_idx ON public.practice_attempts (user_id, created_at DESC);
CREATE INDEX practice_attempts_question_idx ON public.practice_attempts (question_id);

-- Coding & DSA problem log
CREATE TABLE public.coding_problems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  platform text NOT NULL DEFAULT 'LeetCode',
  url text,
  category text NOT NULL DEFAULT 'dsa',
  topic text NOT NULL DEFAULT 'General',
  difficulty text NOT NULL DEFAULT 'medium',
  language text,
  minutes_taken integer NOT NULL DEFAULT 0,
  attempts integer NOT NULL DEFAULT 1,
  result text NOT NULL DEFAULT 'solved',
  solved_on date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  learned text,
  difficulties text,
  approach text,
  needs_revision boolean NOT NULL DEFAULT false,
  revision_due_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coding_problems TO authenticated;
GRANT ALL ON public.coding_problems TO service_role;
ALTER TABLE public.coding_problems ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own coding_problems" ON public.coding_problems FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX coding_problems_user_idx ON public.coding_problems (user_id, solved_on DESC);
CREATE INDEX coding_problems_topic_idx ON public.coding_problems (user_id, topic);
CREATE TRIGGER coding_problems_updated BEFORE UPDATE ON public.coding_problems FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Daily practice preferences on the existing profile
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS practice_questions_per_day integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS practice_target_minutes integer NOT NULL DEFAULT 12,
  ADD COLUMN IF NOT EXISTS practice_mode text NOT NULL DEFAULT 'mixed',
  ADD COLUMN IF NOT EXISTS practice_difficulty text NOT NULL DEFAULT 'mixed';