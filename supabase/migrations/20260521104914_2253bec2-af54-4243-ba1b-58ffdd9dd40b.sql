INSERT INTO public.profiles (id, username, full_name, phone_number, hint_question, hint_answer, user_status, created_at, updated_at)
VALUES ('fc659dc4-6903-4366-b27d-8a03cce2e6db','Sagar','Sagar','9767607899','What city were you born in?','Sagar','active','2026-01-10 08:29:56.473883+00', now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_roles (user_id, role) VALUES ('fc659dc4-6903-4366-b27d-8a03cce2e6db','user')
ON CONFLICT (user_id, role) DO NOTHING;