# Sistema de Gestión de Biblioteca Escolar - Backend

## Descripción del Proyecto

El Sistema de Gestión de Biblioteca Escolar es una aplicación diseñada para digitalizar y optimizar los procesos de gestión bibliotecaria en entornos educativos. Este sistema reemplaza el control manual por una solución digital integral que facilita el seguimiento de préstamos, gestión de inventario, búsqueda de recursos y generación de informes.

### Problemática que resuelve

- Control manual ineficiente de registros
- Dificultad para rastrear préstamos
- Deterioro de materiales sin adecuado registro
- Búsqueda lenta de recursos
- Falta de notificaciones para devoluciones
- Inventario desactualizado

## Tecnologías Utilizadas

El backend está construido siguiendo los principios de Clean Architecture, utilizando:

- **Framework**: NestJS (Basado en Node.js y TypeScript)
- **Base de Datos**: MongoDB
- **ODM**: Mongoose
- **Autenticación**: JWT (JSON Web Tokens)
- **Validación**: class-validator y class-transformer
- **API Externa**: Google Books API
- **Seguridad**: bcrypt para cifrado de contraseñas

## Requisitos Previos

- Node.js (v16 o superior)
- npm
- MongoDB (instalado localmente o acceso a una instancia remota)
- Git

## Instalación y Configuración

### 1. Clonar el Repositorio

```bash
git clone https://github.com/MasCreaThor/BIBLIOTECA-BACKEND.git
cd biblioteca-backend
```

### 2. Instalar Dependencias

```bash
npm install
```

### 3. Configurar Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto con la siguiente estructura:

```bash
# Entorno
NODE_ENV=development

# Servidor
PORT=3000

# MongoDB
MONGODB_URI=mongodb://localhost:27017/biblioteca-escolar

# JWT
JWT_SECRET=tu_clave_secreta_aqui
JWT_EXPIRATION=1d

# Google Books API
GOOGLE_BOOKS_API_KEY=tu_api_key_aqui
```

### 4. Iniciar el Servidor

#### Modo Desarrollo

```bash
npm run start:dev
```

#### Modo Producción

```bash
npm run build
npm run start:prod
```

Una vez iniciado, el servidor estará accesible en: `http://localhost:3000/api`

## Módulos Principales

### 1. Usuarios

Gestión de usuarios del sistema (administradores, bibliotecarios, profesores, estudiantes).

### 2. Recursos

Gestión del inventario de la biblioteca, incluyendo libros, juegos, mapas y otros materiales.

### 3. Préstamos

Control de préstamos, devoluciones y seguimiento de recursos prestados.

### 4. Categorías

Clasificación de recursos para una mejor organización.

### 5. Reportes

Generación de informes y estadísticas sobre el uso de la biblioteca.

### 6. Integración con Google Books

Obtención automática de información de un recurso utilizando la API de Google Books.

## Seguridad

El sistema implementa los siguientes principios de seguridad:

### Confidencialidad

- Autenticación basada en JWT
- Encriptación de contraseñas con bcrypt
- Control de acceso basado en roles (RBAC)

### Integridad

- Validación de datos en todas las entradas
- Verificación de consistencia en operaciones críticas
- Middleware para sanitización de entradas

### Disponibilidad

- Respaldos automáticos programados
- Manejo de errores y excepciones
- Monitoreo del sistema

## Rutas de API

### Autenticación

- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/register` - Registrar nuevo usuario (solo administradores)

### Usuarios

- `GET /api/users` - Listar todos los usuarios
- `GET /api/users/:id` - Obtener usuario por ID
- `POST /api/users` - Crear nuevo usuario
- `PUT /api/users/:id` - Actualizar usuario
- `DELETE /api/users/:id` - Eliminar usuario

### Recursos

- `GET /api/resources` - Listar todos los recursos
- `GET /api/resources/:id` - Obtener recurso por ID
- `POST /api/resources` - Crear nuevo recurso
- `PUT /api/resources/:id` - Actualizar recurso
- `DELETE /api/resources/:id` - Eliminar recurso
- `GET /api/resources/search/isbn/:isbn` - Buscar por ISBN

### Préstamos

- `GET /api/loans` - Listar todos los préstamos
- `GET /api/loans/:id` - Obtener préstamo por ID
- `POST /api/loans` - Registrar nuevo préstamo
- `PUT /api/loans/:id` - Actualizar préstamo
- `PUT /api/loans/:id/return` - Registrar devolución
- `GET /api/loans/overdue` - Listar préstamos vencidos

### Google Books

- `GET /api/google-books/search` - Buscar en Google Books
- `GET /api/google-books/isbn/:isbn` - Buscar por ISBN

## Desarrollo

### Generar un nuevo recurso

```bash
nest g resource nombre-recurso
```

Este comando generará un módulo completo con controlador, servicio, DTOs y tests.

## Consideraciones para Producción

1. Asegurarse de cambiar las variables de entorno para producción
2. Configurar respaldos automáticos de la base de datos
3. Implementar HTTPS para todas las comunicaciones
4. Revisar las políticas de CORS
5. Configurar un sistema de logs más robusto

## Contacto

Para cualquier consulta o sugerencia, por favor contactar al equipo de desarrollo:

- Email: [yadamuoz@misena.edu.co](mailto:yadamuoz@misena.edu.co) - [andersonceron2020@itp.edu.co](mailto:andersonceron2020@itp.edu.co)

- GitHub: [MasCreaThor's GitHub](https://github.com/MasCreaThor)
