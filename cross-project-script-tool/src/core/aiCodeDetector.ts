import { AICommentType, AICommentPattern, AICodeBlock } from '../types';

export class AICodeDetector {
    private patterns: AICommentPattern[];

    constructor() {
        this.patterns = this.initializePatterns();
    }

    /**
     * Inicializa los patrones de detección para las diferentes reglas
     */
    private initializePatterns(): AICommentPattern[] {
        return [
            // Regla 7: Método generado (sin comentario de cierre)
            // Acepta: Método, Metodo, M�todo, etc.
            {
                type: AICommentType.METHOD,
                startPattern: /(?:\/\/|<!--)\s*M[ée�]todo\s+generado\s+por\s+GitHub\s+Copilot(?:\s*-->)?/i,
                hasClosingComment: false
            },
            // Regla 8: Fragmento de código (con inicio y fin)
            // Acepta: código, codigo, c�digo, etc.
            {
                type: AICommentType.FRAGMENT,
                startPattern: /(?:\/\/|<!--)\s*Inicio\s+c[óo�]digo\s+generado\s+por\s+GitHub\s+Copilot(?:\s*-->)?/i,
                endPattern: /(?:\/\/|<!--)\s*Fin\s+c[óo�]digo\s+generado\s+por\s+GitHub\s+Copilot(?:\s*-->)?/i,
                hasClosingComment: true
            },
            // Regla 10: Refactorización/Optimización (con inicio y fin)
            // Acepta: refactorización, refactorizacion, refactorizaci�n, optimización, optimizacion, optimizaci�n, etc.
            {
                type: AICommentType.REFACTORING,
                startPattern: /(?:\/\/|<!--)\s*Inicio\s+refactorizaci[óo�]n[\s\/]*optimizaci[óo�]n\s+por\s+GitHub\s+Copilot(?:\s*-->)?/i,
                endPattern: /(?:\/\/|<!--)\s*Fin\s+refactorizaci[óo�]n[\s\/]*optimizaci[óo�]n\s+por\s+GitHub\s+Copilot(?:\s*-->)?/i,
                hasClosingComment: true
            }
        ];
    }

    /**
     * Detecta todos los bloques de código generado por AI en un archivo
     */
    public detectAIBlocks(fileContent: string, filePath: string): AICodeBlock[] {
        const lines = fileContent.split('\n');
        const allBlocks: AICodeBlock[] = [];

        for (const pattern of this.patterns) {
            const detectedBlocks = this.detectBlocksByPattern(lines, pattern, filePath);
            allBlocks.push(...detectedBlocks);
        }

        // Ordenar bloques por línea de inicio
        allBlocks.sort((a, b) => a.startLine - b.startLine);

        // Eliminar bloques superpuestos, manteniendo el más específico
        const nonOverlappingBlocks: AICodeBlock[] = [];
        const usedLines = new Set<number>();

        for (const block of allBlocks) {
            let hasOverlap = false;
            
            // Verificar si este bloque se superpone con líneas ya usadas
            for (let line = block.startLine; line <= block.endLine; line++) {
                if (usedLines.has(line)) {
                    hasOverlap = true;
                    break;
                }
            }

            if (!hasOverlap) {
                // No hay superposición, agregar el bloque
                nonOverlappingBlocks.push(block);
                
                // Marcar todas las líneas de este bloque como usadas
                for (let line = block.startLine; line <= block.endLine; line++) {
                    usedLines.add(line);
                }
            } else {
                // Hay superposición, decidir cuál mantener basado en prioridad
                // Prioridad: FRAGMENT > REFACTORING > METHOD (los más específicos tienen prioridad)
                const priority = { 'fragment': 3, 'refactoring': 2, 'method': 1 };
                const currentPriority = priority[block.type] || 0;

                // Encontrar bloques superpuestos
                const overlappingIndices: number[] = [];
                for (let i = 0; i < nonOverlappingBlocks.length; i++) {
                    const existing = nonOverlappingBlocks[i];
                    if (this.blocksOverlap(block, existing)) {
                        overlappingIndices.push(i);
                    }
                }

                // Si el nuevo bloque tiene mayor prioridad, reemplazar los existentes
                if (overlappingIndices.length > 0) {
                    const existingPriority = Math.max(...overlappingIndices.map(i => 
                        priority[nonOverlappingBlocks[i].type] || 0
                    ));

                    if (currentPriority > existingPriority) {
                        // Remover bloques con menor prioridad
                        for (let i = overlappingIndices.length - 1; i >= 0; i--) {
                            const idx = overlappingIndices[i];
                            const removed = nonOverlappingBlocks[idx];
                            
                            // Liberar las líneas del bloque removido
                            for (let line = removed.startLine; line <= removed.endLine; line++) {
                                usedLines.delete(line);
                            }
                            
                            nonOverlappingBlocks.splice(idx, 1);
                        }

                        // Agregar el nuevo bloque
                        nonOverlappingBlocks.push(block);
                        for (let line = block.startLine; line <= block.endLine; line++) {
                            usedLines.add(line);
                        }
                    }
                }
            }
        }

        // Re-ordenar por línea de inicio
        return nonOverlappingBlocks.sort((a, b) => a.startLine - b.startLine);
    }

    /**
     * Verifica si dos bloques se superponen
     */
    private blocksOverlap(block1: AICodeBlock, block2: AICodeBlock): boolean {
        return !(block1.endLine < block2.startLine || block1.startLine > block2.endLine);
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
            if (pattern.startPattern.test(line)) {
                const startLine = i + 1; // 1-based line numbers

                if (pattern.hasClosingComment && pattern.endPattern) {
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
            if (endPattern.test(lines[i])) {
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
        }

        // Si no se encuentra el cierre, retornar la última línea del archivo
        return lines.length - 1;
    }

    /**
     * Valida si una línea contiene algún patrón de comentario AI
     */
    public isAIComment(line: string): boolean {
        return this.patterns.some(pattern => 
            pattern.startPattern.test(line) || 
            (pattern.endPattern && pattern.endPattern.test(line))
        );
    }

    /**
     * Obtiene el tipo de comentario AI de una línea
     */
    public getCommentType(line: string): AICommentType | null {
        for (const pattern of this.patterns) {
            if (pattern.startPattern.test(line)) {
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
                if (pattern.startPattern.test(line)) {
                    foundCount++;
                    foundLines.push(i + 1);
                    const preview = line.trim().substring(0, 60);
                    console.log(`   ✓ Encontrado INICIO ${pattern.type} en línea ${i + 1}: ${preview}${line.trim().length > 60 ? '...' : ''}`);
                }
                if (pattern.endPattern && pattern.endPattern.test(line)) {
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
