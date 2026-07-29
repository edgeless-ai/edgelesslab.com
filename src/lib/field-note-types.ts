export interface FieldNote {
  slug: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  published?: string;
  hasControls: boolean;
  curated: boolean;
  featured: boolean;
  citedPlot: boolean;
}
