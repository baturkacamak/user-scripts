/**
 * TextChunker - Utility class for splitting text into chunks
 * 
 * Provides flexible text chunking strategies for various use cases,
 * such as TTS processing, API rate limiting, or content pagination.
 */
class TextChunker {
    /**
     * Split text into chunks by word count, breaking at closest sentence boundary
     * 
     * This method intelligently splits text into chunks of approximately the specified
     * word count, preferring to break at sentence boundaries (periods) to maintain
     * readability and natural flow.
     * 
     * @param {string} text - The text to split into chunks
     * @param {number} wordsPerChunk - Target number of words per chunk
     * @param {Object} [options] - Optional configuration
     * @param {string|RegExp} [options.sentenceDelimiter='.'] - Sentence delimiter pattern
     * @param {boolean} [options.preserveWhitespace=true] - Whether to preserve whitespace in chunks
     * @param {number} [options.minChunkSize=1] - Minimum words required for a chunk
     * @param {number} [options.maxChunkSize] - Maximum words allowed in a chunk (overrides wordsPerChunk if exceeded)
     * @returns {string[]} Array of text chunks
     * 
     * @example
     * const chunks = TextChunker.splitByWords(text, 300);
     * // Returns: ['First sentence. Second sentence.', 'Third sentence. Fourth sentence.']
     */
    static splitByWords(text, wordsPerChunk, options = {}) {
        const {
            sentenceDelimiter = '.',
            preserveWhitespace = true,
            minChunkSize = 1,
            maxChunkSize = null
        } = options;

        if (!text || typeof text !== 'string') {
            return [];
        }

        const trimmedText = preserveWhitespace ? text.trim() : text.trim().replace(/\s+/g, ' ');
        if (!trimmedText) {
            return [];
        }

        const words = trimmedText.split(/\s+/);
        const chunks = [];
        let currentChunk = [];
        let currentWordCount = 0;

        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            currentChunk.push(word);
            currentWordCount++;

            // Check if we've reached the target word count or exceeded it
            const shouldSplit = maxChunkSize 
                ? currentWordCount >= maxChunkSize 
                : currentWordCount >= wordsPerChunk;

            if (shouldSplit) {
                // Look for the closest sentence ending in the current chunk
                const chunkText = currentChunk.join(' ');
                const delimiterPattern = sentenceDelimiter instanceof RegExp 
                    ? sentenceDelimiter 
                    : new RegExp(sentenceDelimiter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
                
                // Find the last occurrence of the delimiter
                let lastDelimiterIndex = -1;
                let match;
                const regex = new RegExp(delimiterPattern.source, 'g');
                while ((match = regex.exec(chunkText)) !== null) {
                    lastDelimiterIndex = match.index;
                }

                if (lastDelimiterIndex > 0) {
                    // Split at the last delimiter found
                    const delimiterLength = typeof sentenceDelimiter === 'string' 
                        ? sentenceDelimiter.length 
                        : (match ? match[0].length : 1);
                    
                    const beforeDelimiter = chunkText.substring(0, lastDelimiterIndex + delimiterLength).trim();
                    const afterDelimiter = chunkText.substring(lastDelimiterIndex + delimiterLength).trim();

                    if (beforeDelimiter && beforeDelimiter.split(/\s+/).length >= minChunkSize) {
                        chunks.push(beforeDelimiter);
                    }

                    // Start new chunk with remaining text after the delimiter
                    if (afterDelimiter) {
                        currentChunk = afterDelimiter.split(/\s+/);
                        currentWordCount = currentChunk.length;
                    } else {
                        currentChunk = [];
                        currentWordCount = 0;
                    }
                } else {
                    // No delimiter found, use the current chunk as-is
                    if (chunkText.trim() && chunkText.trim().split(/\s+/).length >= minChunkSize) {
                        chunks.push(chunkText.trim());
                    }
                    currentChunk = [];
                    currentWordCount = 0;
                }
            }
        }

        // Add any remaining words
        if (currentChunk.length > 0) {
            const remainingText = currentChunk.join(' ').trim();
            if (remainingText && remainingText.split(/\s+/).length >= minChunkSize) {
                chunks.push(remainingText);
            }
        }

        return chunks;
    }

    /**
     * Split text into chunks by character count
     * 
     * @param {string} text - The text to split
     * @param {number} charsPerChunk - Target number of characters per chunk
     * @param {Object} [options] - Optional configuration
     * @param {string|RegExp} [options.sentenceDelimiter='.'] - Sentence delimiter pattern
     * @param {boolean} [options.preserveWhitespace=true] - Whether to preserve whitespace
     * @param {number} [options.minChunkSize=1] - Minimum characters required for a chunk
     * @returns {string[]} Array of text chunks
     * 
     * @example
     * const chunks = TextChunker.splitByCharacters(text, 1000);
     */
    static splitByCharacters(text, charsPerChunk, options = {}) {
        const {
            sentenceDelimiter = '.',
            preserveWhitespace = true,
            minChunkSize = 1
        } = options;

        if (!text || typeof text !== 'string') {
            return [];
        }

        const trimmedText = preserveWhitespace ? text.trim() : text.trim().replace(/\s+/g, ' ');
        if (!trimmedText) {
            return [];
        }

        const chunks = [];
        let currentIndex = 0;

        while (currentIndex < trimmedText.length) {
            const remainingText = trimmedText.substring(currentIndex);
            let chunk = remainingText.substring(0, charsPerChunk);

            // If we're not at the end, try to break at a sentence boundary
            if (currentIndex + charsPerChunk < trimmedText.length) {
                const delimiterPattern = sentenceDelimiter instanceof RegExp 
                    ? sentenceDelimiter 
                    : new RegExp(sentenceDelimiter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
                
                const regex = new RegExp(delimiterPattern.source, 'g');
                let lastMatch = null;
                let match;
                
                while ((match = regex.exec(chunk)) !== null) {
                    lastMatch = match;
                }

                if (lastMatch) {
                    const delimiterLength = typeof sentenceDelimiter === 'string' 
                        ? sentenceDelimiter.length 
                        : lastMatch[0].length;
                    
                    chunk = chunk.substring(0, lastMatch.index + delimiterLength);
                }
            }

            chunk = chunk.trim();
            if (chunk.length >= minChunkSize) {
                chunks.push(chunk);
            }

            currentIndex += chunk.length;
            // Skip whitespace after the chunk
            while (currentIndex < trimmedText.length && /\s/.test(trimmedText[currentIndex])) {
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
     * const chunks = TextChunker.splitByLines(text, 10);
     */
    static splitByLines(text, linesPerChunk, options = {}) {
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
     * const stats = TextChunker.getChunkingStats(text, 300);
     * // Returns: { chunkCount: 5, avgWordsPerChunk: 285, minWords: 120, maxWords: 300 }
     */
    static getChunkingStats(text, wordsPerChunk, options = {}) {
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

