import * as path from 'path';
import { REPOSITORY_COUNTED_EXTENSIONS } from '../config/repositoryRules';
import { AICommentType, AICommentPattern, AICodeBlock } from '../types';

// Unión dinámica de todas las extensiones configuradas por repositorio.
const allCountedExtensions: string[] = [];
Object.values(REPOSITORY_COUNTED_EXTENSIONS).forEach((extensions: Set<string>) => {
    extensions.forEach((extension: string) => {
        allCountedExtensions.push(extension.toLowerCase());
    });
});
const CLOC_ALIGNED_EXTENSIONS = new Set(allCountedExtensions);


export class AICodeDetector {
    private patterns: AICommentPattern[];

    constructor() {
        this.patterns = this.initializePatterns();
    }

    /**
     * Inicializa los patrones de detección para las diferentes reglas
     */
    private initializePatterns(): AICommentPattern[] {
        const githubToken = 'github';
        const copilotToken = 'copilot';
        const metodoToken = 'm(?:e|é|�)?todo';
        const codigoToken = 'c(?:o|ó|�)?digo';
        const refactorizacionToken = 'refactorizaci(?:o|ó|�)?n';
        const optimizacionToken = 'optimizaci(?:o|ó|�)?n';

        return [
            // Regla 7: Método generado (sin comentario de cierre)
            // Detecta por contenido en línea, sin depender del formato exacto del comentario.
            {
                type: AICommentType.METHOD,
                startPattern: this.buildContainsPattern([
                    metodoToken,
                    'generad[oa]',
                    githubToken,
                    copilotToken
                ]),
                hasClosingComment: false
            },
            // Regla 8: Fragmento de código (con inicio y fin)
            {
                type: AICommentType.FRAGMENT,
                startPattern: this.buildContainsPattern([
                    'inicio',
                    codigoToken,
                    'generad[oa]',
                    githubToken,
                    copilotToken
                ]),
                endPattern: this.buildContainsPattern([
                    'fin',
                    codigoToken,
                    'generad[oa]',
                    githubToken,
                    copilotToken
                ]),
                hasClosingComment: true
            },
            // Regla 10: Refactorización/Optimización (con inicio y fin)
            {
                type: AICommentType.REFACTORING,
                startPattern: this.buildContainsPattern([
                    'inicio',
                    `(?:${refactorizacionToken}|${optimizacionToken})`,
                    githubToken,
                    copilotToken
                ]),
                endPattern: this.buildContainsPattern([
                    'fin',
                    `(?:${refactorizacionToken}|${optimizacionToken})`,
                    githubToken,
                    copilotToken
                ]),
                hasClosingComment: true
            }
        ];
    }

    /**
     * Construye un RegExp que valida que todos los fragmentos existan
     * en la misma línea, sin exigir un orden/formato de comentario estricto.
     */
    private buildContainsPattern(requiredFragments: string[]): RegExp {
        const lookaheads = requiredFragments.map(fragment => `(?=.*${fragment})`).join('');
        return new RegExp(`${lookaheads}.*`, 'iu');
    }

    /**
     * Fuerza comparación case-insensitive para cualquier patrón configurado.
     */
    private testPattern(pattern: RegExp, line: string): boolean {
        const flags = Array.from(new Set(`${pattern.flags.replace(/g/g, '')}i`)).join('');
        return new RegExp(pattern.source, flags).test(line);
    }

    /**
     * Detecta todos los bloques de código generado por AI en un archivo
     */
    public detectAIBlocks(fileContent: string, filePath: string): AICodeBlock[] {
        if (!this.shouldAnalyzeFileType(filePath)) {
            return [];
        }

        const lines = fileContent.split('\n');
        const allBlocks: AICodeBlock[] = [];

        for (const pattern of this.patterns) {
            const detectedBlocks = this.detectBlocksByPattern(lines, pattern, filePath);
            allBlocks.push(...detectedBlocks);
        }

        // Mantener bloques superpuestos (pueden representar reglas distintas)
        // y eliminar únicamente duplicados exactos.
        const uniqueBlocks = new Map<string, AICodeBlock>();
        for (const block of allBlocks) {
            const key = `${block.type}:${block.startLine}:${block.endLine}`;
            if (!uniqueBlocks.has(key)) {
                uniqueBlocks.set(key, block);
            }
        }

        return Array.from(uniqueBlocks.values()).sort((a, b) => {
            if (a.startLine !== b.startLine) {
                return a.startLine - b.startLine;
            }
            return a.endLine - b.endLine;
        });
    }

    private shouldAnalyzeFileType(filePath: string): boolean {
        const extension = path.extname(filePath).toLowerCase();
        return CLOC_ALIGNED_EXTENSIONS.has(extension);
    }

    /**
     * Detecta bloques de código basados en un patrón específico
     */
    private detectBlocksByPattern(
        lines: string[],
        pattern: AICommentPattern,
        filePath: string
    ): AICodeBlock[] {
        const blocks: AICodeBlock[] = [];
        let i = 0;

        while (i < lines.length) {
            const line = lines[i].trim();

            // Buscar comentario de inicio
            if (this.testPattern(pattern.startPattern, line)) {
                const startLine = i + 1; // 1-based line numbers

                if (pattern.hasClosingComment && pattern.endPattern) {
                    // Permite detectar bloques cuyo inicio y fin están en la misma línea.
                    if (this.testPattern(pattern.endPattern, line)) {
                        blocks.push({
                            type: pattern.type,
                            startLine,
                            endLine: startLine,
                            lineCount: 1,
                            filePath
                        });
                        i++;
                        continue;
                    }

                    // Buscar comentario de cierre (Reglas 8 y 10)
                    const endLine = this.findClosingComment(lines, i, pattern.endPattern);
                    
                    if (endLine !== -1) {
                        blocks.push({
                            type: pattern.type,
                            startLine,
                            endLine: endLine + 1, // 1-based
                            lineCount: endLine - i + 1,
                            filePath
                        });
                        i = endLine + 1;
                        continue;
                    } else {
                        console.warn(`⚠️  Advertencia: Bloque sin cierre en ${filePath}:${startLine}`);
                        console.warn(`    Tipo: ${pattern.type}`);
                    }
                } else {
                    // Método sin cierre (Regla 7)
                    const endLine = this.findMethodEnd(lines, i);
                    
                    if (endLine > i) {
                        blocks.push({
                            type: pattern.type,
                            startLine,
                            endLine: endLine + 1, // 1-based
                            lineCount: endLine - i + 1,
                            filePath
                        });
                        i = endLine + 1;
                        continue;
                    } else {
                        console.warn(`⚠️  Advertencia: No se pudo determinar el final del método en ${filePath}:${startLine}`);
                    }
                }
            }
            i++;
        }

        return blocks;
    }

    /**
     * Encuentra el comentario de cierre para fragmentos y refactorizaciones
     */
    private findClosingComment(lines: string[], startIndex: number, endPattern: RegExp): number {
        for (let i = startIndex + 1; i < lines.length; i++) {
            if (this.testPattern(endPattern, lines[i])) {
                return i;
            }
        }
        return -1; // No encontrado
    }

    /**
     * Encuentra el final de un método generado (Regla 7)
     * Busca el cierre de llaves que corresponde al método
     */
    private findMethodEnd(lines: string[], startIndex: number): number {
        let braceCount = 0;
        let methodStartFound = false;
        let inString = false;
        let stringChar = '';
        let inLineComment = false;
        let inBlockComment = false;

        for (let i = startIndex + 1; i < lines.length; i++) {
            const line = lines[i];
            const trimmedLine = line.trim();
            inLineComment = false; // Reset para cada línea

            // Saltar líneas vacías antes de encontrar el inicio del método
            if (!methodStartFound && trimmedLine.length === 0) {
                continue;
            }

            // Procesar carácter por carácter para manejar strings y comentarios
            for (let j = 0; j < line.length; j++) {
                const char = line[j];
                const nextChar = j + 1 < line.length ? line[j + 1] : '';
                const prevChar = j > 0 ? line[j - 1] : '';

                // Detectar inicio de comentario de línea
                if (char === '/' && nextChar === '/' && !inString && !inBlockComment) {
                    inLineComment = true;
                    break; // Saltar el resto de la línea
                }

                // Detectar inicio de comentario de bloque
                if (char === '/' && nextChar === '*' && !inString && !inLineComment) {
                    inBlockComment = true;
                    j++; // Saltar el *
                    continue;
                }

                // Detectar fin de comentario de bloque
                if (char === '*' && nextChar === '/' && inBlockComment) {
                    inBlockComment = false;
                    j++; // Saltar el /
                    continue;
                }

                // Detectar inicio/fin de strings
                if ((char === '"' || char === "'" || char === '`') && !inLineComment && !inBlockComment) {
                    // Verificar que no sea un escape
                    if (prevChar !== '\\') {
                        if (!inString) {
                            inString = true;
                            stringChar = char;
                        } else if (char === stringChar) {
                            inString = false;
                            stringChar = '';
                        }
                    }
                    continue;
                }

                // Solo contar llaves fuera de strings y comentarios
                if (!inString && !inLineComment && !inBlockComment) {
                    if (char === '{') {
                        braceCount++;
                        if (!methodStartFound) {
                            methodStartFound = true;
                        }
                    } else if (char === '}') {
                        braceCount--;
                        
                        // Cuando las llaves se equilibran, hemos encontrado el final
                        if (methodStartFound && braceCount === 0) {
                            return i;
                        }
                    }
                }
            }

            // Para firmas sin bloque (interfaces o métodos de expresión),
            // tomar como fin la primera línea no vacía que termina en ';'.
            if (!methodStartFound && /;\s*$/.test(trimmedLine)) {
                return i;
            }
        }

        // Si no se encuentra el cierre, retornar la última línea del archivo
        return lines.length - 1;
    }

    /**
     * Valida si una línea contiene algún patrón de comentario AI
     */
    public isAIComment(line: string): boolean {
        return this.patterns.some(pattern => 
            this.testPattern(pattern.startPattern, line) || 
            (pattern.endPattern && this.testPattern(pattern.endPattern, line))
        );
    }

    /**
     * Obtiene el tipo de comentario AI de una línea
     */
    public getCommentType(line: string): AICommentType | null {
        for (const pattern of this.patterns) {
            if (this.testPattern(pattern.startPattern, line)) {
                return pattern.type;
            }
        }
        return null;
    }

    /**
     * Método de debug para diagnosticar problemas de detección
     */
    public debugDetection(fileContent: string, filePath: string): void {
        const lines = fileContent.split('\n');
        const relativePath = filePath.split('\\').slice(-3).join('\\');
        console.log(`\n🔍 Analizando: ${relativePath}`);
        console.log(`   Total de líneas: ${lines.length}`);
        
        let foundCount = 0;
        const foundLines: number[] = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            for (const pattern of this.patterns) {
                if (this.testPattern(pattern.startPattern, line)) {
                    foundCount++;
                    foundLines.push(i + 1);
                    const preview = line.trim().substring(0, 60);
                    console.log(`   ✓ Encontrado INICIO ${pattern.type} en línea ${i + 1}: ${preview}${line.trim().length > 60 ? '...' : ''}`);
                }
                if (pattern.endPattern && this.testPattern(pattern.endPattern, line)) {
                    console.log(`   ✓ Encontrado FIN de ${pattern.type} en línea ${i + 1}`);
                }
            }
        }
        
        if (foundCount === 0) {
            console.log(`   ⚠️  No se encontraron comentarios AI en este archivo`);
        } else {
            console.log(`   📊 Total de comentarios de inicio encontrados: ${foundCount}`);
            
            // Intentar detectar bloques
            const blocks = this.detectAIBlocks(fileContent, filePath);
            console.log(`   📊 Total de bloques completados detectados: ${blocks.length}`);
            
            if (blocks.length < foundCount) {
                console.log(`   ⚠️  ADVERTENCIA: Se encontraron ${foundCount} comentarios de inicio pero solo ${blocks.length} bloques completos`);
                console.log(`   ⚠️  Posibles causas: comentarios sin cierre, bloques anidados, o errores en el formato`);
            }
            
            // Mostrar detalles de cada bloque
            blocks.forEach((block, index) => {
                console.log(`   🔷 Bloque ${index + 1}: ${block.type} (líneas ${block.startLine}-${block.endLine}, total: ${block.lineCount})`);
            });
        }
    }
}
