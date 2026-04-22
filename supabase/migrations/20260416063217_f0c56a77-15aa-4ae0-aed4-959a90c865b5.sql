
CREATE TABLE public.activity_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  file_name text NOT NULL,
  file_type USER-DEFINED,
  action text NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  details jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT activity_log_pkey PRIMARY KEY (id)
);
CREATE TABLE public.allocations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  source_file_id uuid NOT NULL,
  container_id uuid NOT NULL,
  method USER-DEFINED NOT NULL,
  items_count integer DEFAULT 0,
  pallets integer DEFAULT 0,
  cartons integer DEFAULT 0,
  gross_weight_kg numeric DEFAULT 0,
  volume_m3 numeric DEFAULT 0,
  allocation_data jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT allocations_pkey PRIMARY KEY (id),
  CONSTRAINT allocations_source_file_id_fkey FOREIGN KEY (source_file_id) REFERENCES public.uploaded_files(id),
  CONSTRAINT allocations_container_id_fkey FOREIGN KEY (container_id) REFERENCES public.containers(id)
);
CREATE TABLE public.app_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  setting_key text NOT NULL UNIQUE,
  setting_value jsonb NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT app_settings_pkey PRIMARY KEY (id)
);
CREATE TABLE public.containers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  container_number text NOT NULL UNIQUE,
  seal_number text,
  is_dummy boolean NOT NULL DEFAULT false,
  source_file_id uuid,
  total_pallets integer DEFAULT 0,
  total_cartons integer DEFAULT 0,
  gross_weight_kg numeric DEFAULT 0,
  volume_m3 numeric DEFAULT 0,
  status USER-DEFINED NOT NULL DEFAULT 'pending'::container_status,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT containers_pkey PRIMARY KEY (id),
  CONSTRAINT containers_source_file_id_fkey FOREIGN KEY (source_file_id) REFERENCES public.uploaded_files(id)
);
CREATE TABLE public.file_rows (
  id bigint NOT NULL DEFAULT nextval('file_rows_id_seq'::regclass),
  file_id uuid,
  row_data jsonb,
  CONSTRAINT file_rows_pkey PRIMARY KEY (id),
  CONSTRAINT file_rows_file_id_fkey FOREIGN KEY (file_id) REFERENCES public.uploaded_files(id)
);
CREATE TABLE public.uploaded_files (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  file_name text NOT NULL,
  file_type USER-DEFINED NOT NULL,
  file_size bigint,
  row_count integer DEFAULT 0,
  status USER-DEFINED NOT NULL DEFAULT 'uploaded'::file_status,
  storage_path text,
  parsed_data jsonb,
  column_mapping jsonb,
  has_container_info boolean DEFAULT false,
  has_seal_info boolean DEFAULT false,
  rows_with_containers integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT uploaded_files_pkey PRIMARY KEY (id)
);