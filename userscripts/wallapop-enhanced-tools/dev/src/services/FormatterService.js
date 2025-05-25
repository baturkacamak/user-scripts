// Service for formatting data in various export formats

import {DescriptionManager} from "../managers/DescriptionManager";
import {escapeHTML} from "../utils/helpers";

/**
 * Provides methods to format data in various export formats
 */
export class FormatterService {
    /**
     * Format data in the specified format
     * @param {string} formatId - The format identifier
     * @param {Object} options - Format-specific options
     * @returns {string} The formatted data
     */
    static formatData(formatId, options = {}) {
        // Map format ID to formatter method
        const formatters = {
            // Text formats
            'plain': () => DescriptionManager.getItemsAsPlainText(options['include-images']),
            'markdown': () => DescriptionManager.getItemsAsMarkdown(options['include-images'], options['use-frontmatter']),
            'html': () => DescriptionManager.getItemsAsHtml(options['include-images'], options['include-styles']),

            // Data formats
            'json': () => DescriptionManager.getItemsAsJson(options['pretty-print']),
            'csv': () => DescriptionManager.getItemsAsCsv(options['include-headers']),
            'tsv': () => DescriptionManager.getItemsAsTsv(options['include-headers']),
            'xml': () => DescriptionManager.getItemsAsXml(options['pretty-print'], options['include-images']),

            // Spreadsheet formats
            'excel-csv': () => this.formatAsExcelCsv(options),
            'excel-xml': () => this.formatAsExcelXml(options),
        };

        // Call the appropriate formatter or return empty string
        return (formatters[formatId] ? formatters[formatId]() : "");
    }

    /**
     * Format data as Excel-compatible CSV
     * @param {Object} options - Format options
     * @returns {string} Formatted data
     */
    static formatAsExcelCsv(options) {
        const items = DescriptionManager.expandedItems;
        if (items.length === 0) return "";

        // Determine columns
        const columns = ['title', 'price', 'description', 'url'];

        // Add images column if needed
        if (options['include-images']) {
            columns.push('images');
        }

        // Start building CSV
        let csv = '';

        // Add BOM for Excel
        const bom = '\uFEFF';
        csv += bom;

        // Add headers if option is enabled
        if (options['include-headers']) {
            csv += columns.map(col => `"${col}"`).join(';') + '\n';
        }

        // Add data rows
        items.forEach(item => {
            const row = columns.map(column => {
                if (column === 'images') {
                    // Join multiple image URLs with pipe character if they exist
                    return item.images && item.images.length > 0
                        ? `"${item.images.join('|')}"`
                        : '""';
                } else {
                    // Escape double quotes and wrap values in quotes
                    const value = item[column] !== undefined ? String(item[column]) : '';
                    return `"${value.replace(/"/g, '""')}"`;
                }
            });

            csv += row.join(';') + '\n';
        });

        return csv;
    }

    /**
     * Format data as Excel XML
     * @param {Object} options - Format options
     * @returns {string} Formatted data
     */
    static formatAsExcelXml(options) {
        const items = DescriptionManager.expandedItems;
        if (items.length === 0) {
            return '<?xml version="1.0" encoding="UTF-8"?><Workbook></Workbook>';
        }

        const escapeXml = (str) => {
            return String(str || "")
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&apos;');
        };

        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<?mso-application progid="Excel.Sheet"?>\n';
        xml += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n';
        xml += '  xmlns:o="urn:schemas-microsoft-com:office:office"\n';
        xml += '  xmlns:x="urn:schemas-microsoft-com:office:excel"\n';
        xml += '  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"\n';
        xml += '  xmlns:html="http://www.w3.org/TR/REC-html40">\n';
        xml += '  <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">\n';
        xml += '    <Title>Wallapop Items Export</Title>\n';
        xml += '    <Author>Wallapop Expand Description</Author>\n';
        xml += '    <Created>' + new Date().toISOString() + '</Created>\n';
        xml += '  </DocumentProperties>\n';
        xml += '  <Styles>\n';
        xml += '    <Style ss:ID="Default" ss:Name="Normal">\n';
        xml += '      <Alignment ss:Vertical="Top"/>\n';
        xml += '      <Borders/>\n';
        xml += '      <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11"/>\n';
        xml += '      <Interior/>\n';
        xml += '      <NumberFormat/>\n';
        xml += '      <Protection/>\n';
        xml += '    </Style>\n';
        xml += '    <Style ss:ID="Header">\n';
        xml += '      <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Bold="1"/>\n';
        xml += '      <Interior ss:Color="#C0C0C0" ss:Pattern="Solid"/>\n';
        xml += '    </Style>\n';
        xml += '  </Styles>\n';
        xml += '  <Worksheet ss:Name="Wallapop Items">\n';
        xml += '    <Table ss:ExpandedColumnCount="5" ss:ExpandedRowCount="' + (items.length + 1) + '" x:FullColumns="1" x:FullRows="1">\n';

        // Define columns
        const columns = ['title', 'price', 'description', 'url'];
        if (options['include-images']) {
            columns.push('images');
        }

        // Set column widths
        xml += '      <Column ss:Width="150"/>\n'; // Title
        xml += '      <Column ss:Width="80"/>\n';  // Price
        xml += '      <Column ss:Width="250"/>\n'; // Description
        xml += '      <Column ss:Width="150"/>\n'; // URL
        if (options['include-images']) {
            xml += '      <Column ss:Width="250"/>\n'; // Images
        }

        // Add headers if option is enabled
        if (options['include-headers']) {
            xml += '      <Row ss:StyleID="Header">\n';

            columns.forEach(column => {
                xml += '        <Cell><Data ss:Type="String">' + column + '</Data></Cell>\n';
            });

            xml += '      </Row>\n';
        }

        // Add data rows
        items.forEach(item => {
            xml += '      <Row>\n';

            columns.forEach(column => {
                let value = '';

                if (column === 'images') {
                    // Join multiple image URLs with pipe character if they exist
                    value = item.images && item.images.length > 0
                        ? item.images.join('|')
                        : '';
                } else {
                    value = item[column] !== undefined ? String(item[column]) : '';
                }

                xml += '        <Cell><Data ss:Type="String">' + escapeXml(value) + '</Data></Cell>\n';
            });

            xml += '      </Row>\n';
        });

        xml += '    </Table>\n';
        xml += '    <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">\n';
        xml += '      <PageSetup>\n';
        xml += '        <Layout x:Orientation="Landscape"/>\n';
        xml += '        <Header x:Margin="0.3"/>\n';
        xml += '        <Footer x:Margin="0.3"/>\n';
        xml += '        <PageMargins x:Bottom="0.75" x:Left="0.7" x:Right="0.7" x:Top="0.75"/>\n';
        xml += '      </PageSetup>\n';
        xml += '      <Print>\n';
        xml += '        <ValidPrinterInfo/>\n';
        xml += '        <HorizontalResolution>600</HorizontalResolution>\n';
        xml += '        <VerticalResolution>600</VerticalResolution>\n';
        xml += '      </Print>\n';
        xml += '      <Selected/>\n';
        xml += '      <Panes>\n';
        xml += '        <Pane>\n';
        xml += '          <Number>3</Number>\n';
        xml += '          <ActiveRow>1</ActiveRow>\n';
        xml += '          <ActiveCol>0</ActiveCol>\n';
        xml += '        </Pane>\n';
        xml += '      </Panes>\n';
        xml += '      <ProtectObjects>False</ProtectObjects>\n';
        xml += '      <ProtectScenarios>False</ProtectScenarios>\n';
        xml += '    </WorksheetOptions>\n';
        xml += '  </Worksheet>\n';
        xml += '</Workbook>';

        return xml;
    }

    /**
     * Create export format definitions for use with the ControlPanel
     * @returns {Object} A map of export format definitions
     */
    static getExportFormats() {
        return {
            // Text-based formats
            text: {
                label: 'Text',
                formats: {
                    'plain': {
                        id: 'plain',
                        label: 'Plain Text',
                        description: 'Simple text list of descriptions',
                        category: 'text',
                        options: [
                            {
                                id: 'include-images',
                                label: 'Include images as URLs',
                                description: 'Add image URLs to the output',
                                defaultValue: false
                            }
                        ]
                    },
                    'markdown': {
                        id: 'markdown',
                        label: 'Markdown',
                        description: 'Formatted with Markdown syntax',
                        category: 'text',
                        options: [
                            {
                                id: 'include-images',
                                label: 'Include images as markdown',
                                description: 'Add image references using markdown syntax',
                                defaultValue: true
                            },
                            {
                                id: 'use-frontmatter',
                                label: 'Use frontmatter',
                                description: 'Add YAML frontmatter with metadata',
                                defaultValue: false
                            }
                        ]
                    },
                    'html': {
                        id: 'html',
                        label: 'HTML',
                        description: 'Formatted as HTML document',
                        category: 'text',
                        options: [
                            {
                                id: 'include-images',
                                label: 'Include images',
                                description: 'Add image elements with source URLs',
                                defaultValue: true
                            },
                            {
                                id: 'include-styles',
                                label: 'Include CSS styles',
                                description: 'Add CSS styling to the HTML',
                                defaultValue: true
                            }
                        ]
                    }
                }
            },
            // Data formats
            data: {
                label: 'Data',
                formats: {
                    'json': {
                        id: 'json',
                        label: 'JSON',
                        description: 'JavaScript Object Notation',
                        category: 'data',
                        options: [
                            {
                                id: 'pretty-print',
                                label: 'Pretty print',
                                description: 'Format JSON with indentation',
                                defaultValue: true
                            },
                            {
                                id: 'include-images',
                                label: 'Include image URLs',
                                description: 'Add image URLs to JSON objects',
                                defaultValue: false
                            }
                        ]
                    },
                    'csv': {
                        id: 'csv',
                        label: 'CSV',
                        description: 'Comma-separated values',
                        category: 'data',
                        options: [
                            {
                                id: 'include-headers',
                                label: 'Include headers',
                                description: 'Add column names as the first row',
                                defaultValue: true
                            },
                            {
                                id: 'include-images',
                                label: 'Include image URLs',
                                description: 'Add image URLs column',
                                defaultValue: false
                            }
                        ]
                    },
                    'tsv': {
                        id: 'tsv',
                        label: 'TSV',
                        description: 'Tab-separated values',
                        category: 'data',
                        options: [
                            {
                                id: 'include-headers',
                                label: 'Include headers',
                                description: 'Add column names as the first row',
                                defaultValue: true
                            },
                            {
                                id: 'include-images',
                                label: 'Include image URLs',
                                description: 'Add image URLs column',
                                defaultValue: false
                            }
                        ]
                    },
                    'xml': {
                        id: 'xml',
                        label: 'XML',
                        description: 'Extensible Markup Language',
                        category: 'data',
                        options: [
                            {
                                id: 'include-images',
                                label: 'Include image elements',
                                description: 'Add image URLs as XML elements',
                                defaultValue: false
                            },
                            {
                                id: 'pretty-print',
                                label: 'Pretty print',
                                description: 'Format XML with indentation',
                                defaultValue: true
                            }
                        ]
                    }
                }
            },
            // Spreadsheet formats
            spreadsheet: {
                label: 'Spreadsheet',
                formats: {
                    'excel-csv': {
                        id: 'excel-csv',
                        label: 'Excel CSV',
                        description: 'CSV optimized for Excel import',
                        category: 'spreadsheet',
                        options: [
                            {
                                id: 'include-headers',
                                label: 'Include headers',
                                description: 'Add column names as the first row',
                                defaultValue: true
                            },
                            {
                                id: 'include-images',
                                label: 'Include image URLs',
                                description: 'Add image URLs column',
                                defaultValue: false
                            }
                        ]
                    },
                    'excel-xml': {
                        id: 'excel-xml',
                        label: 'Excel XML',
                        description: 'XML format for Excel',
                        category: 'spreadsheet',
                        options: [
                            {
                                id: 'include-headers',
                                label: 'Include headers',
                                description: 'Add column names as the first row',
                                defaultValue: true
                            },
                            {
                                id: 'include-images',
                                label: 'Include image URLs',
                                description: 'Add image URLs column',
                                defaultValue: false
                            }
                        ]
                    }
                }
            }
        };
    }
}