DO $$
DECLARE owner_id uuid := '5fd573a4-3eaa-4f6e-9a56-6e4c84ed03c6';
        t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'subjects','learning_days','tasks','study_sessions','materials','material_analyses',
    'topics','learning_objectives','learning_plans','plan_activities','plan_adjustments',
    'assessments','performance_records','topic_mastery','mastery_history','revision_schedule'
  ] LOOP
    EXECUTE format('UPDATE public.%I SET user_id = %L WHERE user_id <> %L', t, owner_id, owner_id);
  END LOOP;
END $$;