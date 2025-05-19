export const config = {
  expirationDays: 1, // Default expiration days for cache
  delayBetweenRequests: 500, // Delay in milliseconds between each request
  weights: {
    visits: 0.0001,
    friendShares: 0.3,
    emailContacts: 0.6,
    favorites: 0.4,
    recency: 0.2,
  },
}; 