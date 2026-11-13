# EcoVision AI — MVP

Aplicación web educativa que clasifica residuos con la cámara (o una foto) en 4 categorías
y muestra el recipiente de destino. El modelo se entrenó en Google Teachable Machine y se
ejecuta en el navegador con TensorFlow.js. Las imágenes no se envían ni se guardan.

Categorías del modelo (estándar, 224×224 a color): Plástico, Vidrio, Cartón o papel, No reciclable.

## Demo en línea

GitHub Pages: https://oscartdev.github.io/EcoVisionAI/

> La cámara requiere HTTPS (GitHub Pages lo cumple) y el permiso del navegador.

## Presentación del proyecto

`presentacion.html` contiene la presentación completa (19 diapositivas) en un solo archivo.
Se abre desde el botón **«Diapositivas»** del MVP, o directamente en
<https://oscartdev.github.io/EcoVisionAI/presentacion.html>.

## Ejecutar en local

La cámara y el modelo **no** funcionan con doble clic en `index.html` (por `file://`). Usa un servidor local:

- Con Python, dentro de la carpeta: `python -m http.server 8000` y abre <http://localhost:8000>
- O con VS Code: clic derecho en `index.html` > Open with Live Server.

Permite el acceso a la cámara cuando el navegador lo pida.

## Estructura

| Ruta | Descripción |
| --- | --- |
| `index.html`, `styles.css`, `app.js` | Interfaz y lógica |
| `presentacion.html` | Presentación del proyecto (19 diapositivas, archivo único) |
| `modelo/` | `model.json`, `metadata.json`, `weights.bin` (exportados de Teachable Machine) |
| `libs/` | TensorFlow.js 1.7.4 y Teachable Machine Image 0.8.5 (locales, no dependen de internet) |

## Cómo funciona

Cámara o foto → JavaScript → modelo TF.js → probabilidad por clase → categoría y recipiente.
Con la cámara activa se analiza un cuadro cada ~300 ms. Si la confianza es menor a 60 % la app avisa.

## Limitaciones

- Depende de las fotos de entrenamiento: fondos, luz y objetos distintos pueden fallar.
- Una confianza alta no garantiza que el resultado sea correcto.
- No hay clase para metal ni orgánicos.
- La recomendación es educativa; verifica la normativa local (Resolución 2184 de 2019).
