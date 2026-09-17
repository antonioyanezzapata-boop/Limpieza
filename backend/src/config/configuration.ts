export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  apiPrefix: process.env.API_PREFIX ?? 'api/v1',
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '30d',
  },
  minSecondsBetweenRegistrations: parseInt(
    process.env.MIN_SECONDS_BETWEEN_REGISTRATIONS ?? '5',
    10,
  ),
  geolocationEnabled: process.env.GEOLOCATION_ENABLED === 'true',
});
