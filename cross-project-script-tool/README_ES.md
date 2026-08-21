# 🤖 Contador de Líneas Generadas por GitHub Copilot

## 📋 Descripción

Herramienta transversal para contar automáticamente las líneas de código generadas por GitHub Copilot en proyectos de desarrollo de software (backend y frontend). El script detecta automáticamente el tipo de proyecto y analiza todos los archivos de código fuente según las reglas establecidas.

## ✨ Características

- **Detección Automática de Proyectos**: Identifica automáticamente si es un proyecto frontend (Angular, React, Vue, Next.js, etc.) o backend (Express, NestJS, .NET, Java, Python, etc.)
- **Análisis Multi-lenguaje**: Soporta TypeScript, JavaScript, C#, Java, Python, C++, PHP, Ruby, Go, Swift, Kotlin, Rust y Scala
- **Tres Tipos de Reglas**: 
  - Regla 7: Métodos completos generados
  - Regla 8: Fragmentos de código con inicio y fin
  - Regla 10: Refactorizaciones y optimizaciones
- **Reportes Detallados**: Genera reportes en formato texto o JSON con estadísticas completas
- **Ejecución Transversal**: Se puede ejecutar en cualquier proyecto sin modificaciones
- **Análisis multi-proyecto**: Procesa todas las rutas configuradas en `projects.txt` y genera un resumen consolidado
- **Conteo alineado con cloc**: Usa la suma de lenguajes configurada por repositorio y aplica un fallback local si `cloc` no está disponible
- **Reglas por repositorio**: Define extensiones y lenguajes incluidos en `src/config/repositoryRules.ts`

## 📦 Instalación

### Prerrequisitos
- Node.js (v14 o superior)
- npm o yarn
- `cloc` disponible en `PATH` para obtener los totales específicos por lenguaje (opcional; existe fallback local)

### Pasos de Instalación

```bash
# 1. Clonar el repositorio
git clone <repository-url>

# 2. Navegar al directorio de la herramienta
cd cross-project-script-tool

# 3. Instalar dependencias
npm install

# 4. Compilar el proyecto (opcional)
npm run build
```

El ejecutable de la CLI es `bin/cli.ts` y se ejecuta mediante `ts-node`; no es necesario instalar TypeScript globalmente.

## 🚀 Uso

### Opción 1: Usando npm run cli

```bash
# Analizar el proyecto actual
npm run cli

# Analizar un proyecto específico
npm run cli C:\ruta\al\proyecto

# Generar reporte en archivo de texto
npm run cli C:\ruta\al\proyecto -o reporte.txt

# Generar reporte en formato JSON
npm run cli C:\ruta\al\proyecto -o reporte.json -f json

# Analizar todos los proyectos de projects.txt
npm run cli -- --all

# Analizar todos y guardar un reporte JSON
npm run cli -- --all -o reporte.json -f json

# Mostrar información detallada de detección
npm run cli C:\ruta\al\proyecto -d
```

### Opción 2: Usando ts-node directamente

```bash
# Analizar el proyecto actual
ts-node bin/cli.ts

# Con parámetros
ts-node bin/cli.ts C:\ruta\al\proyecto -o reporte.txt
```

### Preparar repositorios

Antes de un análisis multi-proyecto, puedes cambiar los repositorios configurados a una rama y actualizarlos:

```bash
npm run prepare-repos -- -b main
npm run prepare-repos -- -b develop
npm run prepare-repos -- --help
```

El comando detecta cambios sin commitear, ejecuta `git pull origin <rama>` cuando es posible y devuelve error si algún repositorio requiere atención manual.

### Opción 4: Compilar y ejecutar

```bash
# Compilar
npm run build

# Ejecutar la CLI compilada
node dist/index.js
```

Para ver la sintaxis completa de la CLI:

```bash
npm run cli -- --help
```

## 📖 Reglas de Detección

La detección acepta variaciones de mayúsculas/minúsculas y acentos en los comentarios. Solo se analizan extensiones configuradas en `src/config/repositoryRules.ts`; las reglas de cada repositorio también determinan los lenguajes incluidos en el total de `cloc`.

El script detecta código generado por GitHub Copilot basándose en las siguientes reglas:

### Regla 7: Métodos Completos
```typescript
// Método generado por GitHub Copilot
public CalcularTotal(items: Item[]): number {
    return items.reduce((sum, item) => sum + item.precio, 0);
}
```
> ⚠️ **Nota**: Los métodos NO tienen comentario de cierre

### Regla 8: Fragmentos de Código
```typescript
// Inicio código generado por GitHub Copilot
const resultado = datos.filter(d => d.activo)
    .map(d => ({ id: d.id, nombre: d.nombre }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
// Fin código generado por GitHub Copilot
```

### Regla 10: Refactorizaciones y Optimizaciones
```typescript
// Inicio refactorización/optimización por GitHub Copilot
// Código refactorizado para mejor rendimiento
const memoizedValues = new Map();
function obtenerValor(key: string): any {
    if (!memoizedValues.has(key)) {
        memoizedValues.set(key, calcularValor(key));
    }
    return memoizedValues.get(key);
}
// Fin refactorización/optimización por GitHub Copilot
```

## 📊 Ejemplo de Reporte

```
═══════════════════════════════════════════════════════════════
       REPORTE DE LÍNEAS GENERADAS POR GITHUB COPILOT        
═══════════════════════════════════════════════════════════════

Proyecto: C:\Users\usuario\mi-proyecto
Tipo: backend

───────────────────────────────────────────────────────────────
RESUMEN GENERAL
───────────────────────────────────────────────────────────────
Total de archivos analizados: 45
Total de líneas de código: 3250
Líneas generadas por AI: 875
Porcentaje de código AI: 26.92%

───────────────────────────────────────────────────────────────
DESGLOSE POR TIPO
───────────────────────────────────────────────────────────────
Métodos completos (Regla 7): 12
Fragmentos de código (Regla 8): 8
Refactorizaciones (Regla 10): 3

───────────────────────────────────────────────────────────────
ARCHIVOS CON CÓDIGO AI
───────────────────────────────────────────────────────────────

📄 src/services/userService.ts
   Total: 150 líneas | AI: 45 líneas (30%)
   └─ Métodos: 2
   └─ Fragmentos: 1

📄 src/controllers/authController.ts
   Total: 200 líneas | AI: 80 líneas (40%)
   └─ Métodos: 3
   └─ Fragmentos: 2
   └─ Refactorizaciones: 1
```

## 🎯 Tipos de Proyectos Soportados

### Frontend
- Angular
- React
- Vue.js
- Next.js
- Nuxt.js
- Svelte
- Proyectos con Webpack

El detector selecciona frontend, backend o genérico según la estructura del proyecto. Para los repositorios con reglas específicas, las extensiones contadas pueden ser más restrictivas que esta lista general.

### Backend
- Node.js (Express, Koa, Fastify, Hapi)
- NestJS
- .NET (C#)
- Java (Maven, Gradle)
- Python (requirements.txt)
- Ruby (Gemfile)
- Go (go.mod)

## 🛠️ Estructura del Proyecto

```
cross-project-script-tool/
├── bin/
│   └── cli.ts              # CLI ejecutable
├── src/
│   ├── index.ts            # Punto de entrada principal
│   ├── config/
│   │   └── settings.ts     # Configuraciones
│   ├── core/
│   │   ├── aiCodeDetector.ts      # Detector de patrones AI
│   │   ├── aiLinesCounter.ts      # Contador de líneas
│   │   ├── pathResolver.ts        # Resolvedor de rutas
│   │   ├── projectDetector.ts     # Detector de tipo de proyecto
│   │   └── scriptRunner.ts        # Ejecutor de scripts
│   ├── scripts/
│   │   ├── backend.ts      # Script para proyectos backend
│   │   ├── common.ts       # Utilidades comunes
│   │   └── frontend.ts     # Script para proyectos frontend
│   └── types/
│       └── index.ts        # Definiciones de tipos
├── package.json
├── tsconfig.json
└── README.md
```

## 🔧 Opciones de Línea de Comandos

| Opción | Descripción | Ejemplo |
|--------|-------------|---------|
| `[ruta]` | Ruta del proyecto a analizar | `npm run cli C:\mi-proyecto` |
| `-o, --output` | Archivo de salida para el reporte | `-o reporte.txt` |
| `-f, --format` | Formato del reporte (`text`/`json`) | `-f json` |
| `-a, --all` | Analiza todos los proyectos de `projects.txt` | `--all` |
| `-d, --debug` | Muestra información detallada de detección | `-d` |
| `-h, --help` | Muestra ayuda | `-h` |

## 💡 Ejemplos de Uso

### Analizar proyecto actual y ver resultado en consola
```bash
npm run cli
```

### Analizar proyecto en otra ubicación
```bash
npm run cli "C:\Users\usuario\Documents\mi-proyecto-backend"
```

### Generar reporte de texto
```bash
npm run cli "C:\proyectos\app-frontend" -o reporte-frontend.txt
```

### Generar reporte JSON para análisis posterior
```bash
npm run cli "C:\proyectos\api-backend" -o estadisticas.json -f json
```

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 👤 Autor

Tu Nombre - [@yourusername](https://github.com/yourusername)

## 🙏 Agradecimientos

- GitHub Copilot por la asistencia en el desarrollo
- La comunidad de código abierto

---

**Nota**: Esta herramienta está diseñada para ser completamente transversal y funcionar en cualquier proyecto de desarrollo de software sin necesidad de configuración adicional.
