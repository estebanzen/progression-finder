# Analizador y recomendaciones contextuales

La progresión y su selección se guardan en `progressionFinder_progression`.
`useProgression` deriva el análisis, los acordes y la escala desde ese estado.
No sincroniza copias mediante efectos. El modo manual de escalas sigue disponible
cuando la progresión está vacía o es inválida.

Una lectura de confianza media o alta controla automáticamente la escala. Las
lecturas de confianza baja conservan la escala manual hasta elegir una tonalidad.
Las opciones se ordenan por puntuación, con desempate estable por altura y modo.
La elección se conserva al insertar acordes; una edición o reemplazo explícito
de la progresión vuelve a evaluar la tonalidad sin esa elección.

El spelling usa las letras de cada grado y las alteraciones de la armadura:
Fa mayor es `F G A Bb C D E`. El parser conserva las notas de los acordes
cromáticos y sus símbolos; `D7` contiene `D F# A C`. Se admiten dobles
alteraciones para poder escribir correctamente acordes como `G#7` o tonalidades
con sensible elevada. Para tonalidades enarmónicas se prefieren armaduras
convencionales; la escritura del input resuelve los empates F#/Gb mayor y
Eb/D# menor.

## Recomendaciones

`getContextualChordSuggestions` evalúa cada candidato en las posiciones de
inserción de la secuencia, incluyendo el enlace del último acorde al primero.
Prioriza notas diatónicas, resolución inmediata, cercanía entre clases de altura
y expansión después de la tónica. Penaliza notas cromáticas, ruptura de cadencias
y dominantes o sensibles cuyo destino todavía no aparece en esa posición.

La distancia de voces es una heurística simétrica de proximidad entre clases de
altura: no establece una digitación, inversión o distribución exacta de voces.
La puntuación de 0 a 100 no es una probabilidad. Los niveles son:

- Muy compatible: 82 o más.
- Compatible: de 60 a 81.
- Experimental: menos de 60.

Se excluyen acordes ya presentes y enriquecimientos de una tríada que solo
añadirían la séptima; estos últimos sí pueden aparecer en las variantes completas,
donde el cambio se explica. Se permite un cambio de calidad funcional como
`Fmaj7` a `F7`, porque puede preparar `Bbmaj7`.

El primer grupo contiene seis recomendaciones. **Ver todas** incluye opciones
menos convencionales y acordes con resolución pendiente. Cada tarjeta ofrece
las ubicaciones cercanas en puntuación, muestra el resultado exacto y separa
las acciones:

- Seleccionar: vista previa en guitarra y piano, sin cambiar la progresión ni la escala.
- Escuchar: solo audio, sin cambiar la selección.
- Agregar acá: inserta en el índice elegido, reanaliza y selecciona el nuevo acorde.
- Deshacer inserción: restaura la progresión, selección y elección tonal anteriores.
- Usar progresión: reemplaza explícitamente la secuencia por una variante.

El historial de inserciones vive en la sesión; no se conserva al recargar. Una
edición directa o un reemplazo explícito limpia ese historial.

## Validación

```sh
npm test
npm run test:e2e
npm run lint
npm run build
npm run test:pwa
```

Las pruebas E2E usan Chrome instalado y levantan Vite en el puerto 4179. Cubren
selección cromática, vista previa de sugerencias, inserción circular, deshacer,
persistencia, cambios explícitos de progresión, teclado y pantalla móvil.
El análisis no modela modulaciones, melodía, ritmo, inversiones ni bajo cifrado.
