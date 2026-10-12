# ProgressionFinder como PWA

La versión de producción incluye manifiesto, íconos PNG y un service worker.
La ruta de instalación y el alcance son `/progression-finder/`, compatibles con
la configuración actual de GitHub Pages.

## Verificación local

```sh
npm run build
npm test
npm run test:pwa
npm run preview
```

Abrir la URL local que imprime Vite, con la ruta `/progression-finder/`.
El modo PWA se activa en el build de producción; `npm run dev` no instala el
service worker. Para publicar se necesita HTTPS (localhost sirve para pruebas).

## Instalación y modo offline

Cuando el navegador ofrece instalación, la app muestra el botón **Instalar app**.
También puede usarse la opción de instalación del navegador. En iPhone o iPad,
usar Safari y **Compartir → Agregar a inicio**.

En la primera visita con conexión se guardan la interfaz, los íconos y las muestras
locales de todos los instrumentos. Esperar el aviso de que la app está lista para
usar sin conexión antes de desconectarse. Las fuentes de Google no forman parte
de la caché offline; el diseño utiliza las fuentes de respaldo disponibles.

Al detectar una nueva versión, aparece **Actualizar ahora**. La app no recarga
automáticamente mientras el usuario trabaja. Aplicar la actualización recarga
la página, por lo que conviene terminar la reproducción y guardar cualquier
entrada que no se haya persistido antes de pulsar el botón.

Para verificar manualmente: abrir la versión de producción con conexión, esperar
el aviso offline, desconectar la red, recargar y probar el analizador y cada
instrumento. La instalación y el audio deben comprobarse también en los
dispositivos de destino. Si se borran los datos del sitio, será necesario volver
a visitar la app con conexión.

`npm run test:pwa` comprueba los archivos generados en `dist`; debe ejecutarse
después de `npm run build`. No reemplaza una prueba real de instalación y modo
offline en el navegador.

Los íconos se generan de forma determinista en `prebuild` mediante
`scripts/generate-pwa-icons.mjs`, sin dependencias de procesamiento de imágenes.
