import React from "react"
import ReactDOM from "react-dom/client"
import { DemoHeroGeometric } from "@/components/demo"
import { SectionMockupDemoPage } from "@/components/section-with-mockup-demo"
import AiModelsDemo from "@/components/ai-models-demo"
import "./index.css"

// Default to the dark theme (matches Ellevux's aesthetic).
document.documentElement.classList.add("dark")

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {/* All three integrated components, stacked for the demo. */}
    <DemoHeroGeometric />
    <SectionMockupDemoPage />
    <AiModelsDemo />
  </React.StrictMode>,
)
