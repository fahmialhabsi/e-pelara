"use strict";

const {
  buildMockNarrative,
} = require("./mockNarrativeProvider");

const {
  buildRuleEnhancedNarrative,
} = require("./ruleEnhancedNarrativeProvider");

const {
  buildOllamaNarrative,
} = require("./ollamaNarrativeProvider");

const INTERNAL_PROVIDERS = ["mock", "rule_enhanced"];
const EXTERNAL_PROVIDERS = ["openai", "ollama"];
const SUPPORTED_PROVIDERS = [...INTERNAL_PROVIDERS, ...EXTERNAL_PROVIDERS];

const normalizeProviderName = (value) => {
  const provider = String(value || "mock").trim().toLowerCase();
  return provider || "mock";
};

const getConfiguredProviderName = () => {
  return normalizeProviderName(process.env.MR_NARRATIVE_PROVIDER || "mock");
};

const isTruthyEnv = (value) => {
  return ["1", "true", "yes", "on"].includes(
    String(value || "").trim().toLowerCase()
  );
};

const isExternalProviderEnabled = () => {
  return (
    isTruthyEnv(process.env.MR_NARRATIVE_EXTERNAL_ENABLED) &&
    isTruthyEnv(process.env.MR_NARRATIVE_ALLOW_EXTERNAL)
  );
};

const buildExternalProviderBlockedFallback = (providerName) => {
  return {
    name: "rule_enhanced",
    requested_name: providerName,
    fallback_used: true,
    fallback_reason: `Provider eksternal ${providerName} belum diizinkan. Set MR_NARRATIVE_EXTERNAL_ENABLED=true dan MR_NARRATIVE_ALLOW_EXTERNAL=true hanya pada step provider eksternal yang sudah disetujui.`,
    build: buildRuleEnhancedNarrative,
  };
};

const getNarrativeProvider = (providerName = getConfiguredProviderName()) => {
  const normalized = normalizeProviderName(providerName);

  if (normalized === "rule_enhanced") {
    return {
      name: "rule_enhanced",
      requested_name: normalized,
      fallback_used: false,
      fallback_reason: null,
      build: buildRuleEnhancedNarrative,
    };
  }

  if (normalized === "mock") {
    return {
      name: "mock",
      requested_name: normalized,
      fallback_used: false,
      fallback_reason: null,
      build: buildMockNarrative,
    };
  }

  if (EXTERNAL_PROVIDERS.includes(normalized)) {
    if (!isExternalProviderEnabled()) {
      return buildExternalProviderBlockedFallback(normalized);
    }

    if (normalized === "ollama") {
      return {
        name: "ollama",
        requested_name: normalized,
        fallback_used: false,
        fallback_reason: null,
        build: buildOllamaNarrative,
      };
    }

    return {
      name: "rule_enhanced",
      requested_name: normalized,
      fallback_used: true,
      fallback_reason: `Provider eksternal ${normalized} sudah diizinkan oleh env, tetapi adapter belum diimplementasikan pada STEP 18C-1M. Fallback ke rule_enhanced.`,
      build: buildRuleEnhancedNarrative,
    };
  }

  return {
    name: "rule_enhanced",
    requested_name: normalized,
    fallback_used: true,
    fallback_reason: `Provider ${normalized} tidak dikenali. Fallback ke rule_enhanced.`,
    build: buildRuleEnhancedNarrative,
  };
};

const executeRuleEnhancedFallbackProvider = async ({
  payload,
  prompt,
  user = null,
  requestedProvider = getConfiguredProviderName(),
  fallbackReason = "Provider eksternal gagal validasi output. Fallback ke rule_enhanced.",
  providerErrorName = "ProviderValidationError",
  providerErrorDetails = null,
} = {}) => {
  const externalProviderEnabled = isExternalProviderEnabled();
  const normalizedRequestedProvider = normalizeProviderName(requestedProvider);
  const externalProviderRequested = EXTERNAL_PROVIDERS.includes(
    normalizedRequestedProvider
  );

  const data = await buildRuleEnhancedNarrative({
    payload,
    prompt,
    user,
  });

  return {
    data,
    meta: {
      provider: "rule_enhanced",
      requested_provider: normalizedRequestedProvider,
      fallback_used: true,
      fallback_reason: fallbackReason,
      external_provider_enabled: externalProviderEnabled,
      external_provider_requested: externalProviderRequested,
      provider_error_name: providerErrorName,
      provider_error_details: providerErrorDetails,
    },
  };
};

const executeNarrativeProvider = async ({ payload, prompt, user = null }) => {
  const provider = getNarrativeProvider();
  const externalProviderEnabled = isExternalProviderEnabled();
  const externalProviderRequested = EXTERNAL_PROVIDERS.includes(
    provider.requested_name
  );

  try {
    const data = await provider.build({
      payload,
      prompt,
      user,
    });

    return {
      data,
      meta: {
        provider: provider.name,
        requested_provider: provider.requested_name,
        fallback_used: provider.fallback_used,
        fallback_reason: provider.fallback_reason,
        external_provider_enabled: externalProviderEnabled,
        external_provider_requested: externalProviderRequested,
      },
    };
  } catch (error) {
    const fallbackProvider =
      provider.name === "rule_enhanced"
        ? {
            name: "mock",
            build: buildMockNarrative,
          }
        : {
            name: "rule_enhanced",
            build: buildRuleEnhancedNarrative,
          };

    const fallbackData = await fallbackProvider.build({
      payload,
      prompt,
      user,
    });

    return {
      data: fallbackData,
      meta: {
        provider: fallbackProvider.name,
        requested_provider: provider.requested_name,
        fallback_used: true,
        fallback_reason:
          error?.message ||
          `Provider ${provider.name} gagal. Fallback ke ${fallbackProvider.name}.`,
        external_provider_enabled: externalProviderEnabled,
        external_provider_requested: externalProviderRequested,
        provider_error_name: error?.name || "ProviderError",
        provider_error_details: error?.details || null,
      },
    };
  }
};

module.exports = {
  SUPPORTED_PROVIDERS,
  getConfiguredProviderName,
  getNarrativeProvider,
  executeNarrativeProvider,
  executeRuleEnhancedFallbackProvider,
};