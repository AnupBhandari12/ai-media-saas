export const LOCAL_CAPTION_STYLES = Object.freeze(['friendly', 'professional', 'energetic']);
function clean(value, max) {
  if (typeof value !== 'string') throw new Error('Description must be text.');
  const text = value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  if (text.length < 3 || text.length > max) throw new Error(`Enter 3 to ${max} characters.`);
  return text;
}
function end(text) { return /[.!?]$/.test(text) ? text : `${text}.`; }
function tagList(raw) {
  if (typeof raw !== 'string' || raw.length > 150) throw new Error('Invalid hashtags.');
  const words=raw.split(/[\s,]+/).map((v)=>v.replace(/^#+/, '').replace(/[^\p{L}\p{N}_]/gu, '')).filter(Boolean);
  return [...new Set(words)].slice(0,3).map((w)=>`#${w}`).join(' ');
}
export function createLocalCaptionDrafts({description, hashtags = ''}={}) {
  const source=clean(description,600);
  const tags=tagList(hashtags);
  const friendly=`${end(source)} What do you think?`;
  const professional=`${end(source)} Share your thoughts with us.`;
  const energetic=`${end(source)} Let's make it happen!`;
  const withTags=(t)=>tags ? `${t}

${tags}` : t;
  return Object.freeze({
    mode: 'LOCAL_TEXT_TEMPLATE', aiGenerated: false, imageAnalyzed: false, quotaConsumed: false,
    drafts: Object.freeze([
      {style:'friendly',text:withTags(friendly)},
      {style:'professional',text:withTags(professional)},
      {style:'energetic',text:withTags(energetic)},
    ]),
  });
}
