import xlsx from 'xlsx';
import path from 'path';

const filePath = path.resolve('PLANIFICACION OCUPAMOR ABRIL -JULIO 2026.xlsx');
console.log('Inspecting file:', filePath);

try {
  const workbook = xlsx.readFile(filePath);
  console.log('Sheet names:', workbook.SheetNames);

  workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    console.log(`\n========================================`);
    console.log(`Sheet: ${sheetName}`);
    console.log(`========================================`);
    
    let count = 0;
    for (let r = 0; r < data.length; r++) {
      const row = data[r];
      // Check if row has any non-empty element
      const isNotEmpty = row && row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== '');
      if (isNotEmpty) {
        console.log(`Row ${r}:`, row.map(c => c === undefined || c === null ? '' : String(c).trim()));
        count++;
        if (count >= 15) break;
      }
    }
  });
} catch (err) {
  console.error('Error reading excel:', err);
}
