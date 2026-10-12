-- Huella de los datos: filas y md5 del contenido de cada tabla (sin updated_at,
-- que el seed puede tocar). Si dos huellas coinciden, no se perdió ni cambió nada.
SELECT string_agg(
         format('%s %s', table_name,
           (xpath('/row/c/text()', query_to_xml(format(
             'select count(*)||'':''||coalesce(md5(string_agg((to_jsonb(t) - ''updated_at'')::text, '''' order by (to_jsonb(t) - ''updated_at'')::text)),''-'') as c from %I t',
             table_name), false, true, '')))[1]::text),
         E'\n' ORDER BY table_name)
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  AND table_name <> '_prisma_migrations';
