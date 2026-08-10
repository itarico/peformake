-- Fix existing arts that have revision_requested status but no revision_comment
-- This syncs the comment from art_comments table to the arts table

UPDATE arts 
SET revision_comment = (
  SELECT comment FROM art_comments 
  WHERE art_comments.art_id = arts.id 
  AND art_comments.action = 'request_revision'
  ORDER BY created_at DESC 
  LIMIT 1
)
WHERE status = 'revision_requested' 
AND (revision_comment IS NULL OR revision_comment = '');