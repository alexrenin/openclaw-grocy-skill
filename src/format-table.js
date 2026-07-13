'use strict';

function formatTable(rows, columns) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return 'No data';
  }

  const widths = columns.map((column) => {
    const cells = rows.map((row) => stringifyCell(row[column.key]));
    return Math.max(column.label.length, ...cells.map((cell) => cell.length));
  });

  const header = formatRow(
    Object.fromEntries(columns.map((column) => [column.key, column.label])),
    columns,
    widths,
  );
  const separator = widths.map((width) => '-'.repeat(width)).join('-+-');
  const body = rows.map((row) => formatRow(row, columns, widths));

  return [header, separator, ...body].join('\n');
}

function formatRow(row, columns, widths) {
  return columns
    .map((column, index) => stringifyCell(row[column.key]).padEnd(widths[index], ' '))
    .join(' | ');
}

function stringifyCell(value) {
  if (value == null) {
    return '';
  }

  return String(value);
}

module.exports = {
  formatTable,
};
