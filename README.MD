# QuickSurvey — Encuesta interactiva

> **Encuesta interactiva con HTML5, CSS3 y JavaScript puro.**
> Sin librerías externas, sin backend, sin dependencias y sin `innerHTML`.

---

## 1. ¿Qué hace?

QuickSurvey muestra una encuesta de **4 preguntas** que se construye desde JavaScript:

| # | Pregunta | Tipo de control | Obligatoria |
|---|---|---|---|
| 1 | Satisfacción con la experiencia académica | Escala numérica 1–5 (radio) | Sí (+ motivo si notas 1–2) |
| 2 | Modalidad preferida | Opción única (radio) | Sí |
| 3 | Recursos de estudio | Opción múltiple (checkbox) | Sí |
| 4 | Mejora sugerida | Texto libre (textarea) | No |

**Pregunta condicional.** Si en la pregunta 1 se elige **1 o 2**, aparece debajo un campo de texto `#motivo` con la pregunta *"¿Por qué no estás satisfecho?"*. Se inserta en el DOM al momento (`buildQuestion()`), pasa a ser **obligatorio** para poder avanzar, y **desaparece** si la nota sube a 3, 4 o 5. La nota se guarda como número, de modo que el umbral se decide con una comparación, no con lógica duplicada en la vista.

Al terminar muestra un **resumen** de las respuestas y calcula el **promedio real** de la escala de satisfacción.

---

## 2. Cómo ejecutarlo

Abre `quicksurvey/index.html` con doble clic. No necesita servidor, internet ni instalación.

---

## 3. Estructura

```
academicos/
├── index.html   → estructura y contenedores (IDs fijos)
├── style.css    → variables CSS, diseño y responsive
└── script.js    → datos, estado, construcción DOM y lógica
└── README.MD
```

### IDs que usa `script.js`

| Grupo | Selectores |
|---|---|
| Secciones | `#surveySection`, `#summarySection` |
| Contenedores | `#questionContainer`, `#validationMessage` |
| Progreso | `#questionCounter`, `#progressPercent`, `#progressBar` |
| Botones | `#btnPrev`, `#btnNext`, `#btnFinish`, `#btnReset` |
| Resumen | `#summaryContainer`, `#statsContainer` |

---

## 4. El estado

```javascript
const appState = { currentIndex: 0, answers: {} };
```

- `currentIndex` — el paso actual (0 a 3).
- `answers` — mapa `{ idPregunta: respuesta }`. Guarda un **número** en la escala, un **texto** en radio/textarea y un **arreglo** en checkbox. El motivo condicional se guarda bajo su propia clave `motivo`.

`appState` es la única fuente de verdad. La interfaz se reconstruye en cada paso y luego `restoreAnswer()` repinta lo guardado: ese par **construir + rehidratar** es lo que hace que al retroceder las respuestas sigan ahí.

### El progreso cuenta respuestas completadas

`#progressPercent` se calcula con `appState.currentIndex / questions.length`, es decir, **preguntas ya respondidas**:

| Pantalla | Progreso |
|---|---|
| Pregunta 1 (recién cargada) | 0 % |
| Pregunta 2 | 25 % |
| Pregunta 3 | 50 % |
| Pregunta 4 | 75 % |
| Tras *Reiniciar* | 0 % |

No se usa `currentIndex + 1` a propósito: hacerlo mostraría 25 % en la primera pregunta, cuando aún no se ha contestado nada. Al llegar a la última el avance es 75 % porque esa respuesta todavía está pendiente.

---

## 5. Seguridad: por qué no hay `innerHTML`

`innerHTML` **interpreta** el texto como código HTML. Si alguien escribe en el comentario

```
<img src=x onerror="alert('XSS')">
```

y eso se inserta con `innerHTML`, el navegador no lo muestra como texto: crea un `<img>` y **ejecuta** el manejador `onerror`. Eso es un ataque XSS (robo de sesión, envío de datos a un atacante…).

Este proyecto lo evita por diseño:

| API | Por qué es segura |
|---|---|
| `textContent` | No interpreta HTML. Escribe un nodo de texto y escapa `<`, `>`, `&`, `"`. El payload se muestra literal y **no se ejecuta**. |
| `createElement()` + `appendChild()` | Construyen el árbol nodo a nodo. Cada nodo nace con su tipo definido por el código; nunca hay una cadena que el navegador interprete. |
| `setAttribute()` | Fija atributos, no marcado. No hay fase de parseo. |
| `remove()` / `classList` | Solo borran o alternan clases. |

**Única puerta de entrada de datos hacia la pantalla: `textContent`.**

Además: no hay atributos `onclick` en el HTML (todo va por `addEventListener`) y los eventos usan **delegación** sobre `#questionContainer`, así que basta un listener aunque los controles se creen y se destruyan en cada pregunta.

---

## 6. Casos de prueba

| # | Acción | Resultado |
|---|---|---|
| 1 | Pulsar *Siguiente* sin responder una obligatoria | No avanza; `#validationMessage` se hace visible y la tarjeta recibe `.is-invalid` |
| 1b | Poner nota 1 o 2 y pulsar *Siguiente* sin escribir el motivo | Aparece el aviso *"Indica el motivo de tu baja satisfacción…"* y sigue en la pregunta 1 |
| 2 | Responder y avanzar | Aparece la siguiente pregunta; se actualizan `#questionCounter`, `#progressPercent` y el ancho de `#progressBar` (0 % → 25 % → 50 % → 75 %) |
| 3 | Pulsar *Anterior* | Las respuestas previas siguen marcadas: el número de la escala, el radio, las casillas del checkbox, el texto y el `#motivo` si sigue vigente |
| 3b | Volver a la pregunta 1 y subir la nota a 3, 4 o 5 | El campo `#motivo` se retira del DOM y su dato se borra de `appState` |
| 4 | Pulsar *Finalizar* con todo respondido | Se oculta `#surveySection`, se muestra `#summarySection`, se listan las respuestas y se calcula el promedio de la escala |
| 5 | Pulsar *Reiniciar encuesta* | `appState` vuelve a `{ currentIndex: 0, answers: {} }`, el progreso se repone a 0 % y se muestra la pregunta 1 |

**Detalles:**

- La pregunta 4 es opcional. Si se deja vacía, el resumen muestra *"Sin respuesta"* y la completitud baja a 3 de 4.
- El promedio se calcula con `.reduce()` sobre los valores guardados, así que refleja las respuestas reales, no un número fijo.
- El campo `#motivo` se reconstruye y se rehidrata como cualquier otro control: por eso sobrevive a un *Anterior* → *Siguiente* sin trabajo extra.

---

## 7. Accesibilidad

- `<fieldset>` + `<legend>` para agrupar opciones y `<label for>` para vincular cada control.
- `#progressBar` con `role="progressbar"`, `aria-valuemin/max/now`: el avance no depende solo del color.
- `#validationMessage` con `role="alert"` y `aria-live="assertive"`, para que se anuncie al aparecer.
- Botones `type="button"` (no envían el formulario) y foco visible con `:focus-visible`.
- Se respeta `prefers-reduced-motion`.

---

## 8. Guía para la exposición (8 minutos)

1. **Abrir `index.html`** → encabezado y barra de progreso. (0:00)
2. **Pregunta 1** → mostrar que el HTML está vacío: la tarjeta se arma con `buildQuestion()` a partir del arreglo `questions`. Explicar el bucle `forEach` que crea un `<input>` y su `<label>`. (1:00)
3. **Seguridad** → enseñar el comentario de `el()`: `textContent` no interpreta HTML. Escribir `<img onerror=...>` en el comentario de la pregunta 4 y mostrar que aparece como texto plano. (2:00)
4. **Caso 1** → *Siguiente* sin responder: `.is-invalid` + `#validationMessage`. (2:45)
5. **Pregunta condicional** → marcar un 1: el `#motivo` aparece en el DOM y bloquea el avance; subir a 5 y ver cómo desaparece. Aquí está el `notaBaja()`. (3:00)
6. **Estado** → abrir `script.js` en `appState` y en `questions`. (3:30)
7. **Casos 2 y 3** → avanzar hasta la 3, marcar dos casillas, retroceder y mostrar que siguen marcadas: `saveAnswer()` + `restoreAnswer()`. (4:15)
8. **Pregunta 4** → texto opcional, `maxlength="200"`. (5:00)
9. **Caso 4** → *Finalizar*: resumen creado con `createElement()` y el promedio con `.reduce()`. Señalar que si la 4 quedó vacía, la completitud es 3 de 4. (5:45)
10. **Caso 5** → *Reiniciar*: limpiar `appState`, vaciar contenedores con `remove()` y volver al paso 0 con la barra en 0 %. (6:30)
11. **Cierre** → el CSS usa variables para el tema y Flexbox/Grid para el diseño; en móvil los botones se apilan. (7:30)
