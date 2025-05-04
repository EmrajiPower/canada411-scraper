import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import csv from 'csv-parser';
import XLSX from 'xlsx';
import { fileURLToPath } from 'url';

const readdir = promisify(fs.readdir);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const csvDir = path.join(__dirname, 'deliveryV2'); // Directory with CSVs
const outputExcel = 'deliveryV2.xlsx';

const readCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => results.push(row))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
};

const mergeCSVFilesToExcel = async () => {
  try {
    const files = (await readdir(csvDir)).filter(file => file.endsWith('.csv'));
    const totalFiles = files.length;
    const allData = [];

    console.log(`🔍 Found ${totalFiles} CSV files in '${csvDir}'`);

    for (const [index, file] of files.entries()) {
      const filePath = path.join(csvDir, file);
      const data = await readCSV(filePath);
      allData.push(...data);

      const percent = ((index + 1) / totalFiles * 100).toFixed(2);
      console.log(`📄 Processed [${index + 1}/${totalFiles}] "${file}" — ${percent}% done`);
    }

    const worksheet = XLSX.utils.json_to_sheet(allData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Merged Data');

    XLSX.writeFile(workbook, outputExcel);
    console.log(`✅ Successfully merged into '${outputExcel}'`);
  } catch (error) {
    console.error('❌ Error during merge:', error);
  }
};

mergeCSVFilesToExcel();
