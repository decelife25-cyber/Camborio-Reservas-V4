# CAMBORIO RESERVAS V4 — CORREO: ESTADO, DIAGNÓSTICO Y PLAN

**Fecha de este documento:** 10-09-2026  
**Repositorio:** `decelife25-cyber/Camborio-Reservas-V4`  
**Backend:** Supabase  
**Objetivo:** dejar documentado exactamente qué está pasando con el correo y qué hay que hacer para terminarlo, para poder continuar el trabajo aunque esta conversación se cierre.

---

## 1. OBJETIVO DEL SISTEMA DE CORREO

El flujo previsto para V4 es:

`PWA pública → Supabase Edge Function public-reservas → send-camborio-email → Google OAuth/Gmail API → correo del cliente`

La PWA **no debe hablar directamente con Gmail**.

La función `send-camborio-email` es la encargada del envío y utiliza estas credenciales almacenadas como secretos de Supabase:

- `GMAIL_CLIENT_ID`
- `GMAIL_CLIENT_SECRET`
- `GMAIL_REFRESH_TOKEN`
- `GMAIL_FROM`

El código actual de `send-camborio-email` lee exactamente esas variables y solicita un access token a `https://oauth2.googleapis.com/token` usando el refresh token. Después llama a `https://gmail.googleapis.com/gmail/v1/users/me/messages/send` para enviar el mensaje. El remitente por defecto es `Camborio.reserva@gmail.com`.  

Fuente: `supabase/functions/send-camborio-email/index.ts`.

---

## 2. QUÉ FUNCIONABA EN V2

V2 no utilizaba esta arquitectura.

En V2 el envío se hacía directamente desde Google Apps Script mediante `MailApp.sendEmail(...)`.

El archivo `07_Notificaciones.gs` contiene la función `CR_Email_enviarConfirmacionReserva()` y termina realizando:

`MailApp.sendEmail({ to, subject, htmlBody, name: 'Taberna Camborio' })`

También existe en el manifiesto de Apps Script el permiso:

`https://www.googleapis.com/auth/script.send_mail`

El Web App de V2 se ejecutaba como el usuario que lo desplegaba y permitía acceso anónimo.

Fuentes:
- `07_Notificaciones.gs`
- `appsscript.json`

### Conclusión importante

**No se debe copiar literalmente el mecanismo `MailApp` de V2 dentro de V4**, porque V4 ya no utiliza Apps Script como backend oficial. Lo que sí se debe conservar/adaptar es el comportamiento funcional y, sobre todo, evitar inventar otra arquitectura si la existente ya resuelve el problema.

---

## 3. QUÉ ESTÁ PASANDO AHORA EN V4

El envío de reserva ya está implementado en V4.

El problema diagnosticado no es el HTML del correo, la PWA ni el destinatario.

Google devolvió este error al intentar renovar el token:

`GMAIL_OAUTH_400: invalid_grant — Token has been expired or revoked.`

Esto identifica el problema como un **refresh token de Google inválido, caducado o revocado**.

Por tanto:

**NO hay que rehacer la función de envío.**

**NO hay que cambiar el HTML del correo para solucionar este error.**

**NO hay que añadir parches al flujo PWA.**

La primera reparación real es sustituir las credenciales OAuth almacenadas en Supabase por unas válidas.

---

## 4. CREDENCIALES NUEVAS YA OBTENIDAS

Durante la investigación ya se hizo lo siguiente en Google Cloud:

1. Se creó un nuevo cliente OAuth web llamado:
   `Camborio Reservas V4 Gmail 2`
2. Se utilizó como redirect URI:
   `https://developers.google.com/oauthplayground`
3. Se configuró OAuth Playground para utilizar las credenciales propias.
4. Se autorizó el alcance:
   `https://www.googleapis.com/auth/gmail.send`
5. Se completó el consentimiento con la cuenta:
   `camborio.reservas@gmail.com`.
6. OAuth Playground devolvió correctamente un nuevo `refresh_token` y un `access_token`.
7. El usuario ya copió el nuevo `refresh_token` y lo conserva.
8. El JSON del nuevo cliente OAuth fue descargado y contiene `client_id` y `client_secret`.

**Los valores secretos NO deben escribirse en GitHub ni en este documento.**

---

## 5. PRÓXIMA REPARACIÓN TÉCNICA DIRECTA

En Supabase, proyecto `ReservasV4`, hay que actualizar únicamente estos tres secretos con los valores del nuevo cliente OAuth y del nuevo consentimiento:

1. `GMAIL_CLIENT_ID` → nuevo `client_id` del cliente `Camborio Reservas V4 Gmail 2`.
2. `GMAIL_CLIENT_SECRET` → nuevo `client_secret` del mismo cliente.
3. `GMAIL_REFRESH_TOKEN` → nuevo `refresh_token` obtenido mediante OAuth Playground.

**NO cambiar:**

- `GMAIL_FROM`
- el código de `send-camborio-email`
- el HTML del correo
- la PWA
- la base de datos
- el flujo de reservas

Supabase indica que los secretos de producción se gestionan desde Edge Function Secrets y que, una vez guardados, están disponibles inmediatamente para las funciones; no es necesario volver a desplegar la función solamente por cambiar secretos.

---

## 6. PROBLEMA DE FONDO: GOOGLE ESTÁ EN "PRUEBA"

El nuevo refresh token se ha generado mientras el proyecto OAuth está en estado **Testing/Prueba**.

La documentación actual de Google indica que los refresh tokens emitidos mientras el proyecto está en Testing tienen una vida limitada y normalmente caducan a los **7 días**.

Cuando una aplicación está en producción, Google indica que los refresh tokens normalmente no caducan salvo revocación o largos periodos de inactividad.

Por tanto, **actualizar el refresh token ahora arregla el error actual, pero no es una solución definitiva mientras el OAuth permanezca en Testing**.

---

## 7. QUÉ HAY QUE RESOLVER PARA DEJARLO DEFINITIVO

Hay dos cuestiones distintas que NO deben mezclarse:

### A. Reparación inmediata

Actualizar los tres secretos de Supabase con el nuevo cliente/refresh token.

Eso permite volver a probar el envío con credenciales válidas.

### B. Situación definitiva de Google OAuth

Hay que dejar el acceso OAuth de Gmail en una configuración de producción adecuada para que el refresh token no esté sometido a la limitación de Testing.

La documentación de Google actualmente establece una política de separación entre proyectos de testing y producción para aplicaciones que realmente son de producción. También establece excepciones de verificación para uso personal o para un número muy reducido de usuarios conocidos personalmente.

**Esto NO significa que haya que crear otro proyecto a ciegas.** Antes de hacerlo hay que comprobar si existe una configuración/proyecto de producción ya utilizable y cuál es la vía correcta para este caso concreto.

No se debe duplicar todo el trabajo sin esa comprobación.

---

## 8. LO QUE NO HAY QUE HACER

- No volver a Apps Script/MailApp como parche.
- No cambiar el backend oficial de V4.
- No crear una segunda arquitectura de correo.
- No modificar `send-camborio-email` para intentar solucionar `invalid_grant`.
- No regenerar código de la PWA relacionado con el correo sin una causa demostrada.
- No guardar `GMAIL_CLIENT_SECRET` ni `GMAIL_REFRESH_TOKEN` en GitHub.
- No pegar secretos en chats.
- No borrar el cliente OAuth antiguo hasta comprobar que el nuevo funciona.
- No crear otro proyecto Google sin comprobar primero si realmente es necesario.

---

## 9. ESTADO EXACTO AL CERRAR ESTA INVESTIGACIÓN

### V4

- Backend Supabase: **sí**.
- Edge Function `send-camborio-email`: **sí**.
- Flujo Gmail API: **sí**.
- Error diagnosticado: **sí**.
- Causa: **refresh token Google inválido/caducado/revocado**.
- Nuevo cliente OAuth: **creado**.
- Nuevo refresh token: **obtenido**.
- Siguiente paso: **actualizar los 3 secretos Gmail en Supabase**.

### Google OAuth

- Proyecto actual investigado: `My First Project`.
- Estado observado: **Prueba/Testing**.
- Cuenta utilizada: `camborio.reservas@gmail.com`.
- Alcance utilizado: `https://www.googleapis.com/auth/gmail.send`.
- Problema pendiente: **pasar de una configuración de Testing a una configuración definitiva de producción sin rehacer innecesariamente el sistema**.

---

## 10. ORDEN CORRECTO PARA CONTINUAR

1. **Actualizar los tres secretos de Gmail en Supabase.**
2. **Comprobar que el token nuevo permite obtener un access token.**
3. **Hacer una prueba controlada del envío**, solamente cuando se autorice una prueba real.
4. Si el envío funciona, **no tocar el código de correo**.
5. Resolver después la configuración definitiva de Google OAuth/producción.
6. Obtener un refresh token definitivo en la configuración final.
7. Sustituir únicamente `GMAIL_REFRESH_TOKEN` si el cliente OAuth final es el mismo; si cambia el cliente, sustituir también `GMAIL_CLIENT_ID` y `GMAIL_CLIENT_SECRET`.
8. Volver a probar.

---

## 11. FUENTES OFICIALES CONSULTADAS

- Google: comportamiento de refresh tokens en Testing y Production.
- Google: políticas OAuth 2.0 y separación entre testing y producción.
- Google: excepciones de verificación para uso personal/desarrollo.
- Supabase: gestión de secretos de Edge Functions.

La conclusión técnica de este documento se basa además en el código real de V2 y V4 almacenado en sus repositorios.

---

## 12. REGLA PARA EL SIGUIENTE CHAT

Si esta conversación llega al límite, **no empezar de cero**.

Abrir este documento primero:

`docs/CORREO_V4_ESTADO_Y_PLAN.md`

Y continuar desde el apartado **10. ORDEN CORRECTO PARA CONTINUAR**.

La regla de trabajo es:

**primero comprobar lo que ya funciona → copiar/adaptar lo necesario → cambiar una sola cosa → probar → conservar solo lo que funciona.**

No añadir parches ni inventar una arquitectura nueva si existe una solución funcional que se pueda adaptar.
