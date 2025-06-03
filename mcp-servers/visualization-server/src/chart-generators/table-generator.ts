import { TableData, TableOptions, GeneratedTable } from '../types.js';
import { v4 as uuidv4 } from 'uuid';

export class TableGenerator {
  /**
   * Generate a unique ID for the table
   */
  private generateId(): string {
    return uuidv4();
  }

  /**
   * Generate an HTML table with the provided data and options
   */
  public generateTable(data: TableData, options: TableOptions = {}): GeneratedTable {
    try {
      // Default options
      const defaultOptions: TableOptions = {
        width: 800,
        height: 600,
        style: {
          headerBackgroundColor: '#f2f2f2',
          headerTextColor: '#333',
          rowAlternateColor: '#f9f9f9',
          borderColor: '#ddd',
          fontFamily: 'Arial, sans-serif'
        },
        pagination: false,
        pageSize: 10,
        sortable: false,
        exportable: false
      };

      // Merge with provided options
      const mergedOptions = { ...defaultOptions, ...options };
      const style = { ...defaultOptions.style, ...options.style };

      // Generate HTML table
      let html = `
        <div class="table-container" style="
          width: ${mergedOptions.width}px;
          max-height: ${mergedOptions.height}px;
          overflow: auto;
          font-family: ${style.fontFamily};
        ">
          <table style="
            width: 100%;
            border-collapse: collapse;
            margin: 25px 0;
            font-size: 14px;
            border: 1px solid ${style.borderColor};
          ">
            <thead>
              <tr>
      `;

      // Add table headers
      data.columns.forEach(column => {
        html += `
          <th style="
            padding: 12px 15px;
            text-align: ${column.textAlign || 'left'};
            background-color: ${style.headerBackgroundColor};
            color: ${style.headerTextColor};
            font-weight: bold;
            ${column.width ? `width: ${column.width};` : ''}
          ">${column.header}</th>
        `;
      });

      html += `
              </tr>
            </thead>
            <tbody>
      `;

      // Add table rows
      data.rows.forEach((row, rowIndex) => {
        const isAlternateRow = rowIndex % 2 === 1;
        html += `
          <tr style="
            background-color: ${isAlternateRow ? style.rowAlternateColor : 'white'};
          ">
        `;

        // Add table cells
        data.columns.forEach(column => {
          const cellValue = row[column.field];
          let formattedValue = cellValue;

          // Format cell value based on column format
          if (column.format) {
            switch (column.format) {
              case 'number':
                formattedValue = typeof cellValue === 'number' ? 
                  cellValue.toLocaleString() : cellValue;
                break;
              case 'currency':
                formattedValue = typeof cellValue === 'number' ? 
                  `$${cellValue.toFixed(2).toLocaleString()}` : cellValue;
                break;
              case 'date':
                formattedValue = cellValue instanceof Date ? 
                  cellValue.toLocaleDateString() : cellValue;
                break;
              case 'percent':
                formattedValue = typeof cellValue === 'number' ? 
                  `${(cellValue * 100).toFixed(1)}%` : cellValue;
                break;
            }
          }

          html += `
            <td style="
              padding: 12px 15px;
              text-align: ${column.textAlign || 'left'};
              border-bottom: 1px solid ${style.borderColor};
            ">${formattedValue}</td>
          `;
        });

        html += `
          </tr>
        `;
      });

      html += `
            </tbody>
          </table>
      `;

      // Add pagination if enabled
      if (mergedOptions.pagination) {
        const pageSize = mergedOptions.pageSize || 10; // Default to 10 if undefined
        const totalPages = Math.ceil(data.rows.length / pageSize);
        
        html += `
          <div class="pagination" style="
            display: flex;
            justify-content: center;
            margin-top: 10px;
          ">
            <span>Page 1 of ${totalPages}</span>
          </div>
        `;
      }

      html += `
        </div>
      `;

      // Return generated table object
      return {
        id: this.generateId(),
        data,
        options: mergedOptions,
        htmlContent: html
      };
    } catch (error) {
      console.error('Error generating table:', error);
      throw new Error(`Failed to generate table: ${error}`);
    }
  }

  /**
   * Generate a responsive HTML table
   */
  public generateResponsiveTable(data: TableData, options: TableOptions = {}): GeneratedTable {
    try {
      // Set responsive option to true
      const responsiveOptions: TableOptions = {
        ...options,
        responsive: true
      };

      // Add additional CSS for responsive behavior
      const table = this.generateTable(data, responsiveOptions);
      
      // Wrap the table in a responsive container
      const responsiveHtml = `
        <div class="responsive-table-container" style="
          width: 100%;
          overflow-x: auto;
        ">
          ${table.htmlContent}
        </div>
      `;

      return {
        ...table,
        htmlContent: responsiveHtml
      };
    } catch (error) {
      console.error('Error generating responsive table:', error);
      throw new Error(`Failed to generate responsive table: ${error}`);
    }
  }
}