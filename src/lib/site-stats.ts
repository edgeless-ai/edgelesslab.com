export const siteStats = {
  productCatalog: {
    total: 31,
    free: 21,
    paid: 1,
    priceLow: "Free",
    priceHigh: "$29",
    catalogValue: "under $100",
  },
  operations: {
    mcpServersInProduction: "4+",
    agentsAlwaysOn: "5 agents 24/7",
    productionDays: "60+ days",
    weeklyIncidents: "0 incidents this week",
  },
} as const;

export type SiteStats = typeof siteStats;
