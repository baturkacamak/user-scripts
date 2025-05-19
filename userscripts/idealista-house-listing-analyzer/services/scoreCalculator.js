import { config } from '../config.js';

export class ScoreCalculator {
  constructor(logger) {
    this.logger = logger;
  }
  calculateScore(
    visits, friendShares, emailContacts, favorites, daysSincePublished,
  ) {
    const weights = config.weights;
    const recencyFactor = Math.exp(-0.1 * daysSincePublished); // recency decays over time

    const score = (
      (parseInt(visits, 10) || 0) * weights.visits +
      (parseInt(friendShares, 10) || 0) * weights.friendShares +
      (parseInt(emailContacts, 10) || 0) * weights.emailContacts +
      (parseInt(favorites, 10) || 0) * weights.favorites +
      recencyFactor * weights.recency
    );
    this.logger.log(
        `Calculated score: ${score} (visits: ${visits}, friendShares: ${friendShares}, emailContacts: ${emailContacts}, favorites: ${favorites}, daysSincePublished: ${daysSincePublished}, recencyFactor: ${recencyFactor})`
    );
    return score;
  }
} 