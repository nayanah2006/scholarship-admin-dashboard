const fs = require('fs');
const path = require('path');

function parseCsvLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

function parseCsvText(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((header) => header.trim());
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    return row;
  });
}

function normalizeInstitutionEntry(entry) {
  return {
    id: String(entry.id || `${entry.categoryId || 'INST'}${Math.random().toString(36).slice(2, 8)}`).toUpperCase(),
    name: String(entry.name || entry.institution_name || '').trim(),
    total: String(entry.total || '0'),
    applied: String(entry.applied || '0'),
    pct: String(entry.pct || '0%'),
    approved: String(entry.approved || '0'),
    rejected: String(entry.rejected || '0'),
    pending: String(entry.pending || '0'),
    disbursed: String(entry.disbursed || '₹0')
  };
}

function padCategoryEntries(categoryEntries, categoryId = 'pu') {
  const minimumEntries = 15;
  if (categoryEntries.length >= minimumEntries) {
    return categoryEntries;
  }

  const padded = [...categoryEntries];
  const source = categoryEntries.length ? categoryEntries : [{
    id: `${categoryId.toUpperCase()}001`,
    name: `${categoryId.toUpperCase()} Institution`,
    total: '0',
    applied: '0',
    pct: '0%',
    approved: '0',
    rejected: '0',
    pending: '0',
    disbursed: '₹0',
  }];

  for (let i = padded.length; i < minimumEntries; i += 1) {
    const base = source[i % source.length];
    const baseName = String(base.name || `${categoryId.toUpperCase()} Institution`).trim();
    const suffix = i === 0 ? '' : ` ${i + 1}`;

    padded.push(
      normalizeInstitutionEntry({
        ...base,
        id: `${String(base.id || `${categoryId.toUpperCase()}000`).replace(/\d+$/, '')}${String(i + 1).padStart(3, '0')}`,
        name: `${baseName}${suffix}`,
        categoryId,
      })
    );
  }

  return padded;
}

function generateInstitutionMapFromRecords(records) {
  const grouped = {};

  records.forEach((record) => {
    const district = String(record.district || record.district_name || 'Unknown District').trim();
    const categoryId = String(record.categoryId || record.category_id || 'pu').trim().toLowerCase();
    const name = String(record.name || record.institution_name || '').trim();

    if (!name) return;

    if (!grouped[district]) grouped[district] = {};
    if (!grouped[district][categoryId]) grouped[district][categoryId] = [];

    grouped[district][categoryId].push(
      normalizeInstitutionEntry({
        ...record,
        name,
        categoryId,
        id: record.id || `${categoryId.toUpperCase()}${String(grouped[district][categoryId].length + 1).padStart(3, '0')}`
      })
    );
  });

  Object.keys(grouped).forEach((district) => {
    Object.keys(grouped[district]).forEach((categoryId) => {
      grouped[district][categoryId] = padCategoryEntries(grouped[district][categoryId], categoryId);
    });
  });

  return grouped;
}

function loadInputFile(filePath) {
  const fullPath = path.resolve(filePath);
  const text = fs.readFileSync(fullPath, 'utf8');

  if (fullPath.endsWith('.json')) {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : Object.values(parsed || {});
  }

  if (fullPath.endsWith('.csv')) {
    return parseCsvText(text);
  }

  throw new Error('Unsupported file type. Use .json or .csv');
}

function buildOutputJson(inputFile) {
  const records = loadInputFile(inputFile);
  return generateInstitutionMapFromRecords(records);
}

function main() {
  const args = process.argv.slice(2);
  const inputFile = args[0];
  const outputFile = args[1] || 'generatedInstitutionData.json';

  if (!inputFile) {
    console.error('Usage: node generateInstitutionData.js input.json|input.csv [output.json]');
    process.exit(1);
  }

  try {
    const generated = buildOutputJson(inputFile);
    const resolvedOutput = path.resolve(outputFile);
    fs.writeFileSync(resolvedOutput, JSON.stringify(generated, null, 2));
    console.log(`Generated institution data written to ${resolvedOutput}`);
  } catch (error) {
    console.error('Failed to generate institution data:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  parseCsvText,
  generateInstitutionMapFromRecords,
  buildOutputJson,
  loadInputFile,
  normalizeInstitutionEntry,
};
