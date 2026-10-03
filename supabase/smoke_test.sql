-- Optional smoke test: inserts one node pair, an edge, and a piece of evidence.
-- Safe to re-run; delete the rows afterwards if you don't want them.
with a as (
  insert into nodes (type, name) values ('person', 'Test Person')
  returning id
), b as (
  insert into nodes (type, name) values ('org', 'Test Org')
  returning id
), e as (
  insert into edges (source_id, target_id, type)
  select a.id, b.id, 'works_at' from a, b
  returning id
)
insert into evidence (edge_id, content, source_url, confidence)
select e.id, 'Smoke-test evidence row.', 'https://example.com', 0.9 from e;

select
  (select count(*) from nodes)    as nodes,
  (select count(*) from edges)    as edges,
  (select count(*) from evidence) as evidence;
