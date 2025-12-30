/**
 * TextChunker - Production-ready utility class for splitting text into chunks
 * 
 * Provides flexible text chunking strategies for various use cases,
 * such as TTS processing, API rate limiting, or content pagination.
 * 
 * Features:
 * - Advanced sentence tokenization with abbreviation handling
 * - Multi-language support via Intl.Segmenter (supports 100+ languages)
 * - Configurable chunking strategies (SOFT_LIMIT vs HARD_LIMIT)
 * - Support for word-based, character-based, and line-based chunking
 * - Intelligent boundary detection to maintain readability
 * 
 * @example
 * // English (default)
 * const chunker = new TextChunker();
 * 
 * @example
 * // Spanish
 * const chunker = new TextChunker({ locale: 'es' });
 * 
 * @example
 * // Japanese
 * const chunker = new TextChunker({ locale: 'ja' });
 */
class TextChunker {
    /**
     * Chunking strategy constants
     * @readonly
     */
    static STRATEGY = {
        /** Soft limit: Allow overflow to finish current sentence (natural flow priority) */
        SOFT_LIMIT: 'soft',
        /** Hard limit: Never exceed limit, strict cut at boundary */
        HARD_LIMIT: 'hard'
    };

    /**
     * Common abbreviations that should not be treated as sentence endings
     * @readonly
     */
    static ABBREVIATIONS = new Set([
        'prof.', 'dr.', 'mr.', 'mrs.', 'ms.', 'jr.', 'sr.', 'esq.',
        'e.g.', 'i.e.', 'etc.', 'vs.', 'v.s.', 'a.m.', 'p.m.', 'am.', 'pm.',
        'inc.', 'ltd.', 'corp.', 'co.', 'st.', 'ave.', 'blvd.', 'rd.',
        'jan.', 'feb.', 'mar.', 'apr.', 'may.', 'jun.', 'jul.', 'aug.',
        'sep.', 'oct.', 'nov.', 'dec.', 'mon.', 'tue.', 'wed.', 'thu.',
        'fri.', 'sat.', 'sun.', 'no.', 'vol.', 'pp.', 'ed.', 'p.'
    ]);

    /**
     * Locale for Intl.Segmenter (e.g., 'en', 'es', 'fr', 'de', 'ja', 'zh')
     * @type {string}
     */
    locale = 'en';

    /**
     * Intl.Segmenter instance for advanced sentence segmentation (if available)
     * @type {Intl.Segmenter|false|null}
     */
    segmenter = null;

    /**
     * Create a new TextChunker instance
     * @param {Object} [options] - Configuration options
     * @param {string} [options.locale='en'] - Locale for sentence segmentation (e.g., 'en', 'es', 'fr', 'de', 'ja', 'zh')
     *                                       Uses BCP 47 language tags. Defaults to 'en' (English).
     * 
     * @example
     * // English (default)
     * const chunker = new TextChunker();
     * 
     * @example
     * // Spanish
     * const chunker = new TextChunker({ locale: 'es' });
     * 
     * @example
     * // Japanese
     * const chunker = new TextChunker({ locale: 'ja' });
     */
    constructor(options = {}) {
        const { locale = 'en' } = options;
        this.locale = locale;
    }

    /**
     * Initialize Intl.Segmenter if available in the environment
     * @returns {Intl.Segmenter|false} Segmenter instance or false if unavailable
     */
    initSegmenter() {
        if (this.segmenter === null) {
            if (typeof Intl !== 'undefined' && Intl.Segmenter) {
                try {
                    this.segmenter = new Intl.Segmenter(this.locale, { granularity: 'sentence' });
                } catch (e) {
                    // Fallback to regex if Intl.Segmenter fails (e.g., unsupported locale)
                    this.segmenter = false;
                }
            } else {
                this.segmenter = false;
            }
        }
        return this.segmenter;
    }

    /**
     * Check if a period is part of an abbreviation
     * @param {string} text - Full text
     * @param {number} periodIndex - Index of the period in the text
     * @returns {boolean} True if the period is part of an abbreviation
     */
    isAbbreviation(text, periodIndex) {
        // Look backwards to find the word before the period
        const beforePeriod = text.substring(Math.max(0, periodIndex - 15), periodIndex);
        const wordMatch = beforePeriod.match(/\b([a-z]+\.?)\s*$/i);
        
        if (wordMatch) {
            const potentialAbbr = wordMatch[1].toLowerCase();
            return TextChunker.ABBREVIATIONS.has(potentialAbbr);
        }
        
        return false;
    }

    /**
     * Detect sentence boundaries using Intl.Segmenter or regex fallback
     * @param {string} text - Text to analyze
     * @returns {number[]} Array of character indices where sentences end
     */
    findSentenceBoundaries(text) {
        const segmenter = this.initSegmenter();
        const boundaries = [];

        if (segmenter) {
            // Use Intl.Segmenter for accurate sentence detection
            const segments = Array.from(segmenter.segment(text));
            for (const segment of segments) {
                // Each segment is a sentence, so the end of each segment is a boundary
                const endIndex = segment.index + segment.segment.length;
                if (endIndex < text.length) {
                    boundaries.push(endIndex);
                }
            }
        } else {
            // Fallback to regex-based detection with abbreviation handling
            // Match sentence endings: . ! ? followed by whitespace or end of string
            const sentenceEndPattern = /[.!?]+/g;
            let match;
            
            while ((match = sentenceEndPattern.exec(text)) !== null) {
                const periodIndex = match.index;
                const periodChar = text[periodIndex];
                
                // Check if this is an abbreviation (only for periods, not ! or ?)
                if (periodChar === '.' && this.isAbbreviation(text, periodIndex)) {
                    continue;
                }
                
                // Check if followed by whitespace or end of string
                const afterMatch = text.substring(periodIndex + match[0].length);
                if (afterMatch.match(/^\s+|$/)) {
                    boundaries.push(periodIndex + match[0].length);
                }
            }
        }

        return boundaries;
    }

    /**
     * Find sentence boundaries in word space (for word-based chunking)
     * @param {string[]} words - Array of words
     * @param {string} fullText - Full text for boundary detection
     * @returns {number[]} Array of word indices where sentences end (exclusive, so index means "after this word")
     */
    findSentenceBoundariesInWords(words, fullText) {
        const charBoundaries = this.findSentenceBoundaries(fullText);
        const wordBoundaries = [];
        
        if (charBoundaries.length === 0) {
            return wordBoundaries;
        }
        
        // Convert character positions to word indices by tracking character position
        let charIndex = 0;
        let boundaryIndex = 0;
        
        for (let wordIndex = 0; wordIndex < words.length; wordIndex++) {
            const word = words[wordIndex];
            const wordStart = charIndex;
            const wordEnd = charIndex + word.length;
            
            // Check if any remaining sentence boundary falls within or just after this word
            while (boundaryIndex < charBoundaries.length) {
                const boundary = charBoundaries[boundaryIndex];
                
                // Boundary is after this word (accounting for space after word)
                if (boundary > wordEnd && boundary <= wordEnd + 1) {
                    wordBoundaries.push(wordIndex + 1); // +1 because boundary is after the word
                    boundaryIndex++;
                } else if (boundary <= wordEnd) {
                    // Boundary is within this word, include it
                    wordBoundaries.push(wordIndex + 1);
                    boundaryIndex++;
                } else {
                    // Boundary is beyond this word, move to next word
                    break;
                }
            }
            
            // Move character index forward (word + space)
            charIndex = wordEnd + 1;
        }
        
        // Remove duplicates and sort (should already be sorted, but ensure it)
        return [...new Set(wordBoundaries)].sort((a, b) => a - b);
    }

    /**
     * Find the best sentence boundary near a given word index
     * @param {number[]} wordBoundaries - Array of word indices where sentences end
     * @param {number} targetWordIndex - Target word index
     * @param {string} strategy - Chunking strategy (SOFT_LIMIT or HARD_LIMIT)
     * @returns {number} Best boundary word index
     */
    findBestWordBoundary(wordBoundaries, targetWordIndex, strategy) {
        if (wordBoundaries.length === 0) {
            return targetWordIndex;
        }

        if (strategy === TextChunker.STRATEGY.SOFT_LIMIT) {
            // Find the first boundary after targetWordIndex (allow overflow)
            for (const boundary of wordBoundaries) {
                if (boundary >= targetWordIndex) {
                    return boundary;
                }
            }
            // If no boundary found after, use the last boundary
            return wordBoundaries[wordBoundaries.length - 1];
        } else {
            // HARD_LIMIT: Find the last boundary before or at targetWordIndex
            let bestBoundary = -1;
            for (const boundary of wordBoundaries) {
                if (boundary <= targetWordIndex) {
                    bestBoundary = boundary;
                } else {
                    break;
                }
            }
            
            if (bestBoundary > 0) {
                return bestBoundary;
            }
            
            // If no boundary found before target, force split at target
            return targetWordIndex;
        }
    }

    /**
     * Find the best sentence boundary near a given character position
     * @param {string} text - Full text
     * @param {number} targetPosition - Target character position
     * @param {string} strategy - Chunking strategy (SOFT_LIMIT or HARD_LIMIT)
     * @returns {number} Best boundary character position
     */
    findBestCharBoundary(text, targetPosition, strategy) {
        const boundaries = this.findSentenceBoundaries(text);
        
        if (boundaries.length === 0) {
            return targetPosition;
        }

        if (strategy === TextChunker.STRATEGY.SOFT_LIMIT) {
            // Find the first boundary after targetPosition (allow overflow)
            for (const boundary of boundaries) {
                if (boundary >= targetPosition) {
                    return boundary;
                }
            }
            // If no boundary found after, use the last boundary or end of text
            return boundaries[boundaries.length - 1] || text.length;
        } else {
            // HARD_LIMIT: Find the last boundary before or at targetPosition
            let bestBoundary = -1;
            for (const boundary of boundaries) {
                if (boundary <= targetPosition) {
                    bestBoundary = boundary;
                } else {
                    break;
                }
            }
            
            if (bestBoundary > 0) {
                return bestBoundary;
            }
            
            // If no boundary found before target, force split at target
            return targetPosition;
        }
    }

    /**
     * Normalize whitespace in text
     * @param {string} text - Text to normalize
     * @param {boolean} preserveWhitespace - Whether to preserve original whitespace
     * @returns {string} Normalized text
     */
    normalizeWhitespace(text, preserveWhitespace) {
        if (preserveWhitespace) {
            return text.trim();
        }
        return text.trim().replace(/\s+/g, ' ');
    }

    /**
     * Split text into chunks by word count with intelligent sentence boundary detection
     * 
     * This method intelligently splits text into chunks of approximately the specified
     * word count, preferring to break at sentence boundaries to maintain readability.
     * Supports both SOFT_LIMIT (for TTS/video) and HARD_LIMIT (for API/SMS) strategies.
     * 
     * @param {string} text - The text to split into chunks
     * @param {number} wordsPerChunk - Target number of words per chunk
     * @param {Object} [options] - Optional configuration
     * @param {string} [options.strategy='soft'] - Chunking strategy: 'soft' (SOFT_LIMIT) or 'hard' (HARD_LIMIT)
     * @param {boolean} [options.preserveWhitespace=true] - Whether to preserve whitespace in chunks
     * @param {number} [options.minChunkSize=1] - Minimum words required for a chunk
     * @param {number} [options.maxChunkSize] - Maximum words allowed in a chunk (overrides wordsPerChunk if exceeded)
     * @param {boolean} [options.respectSentenceBoundaries=true] - Whether to break at sentence boundaries
     * @returns {string[]} Array of text chunks
     * 
     * @example
     * // Soft limit (for TTS/video) - allows overflow to finish sentence
     * const chunker = new TextChunker();
     * const chunks = chunker.splitByWords(text, 300, { strategy: 'soft' });
     * 
     * @example
     * // Hard limit (for API/SMS) - strict cut, never exceeds limit
     * const chunker = new TextChunker();
     * const chunks = chunker.splitByWords(text, 300, { strategy: 'hard' });
     */
    splitByWords(text, wordsPerChunk, options = {}) {
        const {
            strategy = TextChunker.STRATEGY.SOFT_LIMIT,
            preserveWhitespace = true,
            minChunkSize = 1,
            maxChunkSize = null,
            respectSentenceBoundaries = true
        } = options;

        if (!text || typeof text !== 'string') {
            return [];
        }

        const normalizedText = this.normalizeWhitespace(text, preserveWhitespace);
        if (!normalizedText) {
            return [];
        }

        const words = normalizedText.split(/\s+/).filter(word => word.length > 0);
        if (words.length === 0) {
            return [];
        }

        const chunks = [];
        let currentChunkStart = 0;
        const effectiveLimit = maxChunkSize || wordsPerChunk;

        // Pre-compute sentence boundaries in word space if needed
        let wordBoundaries = [];
        if (respectSentenceBoundaries) {
            const fullText = words.join(' ');
            wordBoundaries = this.findSentenceBoundariesInWords(words, fullText);
        }

        while (currentChunkStart < words.length) {
            const targetWordIndex = currentChunkStart + effectiveLimit;
            
            // If we've reached the end, add remaining words
            if (targetWordIndex >= words.length) {
                const remainingWords = words.slice(currentChunkStart);
                const remainingText = remainingWords.join(' ');
                if (remainingText.trim() && remainingWords.length >= minChunkSize) {
                    chunks.push(remainingText);
                }
                break;
            }

            let currentChunkEnd = targetWordIndex;

            if (respectSentenceBoundaries && wordBoundaries.length > 0) {
                // Find the best sentence boundary near the target
                const bestBoundary = this.findBestWordBoundary(
                    wordBoundaries,
                    targetWordIndex,
                    strategy
                );
                
                // Ensure we don't go backwards beyond the start
                if (bestBoundary > currentChunkStart) {
                    currentChunkEnd = bestBoundary;
                }
            }

            // Extract the chunk
            const chunkWords = words.slice(currentChunkStart, currentChunkEnd);
            const chunkText = chunkWords.join(' ').trim();

            if (chunkText && chunkWords.length >= minChunkSize) {
                chunks.push(chunkText);
            }

            // Move to next chunk (skip the boundary if we found one)
            currentChunkStart = currentChunkEnd;
        }

        return chunks;
    }

    /**
     * Split text into chunks by character count with intelligent sentence boundary detection
     * 
     * @param {string} text - The text to split
     * @param {number} charsPerChunk - Target number of characters per chunk
     * @param {Object} [options] - Optional configuration
     * @param {string} [options.strategy='soft'] - Chunking strategy: 'soft' (SOFT_LIMIT) or 'hard' (HARD_LIMIT)
     * @param {boolean} [options.preserveWhitespace=true] - Whether to preserve whitespace
     * @param {number} [options.minChunkSize=1] - Minimum characters required for a chunk
     * @param {boolean} [options.respectSentenceBoundaries=true] - Whether to break at sentence boundaries
     * @returns {string[]} Array of text chunks
     * 
     * @example
     * // Soft limit - allows overflow to finish sentence
     * const chunker = new TextChunker();
     * const chunks = chunker.splitByCharacters(text, 1000, { strategy: 'soft' });
     * 
     * @example
     * // Hard limit - strict cut, never exceeds limit
     * const chunker = new TextChunker();
     * const chunks = chunker.splitByCharacters(text, 1000, { strategy: 'hard' });
     */
    splitByCharacters(text, charsPerChunk, options = {}) {
        const {
            strategy = TextChunker.STRATEGY.SOFT_LIMIT,
            preserveWhitespace = true,
            minChunkSize = 1,
            respectSentenceBoundaries = true
        } = options;

        if (!text || typeof text !== 'string') {
            return [];
        }

        const normalizedText = this.normalizeWhitespace(text, preserveWhitespace);
        if (!normalizedText) {
            return [];
        }

        const chunks = [];
        let currentIndex = 0;

        while (currentIndex < normalizedText.length) {
            const targetPosition = currentIndex + charsPerChunk;
            let chunkEnd = Math.min(targetPosition, normalizedText.length);

            if (respectSentenceBoundaries && chunkEnd < normalizedText.length) {
                // Find the best sentence boundary
                const bestBoundary = this.findBestCharBoundary(
                    normalizedText,
                    targetPosition,
                    strategy
                );
                
                // Ensure we don't go backwards beyond the start
                if (bestBoundary > currentIndex) {
                    chunkEnd = bestBoundary;
                }
            }

            const chunk = normalizedText.substring(currentIndex, chunkEnd).trim();
            
            if (chunk.length >= minChunkSize) {
                chunks.push(chunk);
            }

            // Move to next chunk (skip whitespace after boundary)
            currentIndex = chunkEnd;
            while (currentIndex < normalizedText.length && /\s/.test(normalizedText[currentIndex])) {
                currentIndex++;
            }
        }

        return chunks;
    }

    /**
     * Split text into chunks by lines
     * 
     * @param {string} text - The text to split
     * @param {number} linesPerChunk - Target number of lines per chunk
     * @param {Object} [options] - Optional configuration
     * @param {boolean} [options.preserveEmptyLines=false] - Whether to preserve empty lines
     * @returns {string[]} Array of text chunks
     * 
     * @example
     * const chunker = new TextChunker();
     * const chunks = chunker.splitByLines(text, 10);
     */
    splitByLines(text, linesPerChunk, options = {}) {
        const { preserveEmptyLines = false } = options;

        if (!text || typeof text !== 'string') {
            return [];
        }

        const lines = text.split(/\r?\n/);
        const chunks = [];
        let currentChunk = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            if (!preserveEmptyLines && !line.trim()) {
                continue;
            }

            currentChunk.push(line);

            if (currentChunk.length >= linesPerChunk) {
                chunks.push(currentChunk.join('\n'));
                currentChunk = [];
            }
        }

        // Add any remaining lines
        if (currentChunk.length > 0) {
            chunks.push(currentChunk.join('\n'));
        }

        return chunks;
    }

    /**
     * Get statistics about text chunking
     * 
     * @param {string} text - The text to analyze
     * @param {number} wordsPerChunk - Target words per chunk
     * @param {Object} [options] - Options passed to splitByWords
     * @returns {Object} Statistics object with chunk count, average words per chunk, etc.
     * 
     * @example
     * const chunker = new TextChunker();
     * const stats = chunker.getChunkingStats(text, 300);
     * // Returns: { chunkCount: 5, avgWordsPerChunk: 285, minWords: 120, maxWords: 300, totalWords: 1425 }
     */
    getChunkingStats(text, wordsPerChunk, options = {}) {
        const chunks = this.splitByWords(text, wordsPerChunk, options);
        
        if (chunks.length === 0) {
            return {
                chunkCount: 0,
                avgWordsPerChunk: 0,
                minWords: 0,
                maxWords: 0,
                totalWords: 0
            };
        }

        const wordCounts = chunks.map(chunk => chunk.split(/\s+/).length);
        const totalWords = wordCounts.reduce((sum, count) => sum + count, 0);

        return {
            chunkCount: chunks.length,
            avgWordsPerChunk: Math.round(totalWords / chunks.length),
            minWords: Math.min(...wordCounts),
            maxWords: Math.max(...wordCounts),
            totalWords: totalWords
        };
    }
}

export default TextChunker;
