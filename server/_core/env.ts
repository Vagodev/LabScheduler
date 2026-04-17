export const ENV = {
  jwtSecret: process.env.JWT_SECRET ?? "change-this-secret-in-production-min-32-chars",
  cookieSecret: process.env.JWT_SECRET ?? "change-this-secret-in-production-min-32-chars",
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",
  port: parseInt(process.env.PORT ?? "3000"),
  // Campos mantidos para compatibilidade com helpers _core (não usados em localhost)
  appId: process.env.VITE_APP_ID ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
};
