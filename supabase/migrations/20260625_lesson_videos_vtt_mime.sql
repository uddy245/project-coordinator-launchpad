-- Migration: 20260625_lesson_videos_vtt_mime.sql
-- Purpose: Allow WebVTT caption files to be uploaded to the lesson-videos
-- bucket alongside their MP4s. The <track> element in video-player.tsx
-- fetches <slug>/<slug>.vtt from the same bucket; the bucket's mime-type
-- allowlist blocked that upload until now.
update storage.buckets
set allowed_mime_types = array['video/mp4', 'video/webm', 'text/vtt']
where id = 'lesson-videos';
