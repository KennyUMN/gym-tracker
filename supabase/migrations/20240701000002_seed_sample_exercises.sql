INSERT INTO exercises (name, category, primary_muscles, secondary_muscles, equipment, force_type, mechanic_type, difficulty, instructions) VALUES
('Barbell Bench Press', 'Chest', ARRAY['pectorals'], ARRAY['triceps','deltoids'], ARRAY['barbell'], 'push', 'compound', 'intermediate', 'Lie on a flat bench, lower the bar to your chest, press up.'),
('Incline Dumbbell Press', 'Chest', ARRAY['pectorals'], ARRAY['triceps','deltoids'], ARRAY['dumbbell'], 'push', 'compound', 'intermediate', 'On an incline bench, press dumbbells up from shoulder height.'),
('Barbell Back Squat', 'Legs', ARRAY['quadriceps'], ARRAY['glutes','hamstrings'], ARRAY['barbell'], 'legs', 'compound', 'intermediate', 'Bar on upper back, squat down until thighs are parallel, drive back up.'),
('Conventional Deadlift', 'Back', ARRAY['hamstrings','glutes'], ARRAY['lower back','traps'], ARRAY['barbell'], 'pull', 'compound', 'advanced', 'Hinge at the hips, grip the bar, drive through the floor to stand up.'),
('Pull-Up', 'Back', ARRAY['lats'], ARRAY['biceps'], ARRAY['bodyweight'], 'pull', 'compound', 'intermediate', 'Hang from a bar, pull your chin over the bar, lower with control.'),
('Barbell Row', 'Back', ARRAY['lats'], ARRAY['biceps','rear deltoids'], ARRAY['barbell'], 'pull', 'compound', 'intermediate', 'Hinge forward, pull the bar to your lower chest, squeeze shoulder blades.'),
('Overhead Press', 'Shoulders', ARRAY['deltoids'], ARRAY['triceps'], ARRAY['barbell'], 'push', 'compound', 'intermediate', 'Press the bar from shoulder height straight overhead.'),
('Dumbbell Lateral Raise', 'Shoulders', ARRAY['deltoids'], ARRAY[]::text[], ARRAY['dumbbell'], 'push', 'isolation', 'beginner', 'Raise dumbbells out to the sides to shoulder height.'),
('Barbell Bicep Curl', 'Arms', ARRAY['biceps'], ARRAY[]::text[], ARRAY['barbell'], 'pull', 'isolation', 'beginner', 'Curl the bar up toward your shoulders, keeping elbows fixed.'),
('Triceps Pushdown', 'Arms', ARRAY['triceps'], ARRAY[]::text[], ARRAY['cable'], 'push', 'isolation', 'beginner', 'Push the cable attachment down until arms are fully extended.'),
('Leg Press', 'Legs', ARRAY['quadriceps'], ARRAY['glutes'], ARRAY['machine'], 'legs', 'compound', 'beginner', 'Push the platform away by extending your legs.'),
('Romanian Deadlift', 'Legs', ARRAY['hamstrings'], ARRAY['glutes'], ARRAY['barbell'], 'pull', 'compound', 'intermediate', 'Hinge at the hips with a slight knee bend, lower the bar along your legs.'),
('Lat Pulldown', 'Back', ARRAY['lats'], ARRAY['biceps'], ARRAY['machine'], 'pull', 'compound', 'beginner', 'Pull the bar down to your upper chest, control it back up.'),
('Dumbbell Shoulder Press', 'Shoulders', ARRAY['deltoids'], ARRAY['triceps'], ARRAY['dumbbell'], 'push', 'compound', 'beginner', 'Press dumbbells from shoulder height straight overhead.'),
('Plank', 'Core', ARRAY['abdominals'], ARRAY[]::text[], ARRAY['bodyweight'], 'static', 'isolation', 'beginner', 'Hold a straight-body position supported on forearms and toes.')
ON CONFLICT DO NOTHING;
