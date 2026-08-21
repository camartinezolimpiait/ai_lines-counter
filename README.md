# Contador de líneas generadas por GitHub Copilot

Herramienta TypeScript para medir líneas de código generadas por Copilot en uno o varios proyectos. El contador detecta las reglas 7, 8 y 10, identifica el tipo de proyecto y aplica extensiones y lenguajes de `cloc` según el repositorio.

## Instalación

```bash
git clone https://github.com/ogonzalez-Dev/ai_lines-counter.git
cd ai_lines-counter/cross-project-script-tool
npm install
npm run build
```

Para obtener totales alineados con las reglas de cada repositorio, instala `cloc` y asegúrate de que esté disponible en `PATH`. Si no está disponible, se usa el conteo local como respaldo.

## Configurar proyectos

Edita `cross-project-script-tool/projects.txt`. Incluye una ruta local por línea; las líneas vacías y las que empiezan por `#` se ignoran:
```
D:/tu_ruta/MiLicencia/backend/ApiBackMiLicencia
D:/tu_ruta/ApiBackPortalAdm/ApiBackPortalAdminCentro
D:/tu_ruta/MiLicencia/backend/ApiBackIntegrador
D:/tu_ruta/MiLicencia/backend/ApiFrontMiLicencia
D:/tu_ruta/MiLicencia/frontend/FrontEndCentro
D:/tu_ruta/MiLicencia/frontend/portal_adm/PortalAdminCentro
```

## Uso

Ejecuta los comandos desde `cross-project-script-tool`.

### Preparar repositorios

```bash
npm run prepare-repos -- -b main
```

Cambia los repositorios configurados a la rama indicada y ejecuta `git pull origin <rama>`. Los repositorios con cambios sin commitear requieren revisión manual.

### Analizar todos los proyectos

```bash
npm run cli -- --all
npm run cli -- --all -o reporte.json -f json
npm run cli -- --all -d
```

El resumen muestra líneas de código, líneas Copilot, porcentaje y proyectos procesados.

### Analizar un proyecto

```bash
npm run cli -- "C:/ruta/de/tu/proyecto"
npm run cli -- "C:/ruta/de/tu/proyecto" -o reporte.txt
npm run cli -- "C:/ruta/de/tu/proyecto" -o reporte.json -f json
```

Consulta todas las opciones con:

```bash
npm run cli -- --help
npm run prepare-repos -- --help
```

**Ejemplo de formato de salida (los valores dependen de las rutas y la versión analizadas):**
```bash
╔══════════════════════════════════════════════════════════════╗
║      PREPARACIÓN DE REPOSITORIOS - CHECKOUT + PULL           ║
╚══════════════════════════════════════════════════════════════╝
📂 Repositorios a verificar: 7

[1/7] Procesando: ApiBackMiLicencia
    Ruta: D:/Olimpia_dev_projects/MiLicencia/backend/ApiBackMiLicencia
    ✅ Cambiado de 'Feature/169669-pass-Otp-229785-ogonzalez' → 'main' y pull ejecutado

[2/7] Procesando: ApiBackIntegrador
    Ruta: D:/Olimpia_dev_projects/MiLicencia/backend/ApiBackIntegrador
    ✅ Ya estaba en 'main' y se hizo pull

[3/7] Procesando: ApiFrontMiLicencia
    Ruta: D:/Olimpia_dev_projects/MiLicencia/backend/ApiFrontMiLicencia
    ❌ Hay cambios sin commitear. Por favor, haz commit o stash de los cambios antes de cambiar de rama y hacer pull.
    📝 Rama actual: main
...
```

----------------------------------------------------

El análisis multi-proyecto se configura en `projects.txt` y genera una tabla consolidada:

```bash
╔═══════════════════════════════════════════════════════════════╗
║                       LINE COUNTER                            ║
║                   RESUMEN DE ANÁLISIS                         ║
╚═══════════════════════════════════════════════════════════════╝
┌────────────────────────────────────────────────────────────────────┐
│ Repositorio                   │ Líneas de Código  │ Líneas Copilot │
├────────────────────────────────────────────────────────────────────┤
│ ApiBackMiLicencia             │             157949│            1539│
│ ApiBackPortalAdminCentro      │             354837│            2806│
│ MiLicencia_ApiBackIntegrador  │              64257│            4787│
│ ApiFrontMiLicencia            │              13332│            1221│
│ MiLicencia_FrontEndCentro     │              15997│               0│
│ MiLicencia_PortalAdminCentro  │              40796│            3508│
│ MiLicencia_FrontEndCiudadano  │              60696│            2499│
├────────────────────────────────────────────────────────────────────┤
│ TOTAL                         │             707864│           16360│
└────────────────────────────────────────────────────────────────────┘

```

También se puede analizar un proyecto individual con `npm run cli -- C:/ruta/de/tu/proyecto`.

## Documentación adicional

- [cross-project-script-tool/README_ES.md](cross-project-script-tool/README_ES.md): referencia detallada en español.
- [cross-project-script-tool/USAGE.md](cross-project-script-tool/USAGE.md): casos de uso y flujo multi-proyecto.
- [cross-project-script-tool/RULES.md](cross-project-script-tool/RULES.md): formato de las reglas 7, 8 y 10.
