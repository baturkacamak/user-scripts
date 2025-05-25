// Manager for handling expanded item descriptions

import {Logger} from "../../core";
import {escapeHTML} from "../utils/helpers";
import {ControlPanel} from '../components/ControlPanel';

/**
 * Manages the collection of expanded description items
 */
export class DescriptionManager {
    static expandedItems = [];

    /**
     * Add or update an item in the collection
     * @param {Object} itemData - The item data to add/update
     */
    static addItem(itemData) {
        // Check if the item already exists by URL
        const existingIndex = this.expandedItems.findIndex(item => item.url === itemData.url);
        if (existingIndex >= 0) {
            // Update existing item
            this.expandedItems[existingIndex] = itemData;
        } else {
            // Add new item
            this.expandedItems.push(itemData);
        }
        Logger.debug("Item added to description manager:", itemData.title);
        Logger.debug("Total items:", this.expandedItems.length);

        // Update control panel visibility
        if (typeof ControlPanel.updatePanelVisibility === 'function') {
            ControlPanel.updatePanelVisibility();
        }
    }

    /**
     * Remove an item by URL
     * @param {string} url - URL of the item to remove
     */
    static removeItem(url) {
        const index = this.expandedItems.findIndex(item => item.url === url);
        if (index >= 0) {
            this.expandedItems.splice(index, 1);
            Logger.debug("Item removed from description manager:", url);
            Logger.debug("Total items:", this.expandedItems.length);

            // Update control panel visibility
            if (typeof ControlPanel.updatePanelVisibility === 'function') {
                ControlPanel.updatePanelVisibility();
            }
        }
    }

    /**
     * Clear all items from the collection
     */
    static clearItems() {
        this.expandedItems = [];
        Logger.debug("All items cleared from description manager");

        // Update control panel visibility
        if (typeof ControlPanel.updatePanelVisibility === 'function') {
            ControlPanel.updatePanelVisibility();
        }
    }

    /**
     * Get items as formatted JSON
     * @param {boolean} prettyPrint - Whether to format with indentation
     * @returns {string} JSON formatted string
     */
    static getItemsAsJson(prettyPrint = true) {
        return JSON.stringify(this.expandedItems, null, prettyPrint ? 2 : null);
    }

    /**
     * Get items as CSV
     * @param {boolean} includeHeaders - Whether to include header row
     * @returns {string} CSV formatted string
     */
    static getItemsAsCsv(includeHeaders = true) {
        if (this.expandedItems.length === 0) {
            return "";
        }

        // Define headers
        const headers = ["Title", "Description", "Price", "URL"];

        // Create CSV rows
        let csvContent = includeHeaders ? headers.join(",") + "\n" : "";

        this.expandedItems.forEach(item => {
            // Properly escape CSV fields
            const escapeCsvField = (field) => {
                field = String(field || "");
                // If field contains comma, newline or double quote, enclose in double quotes
                if (field.includes(",") || field.includes("\n") || field.includes("\"")) {
                    // Replace double quotes with two double quotes
                    field = field.replace(/"/g, "\"\"");
                    return `"${field}"`;
                }
                return field;
            };

            const row = [
                escapeCsvField(item.title),
                escapeCsvField(item.description),
                escapeCsvField(item.price),
                escapeCsvField(item.url)
            ];

            csvContent += row.join(",") + "\n";
        });

        return csvContent;
    }

    /**
     * Get items as TSV
     * @param {boolean} includeHeaders - Whether to include header row
     * @returns {string} TSV formatted string
     */
    static getItemsAsTsv(includeHeaders = true) {
        if (this.expandedItems.length === 0) {
            return "";
        }

        // Define headers
        const headers = ["Title", "Description", "Price", "URL"];

        // Create TSV rows
        let tsvContent = includeHeaders ? headers.join("\t") + "\n" : "";

        this.expandedItems.forEach(item => {
            // Escape TSV fields (replace tabs)
            const escapeTsvField = (field) => {
                return String(field || "").replace(/\t/g, " ");
            };

            const row = [
                escapeTsvField(item.title),
                escapeTsvField(item.description),
                escapeTsvField(item.price),
                escapeTsvField(item.url)
            ];

            tsvContent += row.join("\t") + "\n";
        });

        return tsvContent;
    }

    /**
     * Get items as XML
     * @param {boolean} prettyPrint - Whether to format with indentation
     * @param {boolean} includeImages - Whether to include image URLs
     * @returns {string} XML formatted string
     */
    static getItemsAsXml(prettyPrint = true, includeImages = false) {
        if (this.expandedItems.length === 0) {
            return '<?xml version="1.0" encoding="UTF-8"?><items></items>';
        }

        const escapeXml = (str) => {
            return String(str || "")
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&apos;');
        };

        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<items>\n';

        this.expandedItems.forEach(item => {
            xml += prettyPrint ? '  <item>\n' : '<item>';
            xml += prettyPrint ? `    <title>${escapeXml(item.title)}</title>\n` : `<title>${escapeXml(item.title)}</title>`;
            xml += prettyPrint ? `    <price>${escapeXml(item.price)}</price>\n` : `<price>${escapeXml(item.price)}</price>`;
            xml += prettyPrint ? `    <description>${escapeXml(item.description)}</description>\n` : `<description>${escapeXml(item.description)}</description>`;
            xml += prettyPrint ? `    <url>${escapeXml(item.url)}</url>\n` : `<url>${escapeXml(item.url)}</url>`;

            if (includeImages && item.images && item.images.length > 0) {
                xml += prettyPrint ? '    <images>\n' : '<images>';
                item.images.forEach(img => {
                    xml += prettyPrint ? `      <image>${escapeXml(img)}</image>\n` : `<image>${escapeXml(img)}</image>`;
                });
                xml += prettyPrint ? '    </images>\n' : '</images>';
            }

            xml += prettyPrint ? '  </item>\n' : '</item>';
        });

        xml += '</items>';
        return xml;
    }

    /**
     * Get items as plain text
     * @param {boolean} includeImages - Whether to include image URLs
     * @returns {string} Plain text formatted string
     */
    static getItemsAsPlainText(includeImages = false) {
        if (this.expandedItems.length === 0) {
            return "";
        }

        let result = '';

        this.expandedItems.forEach((item, index) => {
            result += `== ${item.title} ==\n`;
            result += `Price: ${item.price || 'N/A'}\n`;
            result += `Description: ${item.description}\n`;

            // Add images if option is enabled
            if (includeImages && item.images && item.images.length > 0) {
                result += 'Images:\n';
                item.images.forEach(img => {
                    result += `- ${img}\n`;
                });
            }

            result += `URL: ${item.url}\n`;

            // Add separator between items
            if (index < this.expandedItems.length - 1) {
                result += '\n--------------------------------------------------\n\n';
            }
        });

        return result;
    }

    /**
     * Get items as Markdown
     * @param {boolean} includeImages - Whether to include image references
     * @param {boolean} useFrontmatter - Whether to include YAML frontmatter
     * @returns {string} Markdown formatted string
     */
    static getItemsAsMarkdown(includeImages = true, useFrontmatter = false) {
        if (this.expandedItems.length === 0) {
            return "";
        }

        let result = '';

        this.expandedItems.forEach((item, index) => {
            // Add frontmatter if option is enabled
            if (useFrontmatter) {
                result += '---\n';
                result += `title: "${item.title.replace(/"/g, '\\"')}"\n`;
                result += `price: "${item.price || 'N/A'}"\n`;
                result += `url: "${item.url}"\n`;

                if (includeImages && item.images && item.images.length > 0) {
                    result += 'images:\n';
                    item.images.forEach(img => {
                        result += `  - ${img}\n`;
                    });
                }

                result += '---\n\n';
            }

            // Add title and details
            result += `# ${item.title}\n\n`;
            result += `**Price:** ${item.price || 'N/A'}\n\n`;
            result += `## Description\n\n${item.description}\n\n`;

            // Add images if option is enabled
            if (includeImages && item.images && item.images.length > 0) {
                result += '## Images\n\n';
                item.images.forEach(img => {
                    result += `![${item.title}](${img})\n\n`;
                });
            }

            result += `**URL:** [${item.title}](${item.url})\n\n`;

            // Add separator between items
            if (index < this.expandedItems.length - 1) {
                result += '---\n\n';
            }
        });

        return result;
    }

    /**
     * Get items as HTML
     * @param {boolean} includeImages - Whether to include image elements
     * @param {boolean} includeStyles - Whether to include CSS styles
     * @returns {string} HTML formatted string
     */
    static getItemsAsHtml(includeImages = true, includeStyles = true) {
        if (this.expandedItems.length === 0) {
            return "<!DOCTYPE html><html><body><p>No items to display</p></body></html>";
        }

        let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Wallapop Item Descriptions</title>`;

        // Add CSS if option is enabled
        if (includeStyles) {
            html += `
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            max-width: 900px;
            margin: 0 auto;
            padding: 20px;
            color: #333;
        }
        .item {
            margin-bottom: 40px;
            border-bottom: 1px solid #eee;
            padding-bottom: 20px;
        }
        .item:last-child {
            border-bottom: none;
        }
        .item-title {
            font-size: 24px;
            margin: 0 0 10px 0;
            color: #008080;
        }
        .item-price {
            font-size: 18px;
            font-weight: bold;
            color: #e64a19;
            margin: 0 0 15px 0;
        }
        .item-description {
            margin-bottom: 15px;
            white-space: pre-wrap;
        }
        .item-url {
            display: inline-block;
            margin-top: 10px;
            color: #0277bd;
            text-decoration: none;
        }
        .item-url:hover {
            text-decoration: underline;
        }
        .item-images {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin: 15px 0;
        }
        .item-image {
            max-width: 200px;
            max-height: 200px;
            object-fit: contain;
            border: 1px solid #ddd;
        }
        h2 {
            color: #555;
            font-size: 18px;
            margin: 20px 0 10px 0;
        }
    </style>`;
        }

        html += `
</head>
<body>
    <h1>Wallapop Item Descriptions</h1>`;

        // Add items
        this.expandedItems.forEach(item => {
            html += `
    <div class="item">
        <h2 class="item-title">${escapeHTML(item.title)}</h2>
        <div class="item-price">Price: ${escapeHTML(item.price || 'N/A')}</div>
        <div class="item-description">${escapeHTML(item.description)}</div>`;

            // Add images if option is enabled
            if (includeImages && item.images && item.images.length > 0) {
                html += `
        <div class="item-images">`;

                item.images.forEach(img => {
                    html += `
            <img class="item-image" src="${escapeHTML(img)}" alt="${escapeHTML(item.title)}" />`;
                });

                html += `
        </div>`;
            }

            html += `
        <a class="item-url" href="${escapeHTML(item.url)}" target="_blank">View on Wallapop</a>
    </div>`;
        });

        html += `
</body>
</html>`;

        return html;
    }
}