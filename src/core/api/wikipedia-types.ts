/**
 * 维基百科 REST page/summary 响应字段
 * 端点: https://{lang}.wikipedia.org/api/rest_v1/page/summary/{title}
 */
export interface WikiSummary {
  type?: string;
  title: string;
  displaytitle?: string;
  description?: string;
  /** 纯文本摘要(MVP 使用此字段, 不使用 extract_html 避免 XSS) */
  extract?: string;
  /** HTML 版摘要(不安全, 禁止直接插入 DOM) */
  extract_html?: string;
  wikibase_item?: string;
  pageid?: number;
  thumbnail?: {
    source: string;
    width?: number;
    height?: number;
  };
  originalimage?: {
    source: string;
    width?: number;
    height?: number;
  };
  coordinates?: {
    lat: number;
    lon: number;
  };
  content_urls?: {
    desktop?: { page?: string };
    mobile?: { page?: string };
  };
}