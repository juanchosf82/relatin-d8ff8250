
DELETE FROM project_documents
WHERE id NOT IN (
  SELECT DISTINCT ON (project_id, category, name) id
  FROM project_documents
  ORDER BY project_id, category, name, created_at ASC
);
