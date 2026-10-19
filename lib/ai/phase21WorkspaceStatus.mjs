export function inspectPhase21Workspace({ schema = '', captionPage = '', altPage = '', backgroundPage = '' } = {}) {
  const has = (text, pattern) => typeof text === 'string' && pattern.test(text);
  return Object.freeze({
    sourceOnly: true,
    paidAiReady: false,
    approvedNeonMigration: false,
    aiQuotaLimitField: has(schema, /\blimitValue\s+Int\b/) ? 'limitValue' : 'UNKNOWN',
    hasCaptionPage: has(captionPage, /CaptionGeneratorClient/),
    hasAltTextPage: has(altPage, /AltTextGeneratorClient/),
    hasBackgroundPage: has(backgroundPage, /BackgroundRemoverClient/),
    nextSteps: ['Local caption editor', 'Local alt text review', 'Offline solid-color removal', 'Release gate review'],
  });
}
