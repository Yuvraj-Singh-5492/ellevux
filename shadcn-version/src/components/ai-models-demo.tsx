import { AiModelsList } from "@/components/ui/ai-models-preview";

export default function DemoOne() {
  return (
    <div className="min-h-screen p-8">
      <AiModelsList
        models={[
          {
            id: "gpt-4o",
            name: "GPT-4o",
            provider: "OpenAI",
            family: "GPT-4",
            version: "2024-08-06",
            description: "Multimodal flagship model with strong reasoning.",
            contextWindowTokens: 128000,
            inputPricePer1KTokensUSD: 0.005,
            outputPricePer1KTokensUSD: 0.015,
            supports: { vision: true, streaming: true, functionCalling: true },
            tags: ["general", "multimodal"],
            meta: { latencyMsP50: 320 },
          },
          {
            id: "claude-3-opus",
            name: "Claude 3 Opus",
            provider: "Anthropic",
            family: "Claude 3",
            description: "High reasoning performance for complex tasks.",
            contextWindowTokens: 200000,
            inputPricePer1KTokensUSD: 0.015,
            outputPricePer1KTokensUSD: 0.075,
            supports: { streaming: true },
          },
          {
            id: "gemini-1.5-pro",
            name: "Gemini 1.5 Pro",
            provider: "Google",
            family: "Gemini",
            description: "State-of-the-art multimodal reasoning and search.",
            contextWindowTokens: 1000000,
            inputPricePer1KTokensUSD: 0.01,
            outputPricePer1KTokensUSD: 0.03,
            supports: { vision: true, toolUse: true },
          },
          {
            id: "mistral-large",
            name: "Mistral Large",
            provider: "Mistral",
            description: "Efficient and cost-effective model with open weights.",
            inputPricePer1KTokensUSD: 0.002,
            outputPricePer1KTokensUSD: 0.006,
            tags: ["open-weight", "fast"],
          },
          {
            id: "llama-3.1-70b",
            name: "LLaMA 3.1 70B",
            provider: "Meta",
            family: "LLaMA",
            description: "Open-weight with high accuracy across benchmarks.",
            contextWindowTokens: 128000,
            inputPricePer1KTokensUSD: 0.002,
            outputPricePer1KTokensUSD: 0.004,
          },
          {
            id: "mixtral-8x7b",
            name: "Mixtral 8x7B",
            provider: "Mistral",
            description: "Sparse mixture of experts, balanced speed and quality.",
            tags: ["smol", "sparse"],
          },
        ]}
      />
    </div>
  );
}
