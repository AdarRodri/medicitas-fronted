# MediCitas - Frontend

Interfaz web de MediCitas (HTML, CSS y JavaScript puro). Es un proyecto **independiente**
del backend: solo se comunica con él mediante peticiones HTTP a su API.

Al abrir la página hace un `GET /api/medicos/publico` al backend, que consulta la base de
datos en la nube, y muestra los médicos en pantalla.

## Configuración

Edita `js/config.js` y cambia `BACKEND_PRODUCCION` por la URL pública de tu backend
(sin `/` al final).

## Ejecutar en local

Con el backend corriendo en `http://127.0.0.1:5000`:

```bash
python -m http.server 5500
```

Abre `http://localhost:5500`. En `localhost` el frontend usa automáticamente el backend local.

## Despliegue

Sitio estático: no necesita compilación. Se despliega en Vercel / Netlify / GitHub Pages
apuntando a la raíz del repositorio.

## Repositorio del backend

Agrega aquí el enlace al repositorio del backend.
