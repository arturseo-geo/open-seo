import {
  createProject,
  deleteProject,
  getOrCreateDefaultProject,
  getProject,
  getSavedKeywords,
  getSerpAnalysis,
  listProjects,
  removeSavedKeyword,
  research,
  saveKeywords,
  getRankHistory,
  getLatestProjectRankings,
} from "@/server/features/keywords/services/research";


export const KeywordResearchService = {
  research,
  getSerpAnalysis,
  listProjects,
  createProject,
  deleteProject,
  saveKeywords,
  getSavedKeywords,
  removeSavedKeyword,
  getOrCreateDefaultProject,
  getProject,
  getRankHistory,
  getLatestProjectRankings,
} as const;
