export function reviewUserAltText(input) {
  if (typeof input !== 'string' || input.length > 1000) throw new Error('Enter a short text description.');
  const original=input.replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim();
  if (!original) return {revision:'',characterCount:0,issues:['Write what is visibly present before reviewing.'],ready:false,aiGenerated:false,imageAnalyzed:false};
  const revision=original.replace(/^(?:this is\s+)?(?:an?\s+)?(?:image|photo|picture|photograph)\s+of\s+/i,'').replace(/^shows\s+/i,'').trim();
  const clear=revision ? revision[0].toUpperCase()+revision.slice(1) : original;
  const output=/[.!?]$/.test(clear)?clear:`${clear}.`;
  const issues=[];
  if (original.length > 180) issues.push('Consider a shorter description (about 180 characters or fewer).');
  if (/\b(maybe|probably|perhaps|seems|looks like)\b/i.test(original)) issues.push('Avoid guesses. Describe visible details only.');
  if (/\b(image|photo|picture)\s+of\b/i.test(original)) issues.push('You can remove phrases such as "image of".');
  if (original.length < 12) issues.push('Add concrete visible objects, actions, colors or location.');
  return {revision:output,characterCount:output.length,issues,ready:issues.length===0,aiGenerated:false,imageAnalyzed:false};
}
