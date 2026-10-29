import { AgentPage } from "./AgentPage";
import { HomePage } from "./HomePage";
import { MockupGeneratorPage } from "./MockupGeneratorPage";
import { IdeaGeneratorPage } from "./IdeaGeneratorPage";
import { ImageProcessingPage } from "./ImageProcessingPage";
import { BackgroundStudioPage } from "./BackgroundStudioPage";

export default function LegacyWorkspace({
  page,
  onNavigate,
}: {
  page: string;
  onNavigate: (page: string) => void;
}) {
  return (
    <AgentPage page={page} onNavigate={onNavigate}>
      <section hidden={page !== "home"} aria-label="Công cụ">
        <HomePage onNavigate={onNavigate} />
      </section>
      <section
        hidden={page !== "mockup-generator"}
        aria-label="Mockup Generator"
      >
        <MockupGeneratorPage />
      </section>
      <section hidden={page !== "background-studio"} aria-label="Mockup Studio">
        <BackgroundStudioPage />
      </section>
      <section hidden={page !== "idea-generator"} aria-label="Idea Generator">
        <IdeaGeneratorPage />
      </section>
      <section hidden={page !== "image-editor"} aria-label="Image Editor">
        <ImageProcessingPage />
      </section>
    </AgentPage>
  );
}
