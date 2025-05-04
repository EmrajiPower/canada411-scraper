import fs from 'fs';
import path from 'path';

const folderPath = 'Athens/output'

const archivos = fs.readdirSync(folderPath);

// Extraer el número antes de ".csv" y después del último "_"
const arregloB = archivos.map(nombre => {
  const match = nombre.match(/_(\d+)\.csv$/);
  return match ? parseInt(match[1], 10) : 0; // Devuelve 0 si no hay coincidencia
});

console.log(arregloB);

// Sumar todos los valores extraídos
const sumaTotal = arregloB.reduce((acc, num) => acc + num, 0);

console.log("Sumatoria de los números:", sumaTotal);
