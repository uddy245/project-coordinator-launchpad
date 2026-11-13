/**
 * Lesson naming convention, in one place.
 *
 * Three names exist for every lesson:
 *   pipeline folder   lesson-NN-<folderSlug>   video-production/, docs/scripts/lesson-NN-<folderSlug>.md
 *   lesson slug       <slug>                   lessons.slug, docs/lessons/<slug>.md, the /lessons/<slug> route
 *   storage key       <slug>/<slug>.<ext>      inside the lesson-videos bucket
 *
 * The lesson slug is the folder name minus the `lesson-NN-` prefix, with one
 * exception: lesson 17's folder is `lesson-17-pushback` but its slug is
 * `push-back` (docs/lessons/push-back.md). Storage keys always use the lesson
 * slug, never the pipeline folder name — the player derives the captions URL
 * from the video URL (<slug>.mp4 -> <slug>.vtt), so both must sit under it.
 */

// Folder-derived slug -> lesson slug, where the two differ.
export const SLUG_OVERRIDE = { pushback: "push-back" };

const PIPELINE_RE = /^lesson-(\d{2})-([a-z0-9]+(?:-[a-z0-9]+)*)$/;

/**
 * "lesson-17-pushback" -> { pipelineSlug, number: 17, folderSlug: "pushback", slug: "push-back" }.
 * Throws on anything that is not a pipeline folder name, so a typo can never
 * become a storage key.
 */
export function parsePipelineSlug(pipelineSlug) {
  const m = PIPELINE_RE.exec(String(pipelineSlug));
  if (!m) {
    throw new Error(
      `"${pipelineSlug}" is not a pipeline folder name. Expected lesson-NN-<slug>, e.g. lesson-20-raid-logs.`
    );
  }
  const folderSlug = m[2];
  return {
    pipelineSlug: m[0],
    number: parseInt(m[1], 10),
    folderSlug,
    slug: SLUG_OVERRIDE[folderSlug] ?? folderSlug,
  };
}

/** Key inside the lesson-videos bucket: "<slug>/<slug>.<ext>". */
export function lessonVideoKey(slug, ext = "mp4") {
  return `${slug}/${slug}.${ext}`;
}
