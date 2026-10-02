import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadDotEnv } from 'dotenv';

export const envPath = fileURLToPath(new URL('../.env', import.meta.url));
if (existsSync(envPath)) loadDotEnv({ path: envPath, quiet: true });

export type AiProvider = 'gemini' | 'vertex';
export interface AppConfig {
  host: '127.0.0.1';
  port: number;
  demoMode: boolean;
  aiProvider: AiProvider;
  geminiApiKey: string | undefined;
  googleCloudProject: string | undefined;
  googleCloudLocation: string;
  gemmaModel: string;
  geminiModel: string;
  /** @deprecated Use gemmaModel. Retained for existing consumers. */
  textModel: string;
  liveModel: string;
  /** Vertex requires all three model variables to be explicitly configured. */
  vertexModelsExplicit: boolean;
  /** Boolean only; credential paths and contents never enter the public status. */
  vertexAdcConfigured: boolean;
}

const value = (env: NodeJS.ProcessEnv, name: string) => env[name]?.trim() || undefined;
const defaults = {
  gemmaModel: 'gemma-4-31b-it',
  geminiModel: 'gemini-3.8-flash',
  liveModel: 'gemini-3.8-live',
} as const;

function hasLocalAdc(env: NodeJS.ProcessEnv): boolean {
  const explicitPath = value(env, 'GOOGLE_APPLICATION_CREDENTIALS');
  const candidates = explicitPath
    ? [explicitPath]
    : [
        env.CLOUDSDK_CONFIG ? join(env.CLOUDSDK_CONFIG, 'application_default_credentials.json') : undefined,
        env.APPDATA ? join(env.APPDATA, 'gcloud', 'application_default_credentials.json') : undefined,
        join(homedir(), '.config', 'gcloud', 'application_default_credentials.json'),
      ].filter((path): path is string => Boolean(path));
  return candidates.some((path) => existsSync(path));
}

function validModel(value: string, label: string): string {
  // Accept simple Developer API IDs and SDK resource names. Never accept a URL.
  if (value.length > 512 || !value.split('/').every((part) => /^[A-Za-z0-9][A-Za-z0-9._~-]{0,127}$/.test(part))) {
    throw new Error(`${label} must be a model ID or resource name, not a URL.`);
  }
  return value;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const provider = value(env, 'AI_PROVIDER') ?? 'gemini';
  if (provider !== 'gemini' && provider !== 'vertex') {
    throw new Error('AI_PROVIDER must be gemini or vertex.');
  }
  const port = Number(value(env, 'PORT') ?? '3001');
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }
  const demoMode = value(env, 'DEMO_MODE') ?? 'true';
  if (demoMode !== 'true' && demoMode !== 'false') {
    throw new Error('DEMO_MODE must be true or false.');
  }

  // GEMINI_TEXT_MODEL remains a documented migration alias. The role is Gemma.
  const gemmaModel = validModel(
    value(env, 'GEMMA_MODEL') ?? value(env, 'GEMINI_TEXT_MODEL') ?? defaults.gemmaModel,
    'GEMMA_MODEL',
  );
  const geminiModel = validModel(value(env, 'GEMINI_MODEL') ?? defaults.geminiModel, 'GEMINI_MODEL');
  const liveModel = validModel(value(env, 'GEMINI_LIVE_MODEL') ?? defaults.liveModel, 'GEMINI_LIVE_MODEL');

  return {
    host: '127.0.0.1',
    port,
    demoMode: demoMode === 'true',
    aiProvider: provider,
    // Explicitly prefer the project's GEMINI_API_KEY over an ambient GOOGLE_API_KEY.
    geminiApiKey: value(env, 'GEMINI_API_KEY') ?? value(env, 'GOOGLE_API_KEY'),
    googleCloudProject: value(env, 'GOOGLE_CLOUD_PROJECT'),
    googleCloudLocation: value(env, 'GOOGLE_CLOUD_LOCATION') ?? 'global',
    gemmaModel,
    geminiModel,
    textModel: gemmaModel,
    liveModel,
    vertexModelsExplicit: Boolean(value(env, 'GEMMA_MODEL') && value(env, 'GEMINI_MODEL') && value(env, 'GEMINI_LIVE_MODEL')),
    vertexAdcConfigured: hasLocalAdc(env),
  };
}

export function cloudConfigurationIssues(settings: AppConfig): string[] {
  if (settings.aiProvider === 'gemini' && !settings.geminiApiKey) {
    return ['Neither GEMINI_API_KEY nor GOOGLE_API_KEY is set. Add a key to the local .env file.'];
  }
  if (settings.aiProvider === 'vertex') {
    const issues: string[] = [];
    if (!settings.googleCloudProject) issues.push('GOOGLE_CLOUD_PROJECT is missing for Vertex AI.');
    if (!settings.vertexModelsExplicit) {
      issues.push('Vertex AI requires explicit GEMMA_MODEL, GEMINI_MODEL, and GEMINI_LIVE_MODEL values.');
    }
    if (!settings.vertexAdcConfigured) issues.push('No local ADC credential file was detected for Vertex AI.');
    return issues;
  }
  return [];
}

export function publicConfigStatus(settings: AppConfig) {
  return {
    demoMode: settings.demoMode,
    provider: settings.aiProvider,
    configured: cloudConfigurationIssues(settings).length === 0,
    credentialsConfigured: settings.aiProvider === 'gemini' ? Boolean(settings.geminiApiKey) : settings.vertexAdcConfigured,
    gemmaModel: settings.gemmaModel,
    geminiModel: settings.geminiModel,
    textModel: settings.textModel,
    liveModel: settings.liveModel,
  };
}

export const config = loadConfig();
