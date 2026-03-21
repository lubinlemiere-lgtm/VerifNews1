// ###########################################################################
// # Types Article — Interfaces TypeScript pour les articles
// # ArticleListItem: carte dans le feed (titre, resume, image, sources)
// # ArticleDetail: article complet avec contenu + verifications
// # PaginatedArticles: reponse paginee de l'API
// ###########################################################################

export interface ArticleListItem {
  id: string;
  title: string;
  summary: string | null;
  image_url: string | null;
  category_slug: string | null;
  published_at: string | null;
  is_verified: boolean;
  verification_count: number;
  has_audio: boolean;
}

export interface VerificationInfo {
  source_name: string;
  matched_title: string | null;
  matched_url: string | null;
  similarity_score: number | null;
}

export interface SourceInfo {
  id: number;
  name: string;
  url: string;
  source_type: string;
  reliability_tier: number;
  country_code: string | null;
}

export interface ArticleDetail {
  id: string;
  title: string;
  summary: string | null;
  content: string | null;
  original_url: string | null;
  image_url: string | null;
  category_slug: string | null;
  published_at: string | null;
  is_verified: boolean;
  verification_count: number;
  primary_source: SourceInfo | null;
  verifications: VerificationInfo[];
  has_audio: boolean;
}

export interface PaginatedArticles {
  items: ArticleListItem[];
  total: number;
  page: number;
  page_size: number;
  has_next: boolean;
}
