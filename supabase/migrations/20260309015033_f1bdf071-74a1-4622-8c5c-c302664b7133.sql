ALTER TABLE public.sov_lines
ADD COLUMN start_date date,
ADD COLUMN end_date date,
ADD COLUMN real_cost numeric DEFAULT 0;