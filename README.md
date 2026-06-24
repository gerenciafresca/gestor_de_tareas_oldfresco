# Gestor de Tareas — Old Fresco

Herramienta interna de gestión de tareas para el equipo de Old Fresco, productora costarricense de hip hop independiente.

---

## Historial de desarrollo

### Junio 2026 — Versión inicial
- Estructura base en HTML, CSS y JavaScript puro
- Funcionalidades básicas: crear, editar, eliminar y completar tareas
- Persistencia local usando localStorage

### Junio 2026 — Migración a Firebase + Netlify
- Se eliminó el uso de localStorage y se migró a Cloud Firestore (Firebase)
- Las tareas ahora se sincronizan en tiempo real entre todos los dispositivos del equipo
- Despliegue en Netlify con dominio: jolly-tarsier-20b8ee.netlify.app
- Integración de GitHub para control de versiones y despliegue automático

### Junio 2026 — Mejoras de funcionalidad
- Se agregó campo de fecha de vencimiento por tarea
- Detección automática de tareas tardías con badge visual y fondo de color
- Las tareas completadas se ordenan automáticamente al fondo de la lista
- Notificaciones en pantalla (banner) cuando se agrega una tarea nueva o hay tardías

### Junio 2026 — Gestión por equipo
- Menú de asignación de responsable por tarea (Cristian, Andrés, Ignacio, Felipe, Fabian, Diego)
- Cada miembro tiene un color identificador en los badges
- Filtros colapsables por responsable, categoría y prioridad
- Categorías: Producción, Logística, Marketing, Artistas, Finanzas
- Niveles de prioridad: Alta, Media, Baja

### Junio 2026 — Mejoras de experiencia de usuario
- Logo de Old Fresco en el encabezado
- Barra de resumen: tareas pendientes, tardías y completadas
- Modal de edición en pantalla (reemplaza los pop-ups del navegador)
- Botones de acción rediseñados en formato horizontal con colores diferenciados
- Campo de notas por tarea para agregar detalles, contactos o links

---

## Estado actual

El gestor está en uso activo por el equipo. Próximas mejoras contempladas:

- Agrupación de tareas por evento o concierto
- Vista de calendario
- Sistema de login por usuario
- Notificaciones push aunque la app esté cerrada

---

## Tecnologías utilizadas

- HTML, CSS, JavaScript
- Firebase Firestore (base de datos en tiempo real)
- Netlify (despliegue y hosting)
- GitHub (control de versiones)

## Equipo

Old Fresco — San José, Costa Rica