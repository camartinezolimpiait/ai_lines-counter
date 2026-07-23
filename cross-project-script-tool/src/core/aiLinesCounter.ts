import * as fs from 'fs';
import * as path from 'path';
import { execFileSync } from 'child_process';
import { AICodeDetector } from './aiCodeDetector';
import { ProjectsConfig } from '../config/projectsConfig';
import { FileAIStats, ProjectAIStats, AICodeBlock, AICommentType } from '../types';

const DEFAULT_COUNTED_EXTENSIONS = new Set<string>();

const REPOSITORY_NAME_ALIASES: Record<string, string> = {
    'ApiBackMiLicencia': 'MiLicencia_ApiBack',
    'ApiBackMiLicencia2-0': 'MiLicencia_ApiBack2-0',
    'ApiBackPortalAdminCentro': 'MiLicencia_ApiBackAdminCentro',
    'ApiBackPortalAdminCentro2-0': 'MiLicencia_ApiBackAdminCentro2-0',
    'ApiBackIntegrador': 'MiLicencia_ApiBackIntegrador',
    'ApiBackIntegrador2-0': 'MiLicencia_ApiBackIntegrador2-0',
    'ApiFrontMiLicencia': 'MiLicencia_ApiFront',
    'ApiFrontMiLicenciaV1-5': 'MiLicencia_ApiFrontV1-5',
    'FrontEndCentro': 'MiLicencia_FrontEndCentro',
    'PortalAdminCentro': 'MiLicencia_PortalAdminCentro',
    'PortalAdminCentro2-0': 'MiLicencia_PortalAdminCentro2-0',
    'FrontEndCiudadano': 'MiLicencia_FrontEndCiudadano',
    'FrontEndCiudadano1-5': 'MiLicencia_FrontEndCiudadano1-5',
};

const REPOSITORY_COUNTED_EXTENSIONS: Record<string, Set<string>> = {
    'MiLicencia_ApiBack': new Set(['.cs', '.cshtml', '.razor']),
    'MiLicencia_ApiBack2-0': new Set(['.cs', '.cshtml', '.razor']),
    'MiLicencia_ApiBackAdminCentro': new Set(['.cs', '.cshtml', '.razor']),
    'MiLicencia_ApiBackAdminCentro2-0': new Set(['.cs', '.cshtml', '.razor']),
    'MiLicencia_ApiBackIntegrador': new Set(['.cs']),
    'MiLicencia_ApiBackIntegrador2-0': new Set(['.cs']),
    'MiLicencia_ApiFront': new Set(['.cs']),
    'MiLicencia_ApiFrontV1-5': new Set(['.cs']),
    'MiLicencia_FrontEndCentro': new Set(['.ts', '.tsx', '.html', '.htm']),
    'MiLicencia_PortalAdminCentro': new Set(['.cs', '.cshtml', '.razor', '.html', '.htm']),
    'MiLicencia_PortalAdminCentro2-0': new Set(['.ts', '.tsx', 'svelte', '.html', '.htm']),
    'MiLicencia_FrontEndCiudadano': new Set(['.ts', '.html', '.htm']),
    'MiLicencia_FrontEndCiudadano1-5': new Set(['.ts', '.html', '.htm']),

};

const REPOSITORY_CLOC_INCLUDED_LANGUAGES: Record<string, string[]> = {
    MiLicencia_ApiBack: ['C#', 'Razor'],
    'MiLicencia_ApiBack2-0': ['C#', 'Razor'],
    'MiLicencia_ApiBackAdminCentro': ['C#', 'Razor'],
    'MiLicencia_ApiBackAdminCentro2-0': ['C#', 'Razor'],
    'MiLicencia_ApiBackIntegrador': ['C#'],
    'MiLicencia_ApiBackIntegrador2-0': ['C#'],
    'MiLicencia_ApiFront': ['C#'],
    'MiLicencia_ApiFrontV1-5': ['C#'],
    'MiLicencia_FrontEndCentro': ['TypeScript', 'HTML'],
    'MiLicencia_PortalAdminCentro': ['C#', 'Razor', 'HTML'],
    'MiLicencia_PortalAdminCentro2-0': ['TypeScript', 'Svelte', 'HTML'],
    'MiLicencia_FrontEndCiudadano': ['TypeScript', 'HTML'],
    'MiLicencia_FrontEndCiudadano1-5': ['TypeScript', 'HTML']
};

const SKIP_DIRECTORIES = [
    'node_modules',
    'dist',
    'build',
    '.git',
    '.vscode',
    'coverage',
    '.next',
    '.nuxt',
    'out',
    'bin',
    'obj',
    'target',
    '__pycache__',
    'venv',
    '.env'
];

const API_BACK_EXCLUDED_EXTENSIONS = new Set([
    '.asax',
    '.ascx',
    '.asmx',
    '.aspx',
    '.axd',
    '.config',
    '.css',
    '.dockerfile',
    '.htm',
    '.html',
    '.js',
    '.json',
    '.less',
    '.md',
    '.props',
    '.sln',
    '.svg',
    '.targets',
    '.txt',
    '.wsdl',
    '.xml',
    '.xsd',
    '.yaml',
    '.yml'
]);

const API_BACK_EXCLUDED_FILE_NAMES = new Set([
    'dockerfile'
]);

const API_BACK_EXCLUDED_FILE_PATTERNS = [
    /\.designer\.cs$/i,
    /\.generated\.cs$/i,
    /\.g\.cs$/i,
    /\.g\.i\.cs$/i,
    /\.assemblyattributes\.cs$/i,
    /\.csproj$/i,
    /\.fsproj$/i,
    /\.vbproj$/i
];

interface ClocLanguageStats {
    code?: number;
}

interface ClocJsonReport {
    [language: string]: ClocLanguageStats | unknown;
}

export class AILinesCounter {
    private detector: AICodeDetector;
    private fileExtensions: string[];
    private clocExecutable: string;
    private debugMode: boolean;

    constructor(debugMode: boolean = false) {
        this.detector = new AICodeDetector();
        this.debugMode = debugMode;
        this.clocExecutable = this.resolveClocExecutable();
        // Extensiones de archivos de código a analizar
        this.fileExtensions = [
            '.ts', '.tsx', '.js', '.jsx',  // TypeScript y JavaScript
            '.html', '.htm',               // HTML
            '.cshtml', '.razor',           // Razor
            '.cs', '.java', '.py',          // C#, Java, Python
            '.cpp', '.c', '.h',             // C++, C
            '.php', '.rb', '.go',           // PHP, Ruby, Go
            '.swift', '.kt',                // Swift, Kotlin
            '.rs', '.scala',                // Rust, Scala  
            '.svelte'                       // Svelte
        ];
    }

    /**
     * Analiza un proyecto completo y retorna estadísticas de código AI
     */
    public async analyzeProject(projectPath: string, projectType: string): Promise<ProjectAIStats> {
        const files = this.getAllCodeFiles(projectPath);
        const fileStats: FileAIStats[] = [];

        if (this.debugMode) {
            console.log(`\n📊 Modo debug activado`);
            console.log(`📁 Total de archivos a analizar: ${files.length}\n`);
        }

        for (const filePath of files) {
            const stats = await this.analyzeFile(filePath);
            if (stats) {
                fileStats.push(stats);
            }
        }

        return this.aggregateStats(projectPath, projectType, fileStats);
    }

    /**
     * Analiza un archivo individual
     */
    public async analyzeFile(filePath: string): Promise<FileAIStats | null> {
        try {
            // Intentar leer con diferentes encodings
            let content: string;
            try {
                // Primero intentar UTF-8
                content = fs.readFileSync(filePath, 'utf-8');
            } catch {
                try {
                    // Si falla, intentar latin1 (Windows-1252)
                    content = fs.readFileSync(filePath, 'latin1');
                } catch {
                    // Como último recurso, intentar binary y convertir
                    const buffer = fs.readFileSync(filePath);
                    content = buffer.toString('utf-8');
                }
            }

            const lines = content.split('\n');
            
            const blocks = this.detector.detectAIBlocks(content, filePath);

            // Modo debug: mostrar información detallada solo en archivos con código AI
            if (this.debugMode && blocks.length > 0) {
                this.detector.debugDetection(content, filePath);
            }

            const methods = blocks.filter(b => b.type === AICommentType.METHOD);
            const fragments = blocks.filter(b => b.type === AICommentType.FRAGMENT);
            const refactorings = blocks.filter(b => b.type === AICommentType.REFACTORING);

            const aiGeneratedLines = blocks.reduce((sum, block) => sum + block.lineCount, 0);

            return {
                filePath,
                totalLines: lines.length,
                aiGeneratedLines,
                methods,
                fragments,
                refactorings
            };
        } catch (error) {
            console.error(`Error analizando archivo ${filePath}:`, error);
            return null;
        }
    }

    /**
     * Obtiene todos los archivos de código en el proyecto
     */
    private getAllCodeFiles(dirPath: string, fileList: string[] = []): string[] {
        try {
            const files = fs.readdirSync(dirPath);

            for (const file of files) {
                const filePath = path.join(dirPath, file);
                const stat = fs.statSync(filePath);

                if (stat.isDirectory()) {
                    // Ignorar directorios comunes que no contienen código fuente
                    if (this.shouldSkipDirectory(file)) {
                        continue;
                    }
                    this.getAllCodeFiles(filePath, fileList);
                } else if (stat.isFile() && this.isCodeFile(file)) {
                    fileList.push(filePath);
                }
            }
        } catch (error) {
            console.error(`Error leyendo directorio ${dirPath}:`, error);
        }

        return fileList;
    }

    /**
     * Verifica si un archivo es un archivo de código
     */
    private isCodeFile(fileName: string): boolean {
        const ext = path.extname(fileName).toLowerCase();
        return this.fileExtensions.includes(ext);
    }

    /**
     * Verifica si se debe omitir un directorio
     */
    private shouldSkipDirectory(dirName: string): boolean {
        return SKIP_DIRECTORIES.includes(dirName);
    }

    /**
     * Agrega estadísticas de todos los archivos
     */
    private aggregateStats(
        projectPath: string,
        projectType: string,
        fileStats: FileAIStats[]
    ): ProjectAIStats {
        const totalFiles = fileStats.length;
        const repositoryName = ProjectsConfig.extractRepositoryName(projectPath);
        const normalizedRepositoryName = REPOSITORY_NAME_ALIASES[repositoryName] || repositoryName;
        const countedExtensions = REPOSITORY_COUNTED_EXTENSIONS[normalizedRepositoryName] || DEFAULT_COUNTED_EXTENSIONS;
        const countedFileStats = fileStats
            .filter(stat => this.shouldCountFileLines(stat.filePath, normalizedRepositoryName, countedExtensions));
        const fallbackTotalLines = this.getFallbackTotalLines(normalizedRepositoryName, countedFileStats);
        const totalLines = this.getTotalLinesWithCloc(projectPath, normalizedRepositoryName, fallbackTotalLines);
        const totalAILines = fileStats.reduce((sum, stat) => sum + stat.aiGeneratedLines, 0);
        const aiPercentage = totalLines > 0 ? (totalAILines / totalLines) * 100 : 0;

        const methodCount = fileStats.reduce((sum, stat) => sum + stat.methods.length, 0);
        const fragmentCount = fileStats.reduce((sum, stat) => sum + stat.fragments.length, 0);
        const refactoringCount = fileStats.reduce((sum, stat) => sum + stat.refactorings.length, 0);

        return {
            projectPath,
            projectType,
            totalFiles,
            totalLines,
            totalAILines,
            aiPercentage: Math.round(aiPercentage * 100) / 100,
            fileStats: fileStats.filter(stat => stat.aiGeneratedLines > 0), // Solo archivos con código AI
            methodCount,
            fragmentCount,
            refactoringCount
        };
    }

    private shouldCountFileLines(filePath: string, repositoryName: string, countedExtensions: Set<string>): boolean {
        if (countedExtensions.size === 0) {
            return true;
        }

        const normalizedPath = filePath.replace(/\\/g, '/');
        const baseName = path.basename(normalizedPath).toLowerCase();
        const extension = path.extname(normalizedPath).toLowerCase();

        if (this.shouldExcludeGeneratedCSharpFile(repositoryName, normalizedPath, baseName, extension)) {
            return false;
        }

        if (repositoryName === 'MiLicencia_ApiBack') {
            if (API_BACK_EXCLUDED_FILE_NAMES.has(baseName)) {
                return false;
            }

            if (API_BACK_EXCLUDED_EXTENSIONS.has(extension)) {
                return false;
            }

            if (API_BACK_EXCLUDED_FILE_PATTERNS.some(pattern => pattern.test(baseName))) {
                return false;
            }
        }

        return countedExtensions.has(extension);
    }

    private shouldExcludeGeneratedCSharpFile(
        repositoryName: string,
        normalizedPath: string,
        baseName: string,
        extension: string
    ): boolean {
        const clocLanguages = REPOSITORY_CLOC_INCLUDED_LANGUAGES[repositoryName] || [];

        if (!clocLanguages.includes('C#') || extension !== '.cs') {
            return false;
        }

        if (API_BACK_EXCLUDED_FILE_PATTERNS.some(pattern => pattern.test(baseName))) {
            return true;
        }

        if (baseName.endsWith('modelsnapshot.cs')) {
            return true;
        }

        return normalizedPath.toLowerCase().includes('/connected services/') && baseName === 'reference.cs';
    }

    private getTotalLinesWithCloc(projectPath: string, repositoryName: string, fallbackTotalLines: number): number {
        const includedLanguages = REPOSITORY_CLOC_INCLUDED_LANGUAGES[repositoryName];

        if (!includedLanguages) {
            return fallbackTotalLines;
        }

        try {
            const report = this.runCloc(projectPath, includedLanguages);
            return includedLanguages.reduce((sum, language) => {
                const stats = report[language];

                if (!stats || typeof stats !== 'object') {
                    return sum;
                }

                const code = (stats as ClocLanguageStats).code;
                return sum + (typeof code === 'number' ? code : 0);
            }, 0);
        } catch (error) {
            if (this.debugMode) {
                const message = error instanceof Error ? error.message : String(error);
                console.warn(`⚠️  No fue posible usar cloc para ${repositoryName}. Se usará fallback local. ${message}`);
            }

            return fallbackTotalLines;
        }
    }

    private getFallbackTotalLines(repositoryName: string, fileStats: FileAIStats[]): number {
        if (!REPOSITORY_CLOC_INCLUDED_LANGUAGES[repositoryName]) {
            return fileStats.reduce((sum, stat) => sum + stat.totalLines, 0);
        }

        return fileStats.reduce((sum, stat) => sum + this.countApproximateCodeLines(stat.filePath), 0);
    }

    private countApproximateCodeLines(filePath: string): number {
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            return this.countCodeLinesFromContent(content, filePath);
        } catch {
            try {
                const content = fs.readFileSync(filePath, 'latin1');
                return this.countCodeLinesFromContent(content, filePath);
            } catch {
                const buffer = fs.readFileSync(filePath);
                return this.countCodeLinesFromContent(buffer.toString('utf-8'), filePath);
            }
        }
    }

    private countCodeLinesFromContent(content: string, filePath: string): number {
        const extension = path.extname(filePath).toLowerCase();
        const supportsHtmlComments = extension === '.html' || extension === '.htm' || extension === '.cshtml' || extension === '.razor';
        const supportsRazorComments = extension === '.cshtml' || extension === '.razor';
        const supportsSlashComments = extension !== '.html' && extension !== '.htm';

        const lines = content.replace(/\r\n/g, '\n').split('\n');
        let inBlockComment = false;
        let inHtmlComment = false;
        let inRazorComment = false;
        let inString = false;
        let inVerbatimString = false;
        let inChar = false;
        let codeLines = 0;

        for (const line of lines) {
            let hasCode = false;

            for (let index = 0; index < line.length; index++) {
                const char = line[index];
                const next = line[index + 1] || '';
                const third = line[index + 2] || '';
                const fourth = line[index + 3] || '';

                if (inRazorComment) {
                    if (char === '*' && next === '@') {
                        inRazorComment = false;
                        index++;
                    }
                    continue;
                }

                if (inBlockComment) {
                    if (char === '*' && next === '/') {
                        inBlockComment = false;
                        index++;
                    }
                    continue;
                }

                if (inHtmlComment) {
                    if (char === '-' && next === '-' && third === '>') {
                        inHtmlComment = false;
                        index += 2;
                    }
                    continue;
                }

                if (inString) {
                    if (!/\s/.test(char)) {
                        hasCode = true;
                    }

                    if (inVerbatimString) {
                        if (char === '"' && next === '"') {
                            index++;
                            continue;
                        }

                        if (char === '"') {
                            inString = false;
                            inVerbatimString = false;
                        }
                    } else {
                        if (char === '\\') {
                            index++;
                            continue;
                        }

                        if (char === '"') {
                            inString = false;
                        }
                    }

                    continue;
                }

                if (inChar) {
                    hasCode = true;

                    if (char === '\\') {
                        index++;
                        continue;
                    }

                    if (char === '\'') {
                        inChar = false;
                    }

                    continue;
                }

                if (supportsHtmlComments && char === '<' && next === '!' && third === '-' && fourth === '-') {
                    inHtmlComment = true;
                    index += 3;
                    continue;
                }

                if (supportsRazorComments && char === '@' && next === '*') {
                    inRazorComment = true;
                    index++;
                    continue;
                }

                if (char === '/' && next === '*') {
                    inBlockComment = true;
                    index++;
                    continue;
                }

                if (supportsSlashComments && char === '/' && next === '/') {
                    break;
                }

                if (char === '@' && next === '"') {
                    inString = true;
                    inVerbatimString = true;
                    hasCode = true;
                    index++;
                    continue;
                }

                if (char === '"') {
                    inString = true;
                    inVerbatimString = false;
                    hasCode = true;
                    continue;
                }

                if (char === '\'') {
                    inChar = true;
                    hasCode = true;
                    continue;
                }

                if (!/\s/.test(char)) {
                    hasCode = true;
                }
            }

            if (hasCode) {
                codeLines++;
            }
        }

        return codeLines;
    }

    private resolveClocExecutable(): string {
        const pathDirectories = (process.env.PATH || '').split(path.delimiter).filter(Boolean);
        const executableNames = process.platform === 'win32' ? ['cloc.exe', 'cloc'] : ['cloc'];

        for (const directory of pathDirectories) {
            for (const executableName of executableNames) {
                const candidate = path.join(directory, executableName);
                if (fs.existsSync(candidate)) {
                    return candidate;
                }
            }
        }

        if (process.platform === 'win32') {
            const localAppData = process.env.LOCALAPPDATA;
            if (localAppData) {
                const wingetPackagesDirectory = path.join(localAppData, 'Microsoft', 'WinGet', 'Packages');
                if (fs.existsSync(wingetPackagesDirectory)) {
                    const packageDirectory = fs.readdirSync(wingetPackagesDirectory)
                        .find(directory => directory.startsWith('AlDanial.Cloc_'));

                    if (packageDirectory) {
                        const wingetExecutable = path.join(wingetPackagesDirectory, packageDirectory, 'cloc.exe');
                        if (fs.existsSync(wingetExecutable)) {
                            return wingetExecutable;
                        }
                    }
                }
            }
        }

        return 'cloc';
    }

    private runCloc(projectPath: string, includedLanguages: string[]): ClocJsonReport {
        const args = [
            projectPath,
            '--json',
            '--sum-one',
            `--include-lang=${includedLanguages.join(',')}`,
            `--exclude-dir=${SKIP_DIRECTORIES.join(',')}`
        ];

        const output = execFileSync(this.clocExecutable, args, {
            cwd: projectPath,
            encoding: 'utf-8',
            stdio: ['ignore', 'pipe', 'pipe'],
            timeout: 60000
        });

        return JSON.parse(output) as ClocJsonReport;
    }

    /**
     * Genera un reporte detallado en formato texto
     */
    public generateTextReport(stats: ProjectAIStats): string {
        const lines: string[] = [];
        
        lines.push('═══════════════════════════════════════════════════════════════');
        lines.push('       REPORTE DE LÍNEAS GENERADAS POR GITHUB COPILOT        ');
        lines.push('═══════════════════════════════════════════════════════════════');
        lines.push('');
        lines.push(`Proyecto: ${stats.projectPath}`);
        lines.push(`Tipo: ${stats.projectType}`);
        lines.push('');
        lines.push('───────────────────────────────────────────────────────────────');
        lines.push('RESUMEN GENERAL');
        lines.push('───────────────────────────────────────────────────────────────');
        lines.push(`Total de archivos analizados: ${stats.totalFiles}`);
        lines.push(`Total de líneas de código: ${stats.totalLines}`);
        lines.push(`Líneas generadas por AI: ${stats.totalAILines}`);
        lines.push(`Porcentaje de código AI: ${stats.aiPercentage}%`);
        lines.push('');
        lines.push('───────────────────────────────────────────────────────────────');
        lines.push('DESGLOSE POR TIPO');
        lines.push('───────────────────────────────────────────────────────────────');
        lines.push(`Métodos completos (Regla 7): ${stats.methodCount}`);
        lines.push(`Fragmentos de código (Regla 8): ${stats.fragmentCount}`);
        lines.push(`Refactorizaciones (Regla 10): ${stats.refactoringCount}`);
        lines.push('');

        if (stats.fileStats.length > 0) {
            lines.push('───────────────────────────────────────────────────────────────');
            lines.push('ARCHIVOS CON CÓDIGO AI');
            lines.push('───────────────────────────────────────────────────────────────');
            
            for (const fileStat of stats.fileStats) {
                const relativePath = path.relative(stats.projectPath, fileStat.filePath);
                const percentage = Math.round((fileStat.aiGeneratedLines / fileStat.totalLines) * 100);
                
                lines.push('');
                lines.push(`📄 ${relativePath}`);
                lines.push(`   Total: ${fileStat.totalLines} líneas | AI: ${fileStat.aiGeneratedLines} líneas (${percentage}%)`);
                
                if (fileStat.methods.length > 0) {
                    lines.push(`   └─ Métodos: ${fileStat.methods.length}`);
                }
                if (fileStat.fragments.length > 0) {
                    lines.push(`   └─ Fragmentos: ${fileStat.fragments.length}`);
                }
                if (fileStat.refactorings.length > 0) {
                    lines.push(`   └─ Refactorizaciones: ${fileStat.refactorings.length}`);
                }
            }
        }

        lines.push('');
        lines.push('═══════════════════════════════════════════════════════════════');
        
        return lines.join('\n');
    }

    /**
     * Genera un reporte en formato JSON
     */
    public generateJsonReport(stats: ProjectAIStats): string {
        return JSON.stringify(stats, null, 2);
    }

    /**
     * Guarda el reporte en un archivo
     */
    public saveReport(stats: ProjectAIStats, outputPath: string, format: 'text' | 'json' = 'text'): void {
        try {
            const report = format === 'json' 
                ? this.generateJsonReport(stats)
                : this.generateTextReport(stats);
            
            fs.writeFileSync(outputPath, report, 'utf-8');
            console.log(`\n✅ Reporte guardado en: ${outputPath}`);
        } catch (error) {
            console.error(`Error guardando reporte:`, error);
        }
    }
}
