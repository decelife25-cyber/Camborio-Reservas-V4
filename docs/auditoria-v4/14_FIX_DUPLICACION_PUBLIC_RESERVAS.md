# 14. Corrección obligatoria en `public-reservas` (acción `email`)

## Contexto

`public-reservas` es una Edge Function de Supabase que **no está versionada en este
repositorio** (no existe ningún archivo fuente suyo en el árbol de git). Su código
solo puede inspeccionarse y modificarse directamente en el panel de Supabase.

Al verificar el código **desplegado** de `public-reservas` se detectó que su acción
`email` duplica trabajo que `send-camborio-email` ya realiza correctamente:

```
public-reservas (action=email)              send-camborio-email
------------------------------              --------------------
1. registerEmailNotification(... 'PENDIENTE')  1. Notificaciones PENDIENTE
2. requestEmail(...) -> send-camborio-email    2. Gmail
3. registerEmailNotification(... 'ENVIADA')    3. Notificaciones ENVIADA / ERROR
4. Log ENVIAR_EMAIL                            4. Log (solo si éxito)
```

Resultado: cada envío de email genera **dos filas en `Notificaciones`** (una
"falsa" PENDIENTE/ENVIADA desde `public-reservas` y otra real desde
`send-camborio-email`) y **dos filas en `Log`**.

## Qué NO cambia

- `send-camborio-email` (`supabase/functions/send-camborio-email/index.ts`) ya es
  correcto: registra `PENDIENTE` antes de llamar a Gmail y `ENVIADA`/`ERROR` +
  `Log` después. **No requiere ningún cambio adicional** para esta corrección.
- El contrato HTTP entre `public-reservas` y `send-camborio-email` no cambia:
  request `{ telefono, codigo, email?, publicUrl? }`, response
  `{ ok: true, sent: true, messageId }` o `{ ok: false, error }`.
- La respuesta que `public-reservas` devuelve a la PWA para `action=email` no
  cambia de forma (debe seguir devolviendo éxito/error exactamente igual que
  hasta ahora, para que `public-functional.js` siga funcionando sin cambios).

## Qué debe cambiar en `public-reservas` (a aplicar manualmente en Supabase)

En el manejador de la acción `email` de `public-reservas`, eliminar únicamente
las llamadas de registro duplicado, dejando intacta la llamada real a
`send-camborio-email` (`requestEmail(...)`) y la propagación de su resultado.

**Antes (código desplegado actualmente, duplica registro):**

```js
case 'email': {
  const reserva = await findReservation(telefono, codigo);
  const destino = email || reserva.Email;

  await registerEmailNotification(reserva.ReservaID, destino, 'PENDIENTE'); // ❌ eliminar
  try {
    const result = await requestEmail({ telefono, codigo, email, publicUrl });
    await registerEmailNotification(reserva.ReservaID, destino, 'ENVIADA'); // ❌ eliminar
    await insertLog(reserva.ReservaID, 'ENVIAR_EMAIL', destino);            // ❌ eliminar
    return jsonOk({ sent: true, messageId: result.messageId });
  } catch (err) {
    await registerEmailNotification(reserva.ReservaID, destino, 'ERROR');  // ❌ eliminar
    return jsonError(err.message);
  }
}
```

**Después (corregido, delega en `send-camborio-email` como único responsable):**

```js
case 'email': {
  const reserva = await findReservation(telefono, codigo);
  const destino = email || reserva.Email;

  // public-reservas solo localiza la reserva, resuelve el destinatario y
  // delega el envío. Notificaciones y Log quedan EXCLUSIVAMENTE a cargo de
  // send-camborio-email (que ya registra PENDIENTE -> ENVIADA/ERROR y el Log).
  try {
    const result = await requestEmail({ telefono, codigo, email, publicUrl });
    return jsonOk({ sent: true, messageId: result.messageId });
  } catch (err) {
    return jsonError(err.message);
  }
}
```

### Resumen del cambio

- ❌ Eliminar la llamada `registerEmailNotification(..., 'PENDIENTE')` previa a
  `requestEmail(...)`.
- ❌ Eliminar la llamada `registerEmailNotification(..., 'ENVIADA')` tras el
  éxito de `requestEmail(...)`.
- ❌ Eliminar la llamada `registerEmailNotification(..., 'ERROR')` en el catch,
  si existe (también sería duplicada, ya que `send-camborio-email` ya marca
  `ERROR` en `Notificaciones` cuando el envío falla).
- ❌ Eliminar el `insertLog(..., 'ENVIAR_EMAIL', ...)` posterior al éxito.
- ✅ Mantener `requestEmail(...)` sin cambios: sigue llamando a
  `send-camborio-email` con `{ telefono, codigo, email, publicUrl }`.
- ✅ Mantener exactamente la misma forma de respuesta hacia la PWA
  (`{ ok: true, sent: true, messageId }` / `{ ok: false, error }`), para no
  romper `public-functional.js`.
- ✅ No tocar ninguna otra acción de `public-reservas` (`create`, `update`,
  `cancel`, `lookup`, `availability`, etc.).

## Dónde debe aplicarse

Este cambio debe aplicarse manualmente en el código de la Edge Function
`public-reservas` desde el panel de Supabase (Edge Functions), ya que su código
fuente no forma parte de este repositorio y no puede ser modificado ni
desplegado desde aquí.

## Por qué no se aplica desde este PR

- No existe ningún archivo de `public-reservas` en el árbol de git de este
  repositorio para editar.
- El agente no tiene capacidad ni autorización para desplegar Edge Functions en
  Supabase.
- Aplicar el cambio requiere acceso directo al editor de Edge Functions de
  Supabase o a su repositorio fuente real (si existe fuera de este repo).
