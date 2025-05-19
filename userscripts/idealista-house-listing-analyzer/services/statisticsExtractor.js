export class StatisticsExtractor {
  constructor(logger, httpService) {
    this.logger = logger;
    this.httpService = httpService;
  }

  extractListingId(url) {
    if (!url) {
      this.logger.warn('URL not provided to extractListingId, using window.location.href');
      url = window.location.href;
    }
    const match = url.match(/\/inmueble\/(\d+)\//);
    return match ? match[1] : null;
  }

  async extractStatistics(listingId) {
    if (!listingId) {
        this.logger.error('No listing ID provided to extractStatistics.');
        throw new Error('Listing ID is required.');
    }
    let responseText; // Declare here to be accessible in catch block
    try {
      this.logger.log(`Fetching statistics for listing ID: ${listingId}`);
      responseText = await this.httpService.get(
        `https://www.idealista.com/ajax/detailstatsview/${listingId}/`,
        {
            'Accept': '*/*',
            'Accept-Language': 'en-US,en;q=0.9,tr;q=0.8,nl;q=0.7',
            'X-Requested-With': 'XMLHttpRequest'
        }
      );
      const responseData = JSON.parse(responseText);
      return this.parseStatisticsFromResponse(responseData);
    } catch (error) {
      if (error instanceof SyntaxError) { // Check for JSON parsing error first
          this.logger.error(`Failed to parse JSON statistics for ${listingId}:`, error.message, error.stack, `Response text snippet: ${(responseText || '').substring(0, 500)}`);
      } else if (error.name === 'HttpError') { // Check for HttpError from common service
          this.logger.error(`Failed to retrieve statistics for ${listingId} (HttpError ${error.statusCode}):`, error.message, error.stack, error.response);
      } else { // Other errors
          this.logger.error(`Failed to retrieve statistics for ${listingId} (Unknown Error):`, error.message, error.stack);
      }
      throw new Error('Failed to retrieve statistics');
    }
  }

  parseStatisticsFromResponse(response) {
    if (!response || !response.plainhtml) {
        this.logger.warn('Invalid or empty response received for parsing statistics.');
        return null;
    }
    const statistics = {
      visits: 0,
      friendShares: 0,
      emailContacts: 0,
      favorites: 0,
      dateLine: null,
    };

    const patternMap = {
      visits: /<strong>(\d+)<\/strong><span>visitas<\/span>/,
      friendShares: /<strong>(\d+)<\/strong><span>envíos a amigos<\/span>/,
      emailContacts: /<strong>(\d+)<\/strong><span>contactos por email<\/span>/,
      favorites: /<strong>(\d+)<\/strong>\s*<span>veces guardado como favorito<\/span>/,
      dateLine: /<p>Anuncio actualizado el (\d+ de \w+)<\/p>|<p>Publicado el (\d+ de \w+)<\/p>/,
    };

    for (const [key, pattern] of Object.entries(patternMap)) {
      const match = response.plainhtml.match(pattern);
      if (match) {
        statistics[key] = (key === 'dateLine') ? (match[1] || match[2]) : parseInt(match[1], 10);
      } else {
        this.logger.debug(`Pattern for "${key}" did not match in response HTML.`);
      }
    }
    this.logger.log('Parsed statistics:', statistics);
    return statistics;
  }
} 