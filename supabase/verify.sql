-- Confirms the Buffalo-Track schema landed correctly.
select extname as extension from pg_extension where extname in ('vector','pgcrypto');

select table_name
from information_schema.tables
where table_schema = 'public' and table_name in ('nodes','edges','evidence')
order by table_name;

select indexname from pg_indexes
where schemaname = 'public' and tablename in ('nodes','edges','evidence')
order by tablename, indexname;

-- evidence.embedding dimension
select a.attname, format_type(a.atttypid, a.atttypmod) as type
from pg_attribute a
join pg_class c on c.oid = a.attrelid
where c.relname = 'evidence' and a.attname = 'embedding';
