export interface PagefindResultData {
  url: string;
  title: string;
  meta: Record<string, string>;
  excerpt: string;
  anchors: string[];
  raw_content?: string;
  word_count: number;
}

export interface PagefindResult {
  id: string;
  score: number;
  data: () => Promise<PagefindResultData>;
}

export interface PagefindSearchResponse {
  results?: PagefindResult[];
}

export interface PagefindApi {
  search: (query: string) => Promise<PagefindSearchResponse>;
}

const PAGEFIND_MODULE_PATH = "/pagefind/pagefind.js";

let pagefindApi: PagefindApi | null = null;
let pagefindLoading: Promise<PagefindApi> | null = null;

export function getPagefind(): PagefindApi | null {
  return pagefindApi;
}

export function loadPagefind(): Promise<PagefindApi> {
  if (pagefindApi) return Promise.resolve(pagefindApi);
  if (pagefindLoading) return pagefindLoading;

  pagefindLoading = import(
    /* webpackIgnore: true */
    PAGEFIND_MODULE_PATH
  )
    .then((module) => {
      if (typeof module.search !== "function") {
        throw new Error("Pagefind module does not expose search()");
      }

      pagefindApi = module as PagefindApi;
      return pagefindApi;
    })
    .catch((error) => {
      pagefindLoading = null;
      throw error;
    });

  return pagefindLoading;
}
