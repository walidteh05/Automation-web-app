-- Automation Management System
-- Database Schema
-- PostgreSQL / Supabase


CREATE TABLE public.profiles (
    id uuid PRIMARY KEY,
    display_name text NOT NULL,
    role text NOT NULL
        CHECK (role IN ('admin', 'technician')),
    created_at timestamptz DEFAULT now()
);

CREATE TABLE public.machines (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_code text NOT NULL UNIQUE,
    machine_name text NOT NULL,
    machine_type text NOT NULL,
    location text NOT NULL,
    status text NOT NULL DEFAULT 'stop'
        CHECK (status IN (
            'running',
            'stop',
            'alarm',
            'maintenance'
        )),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    deleted_at timestamptz
);


CREATE TABLE public.alarm_records (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_id uuid NOT NULL,
    alarm_code text NOT NULL,
    alarm_description text NOT NULL,
    occurred_at timestamptz NOT NULL DEFAULT now(),
    cause text,
    status text NOT NULL DEFAULT 'open'
        CHECK (status IN (
            'open',
            'in_progress',
            'closed'
        )),
    created_by uuid,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    CONSTRAINT alarm_machine_fk
        FOREIGN KEY (machine_id)
        REFERENCES public.machines(id),

    CONSTRAINT alarm_created_by_fk
        FOREIGN KEY (created_by)
        REFERENCES public.profiles(id)
);


CREATE TABLE public.maintenance_records (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_id uuid NOT NULL,
    technician_id uuid NOT NULL,
    description text NOT NULL,
    work_performed text,
    maintenance_at timestamptz NOT NULL DEFAULT now(),
    status text NOT NULL DEFAULT 'completed'
        CHECK (status IN (
            'planned',
            'in_progress',
            'completed',
            'cancelled'
        )),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    CONSTRAINT maintenance_machine_fk
        FOREIGN KEY (machine_id)
        REFERENCES public.machines(id),

    CONSTRAINT maintenance_technician_fk
        FOREIGN KEY (technician_id)
        REFERENCES public.profiles(id)
);


CREATE INDEX idx_machines_status
    ON public.machines(status);

CREATE INDEX idx_machines_location
    ON public.machines(location);

CREATE INDEX idx_alarm_records_machine_id
    ON public.alarm_records(machine_id);

CREATE INDEX idx_alarm_records_status
    ON public.alarm_records(status);

CREATE INDEX idx_alarm_records_occurred_at
    ON public.alarm_records(occurred_at);

CREATE INDEX idx_maintenance_records_machine_id
    ON public.maintenance_records(machine_id);

CREATE INDEX idx_maintenance_records_status
    ON public.maintenance_records(status);

CREATE INDEX idx_maintenance_records_maintenance_at
    ON public.maintenance_records(maintenance_at);