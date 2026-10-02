import { describe, expect, it } from 'vitest';
import { cloudConfigurationIssues, loadConfig, publicConfigStatus } from '../server/config.js';

describe('Google configuration', () => {
  it('keeps demo mode available without Google credentials', () => {
    const settings = loadConfig({});
    expect(settings.demoMode).toBe(true);
    expect(settings.host).toBe('127.0.0.1');
    expect(settings.aiProvider).toBe('gemini');
    expect(settings.geminiApiKey).toBeUndefined();
    expect(cloudConfigurationIssues(settings)).toEqual(['Neither GEMINI_API_KEY nor GOOGLE_API_KEY is set. Add a key to the local .env file.']);
    expect(publicConfigStatus(settings).configured).toBe(false);
  });

  it('uses API key priority and preserves the legacy Gemma text alias', () => {
    const settings = loadConfig({
      GEMINI_API_KEY: ' preferred-key ', GOOGLE_API_KEY: 'fallback-key',
      GEMINI_TEXT_MODEL: 'old-gemma-model',
    });
    expect(settings.geminiApiKey).toBe('preferred-key');
    expect(settings.gemmaModel).toBe('old-gemma-model');
    expect(settings.textModel).toBe(settings.gemmaModel);
    expect(settings.vertexModelsExplicit).toBe(false);

    const fallback = loadConfig({ GOOGLE_API_KEY: 'fallback-key' });
    expect(fallback.geminiApiKey).toBe('fallback-key');
  });

  it('gives GEMMA_MODEL priority over the legacy alias and configures distinct model roles', () => {
    const settings = loadConfig({
      GEMMA_MODEL: 'gemma-custom', GEMINI_TEXT_MODEL: 'legacy-custom',
      GEMINI_MODEL: 'gemini-control', GEMINI_LIVE_MODEL: 'gemini-speech',
    });
    expect(settings.gemmaModel).toBe('gemma-custom');
    expect(settings.textModel).toBe('gemma-custom');
    expect(settings.geminiModel).toBe('gemini-control');
    expect(settings.liveModel).toBe('gemini-speech');
    expect(settings.vertexModelsExplicit).toBe(true);
  });

  it('does not claim Vertex is configured without project and all explicit models', () => {
    const incomplete = loadConfig({ AI_PROVIDER: 'vertex', GOOGLE_CLOUD_PROJECT: 'project-id' });
    expect(cloudConfigurationIssues(incomplete)).toContain(
      'Vertex AI requires explicit GEMMA_MODEL, GEMINI_MODEL, and GEMINI_LIVE_MODEL values.',
    );
    expect(cloudConfigurationIssues(incomplete)).toContain('No local ADC credential file was detected for Vertex AI.');
    expect(publicConfigStatus(incomplete).configured).toBe(false);

    const complete = loadConfig({
      AI_PROVIDER: 'vertex', GOOGLE_CLOUD_PROJECT: 'project-id',
      GEMMA_MODEL: 'gemma-a', GEMINI_MODEL: 'gemini-b', GEMINI_LIVE_MODEL: 'gemini-c',
    });
    expect(cloudConfigurationIssues(complete)).toContain('No local ADC credential file was detected for Vertex AI.');
    expect(cloudConfigurationIssues(complete)).not.toContain(
      'Vertex AI requires explicit GEMMA_MODEL, GEMINI_MODEL, and GEMINI_LIVE_MODEL values.',
    );
  });

  it('uses requested model defaults and keeps public status free of credentials and credential paths', () => {
    const settings = loadConfig({
      GEMINI_API_KEY: 'do-not-expose-this', GOOGLE_APPLICATION_CREDENTIALS: 'C:\\private\\service-account.json',
    });
    expect(settings.gemmaModel).toBe('gemma-4-31b-it');
    expect(settings.geminiModel).toBe('gemini-3.8-flash');
    expect(settings.liveModel).toBe('gemini-3.8-live');
    const serialized = JSON.stringify(publicConfigStatus(settings));
    expect(serialized).not.toContain('do-not-expose-this');
    expect(serialized).not.toContain('service-account.json');
    expect(serialized).not.toContain('GOOGLE_APPLICATION_CREDENTIALS');
    expect(publicConfigStatus(settings)).toMatchObject({
      configured: true, gemmaModel: 'gemma-4-31b-it', geminiModel: 'gemini-3.8-flash',
    });
  });

  it('rejects invalid provider, mode, port, and model IDs', () => {
    expect(() => loadConfig({ AI_PROVIDER: 'unknown' })).toThrow('AI_PROVIDER');
    expect(() => loadConfig({ DEMO_MODE: 'yes' })).toThrow('DEMO_MODE');
    expect(() => loadConfig({ PORT: '0' })).toThrow('PORT');
    expect(() => loadConfig({ PORT: '3.14' })).toThrow('PORT');
    expect(() => loadConfig({ GEMMA_MODEL: '../secret' })).toThrow('GEMMA_MODEL');
    expect(() => loadConfig({ GEMINI_MODEL: 'https://example.com/model' })).toThrow('GEMINI_MODEL');
    expect(loadConfig({ GEMINI_MODEL: 'projects/p/locations/global/models/gemini-custom' }).geminiModel)
      .toBe('projects/p/locations/global/models/gemini-custom');
  });

});
