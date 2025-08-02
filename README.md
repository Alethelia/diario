# Diario Personal - TDAH Friendly

Una aplicación web minimalista tipo chat para llevar un diario personal, diseñada especialmente para personas con TDAH.

## Características

- **Interfaz tipo chat**: Similar a ChatGPT, familiar y fácil de usar
- **Análisis automático**: Usa GPT-4o para generar títulos, resúmenes y extraer emociones
- **Organización visual**: Tags de colores para emociones y temas
- **Historial searchable**: Encuentra entradas por emociones, temas o contenido
- **Almacenamiento local**: Todos los datos se guardan en tu navegador
- **Diseño minimalista**: Sin distracciones, enfoque en la escritura

## Cómo usar

### 1. Configuración inicial

1. Abre `index.html` en tu navegador
2. Al cargar por primera vez, se te pedirá una API Key de OpenAI
3. Puedes obtener una en: https://platform.openai.com/api-keys
4. La API Key se guarda localmente en tu navegador

### 2. Escribir en el diario

1. Escribe libremente en el área de texto como si fuera un chat
2. Presiona Enter para enviar cada mensaje
3. Cada entrada se guarda automáticamente
4. Usa el botón "Analizar" para generar resumen y tags

### 3. Navegación

- **Pestaña "Hoy"**: Tu entrada actual del día
- **Pestaña "Historial"**: Todas las entradas anteriores
- **Buscador**: Encuentra entradas por palabra clave

### 4. Funciones del análisis

El análisis automático extrae:
- **Título descriptivo** del día
- **Resumen** de lo más importante
- **Emociones** principales detectadas
- **Temas y actividades** relevantes

## Estructura de archivos

```
diario/
├── index.html      # Página principal
├── styles.css      # Estilos CSS
├── script.js       # Lógica de la aplicación
└── README.md       # Este archivo
```

## Características técnicas

- **Sin frameworks**: Solo HTML, CSS y JavaScript vanilla
- **Responsive**: Funciona en móvil y desktop
- **Offline-first**: Funciona sin conexión (excepto análisis IA)
- **Privacidad**: Datos guardados solo en tu navegador
- **API OpenAI**: Usa GPT-4o para análisis inteligente

## Colores de emociones

- 🟡 **Amarillo**: Feliz, alegre, contento
- 🔵 **Azul**: Triste, melancólico
- 🟣 **Rosa**: Emocionado, entusiasmado
- 🔴 **Rojo**: Ansioso, nervioso, estresado
- 🟢 **Verde**: Tranquilo, relajado
- 🟣 **Morado**: Productivo, enfocado

## Consejos para personas con TDAH

1. **Escribe sin pensar**: No te preocupes por la estructura
2. **Mensajes cortos**: Cada pensamiento puede ser un mensaje separado
3. **Usa el análisis**: Te ayuda a identificar patrones
4. **Revisa el historial**: Útil para ver progreso y tendencias
5. **Búsqueda por emociones**: Encuentra días similares fácilmente

## Instalación local

1. Descarga todos los archivos
2. Abre `index.html` en cualquier navegador moderno
3. No necesitas servidor web, funciona directamente desde el archivo

## Privacidad y seguridad

- **Datos locales**: Todo se guarda en localStorage del navegador
- **API Key**: Se almacena localmente, nunca se comparte
- **Sin tracking**: No hay analytics ni cookies de terceros
- **Código abierto**: Puedes revisar todo el código

## Troubleshooting

### La API Key no funciona
- Verifica que sea válida en OpenAI
- Asegúrate de tener créditos disponibles
- Revisa la consola del navegador para errores

### Los datos se perdieron
- Los datos se guardan en localStorage
- Si limpias el navegador se pueden perder
- Considera hacer backup exportando los datos

### El análisis no funciona
- Verifica conexión a internet
- Comprueba que la API Key sea correcta
- El análisis requiere al menos algunos mensajes escritos

## Desarrollo futuro

Posibles mejoras:
- Export/import de datos
- Más opciones de análisis
- Modo oscuro
- Recordatorios
- Gráficos de estado de ánimo
- Integración con calendarios

## Licencia

Este proyecto es de código abierto. Siéntete libre de modificarlo y adaptarlo a tus necesidades.
