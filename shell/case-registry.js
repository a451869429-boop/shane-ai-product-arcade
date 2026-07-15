import { definition as aboutDefinition } from "../cases/about/case.js";
import { definition as coladaDefinition } from "../cases/colada/case.js";
import {
  artifactManifest as dokieArtifactManifest,
  definition as dokieDefinition,
  templateSystem as dokieTemplateSystem,
} from "../cases/dokie/case.js";
import { definition as soundsDefinition } from "../cases/soundsnomad/case.js";
import { definition as vivaDefinition, journeyByTitle as vivaJourneyByTitle } from "../cases/viva-video/case.js";

// 注册层只组合不可变 Case 定义；不得在此或 app.js 原地修改 Case 源对象。
function createDokieDisplayDefinition(definition) {
  if (definition?.pages?.length !== 4) return definition;

  const [introPage, workflowPage, formatsPage, galleryPage] = definition.pages;
  return {
    ...definition,
    pages: [
      introPage,
      { ...formatsPage, type: "dokie-formats" },
      workflowPage,
      { ...galleryPage, type: "dokie-template" },
    ],
  };
}

export const aboutCase = aboutDefinition;
export const cases = [
  coladaDefinition,
  createDokieDisplayDefinition(dokieDefinition),
  vivaDefinition,
  soundsDefinition,
];

export { dokieArtifactManifest, dokieTemplateSystem, vivaJourneyByTitle };
