# Sistema de Gestión de Biblioteca Escolar - Backend

## Descripción del Proyecto

El Sistema de Gestión de Biblioteca Escolar es una aplicación diseñada para digitalizar y optimizar los procesos de gestión bibliotecaria en entornos educativos. Este sistema reemplaza el control manual por una solución digital integral que facilita el seguimiento de préstamos, gestión de inventario, búsqueda de recursos y generación de informes.

### Problemática que resuelve

- ✅ Control manual ineficiente de registros
- ✅ Dificultad para rastrear préstamos
- ✅ Deterioro de materiales sin adecuado registro
- ✅ Búsqueda lenta de recursos
- ✅ Falta de notificaciones para devoluciones
- ✅ Inventario desactualizado

## Arquitectura del Sistema

El proyecto utiliza una **arquitectura en capas** con las siguientes responsabilidades:

### 📁 Estructura de Capas

```markdowun
src/
├── controllers/          # Controladores HTTP - Reciben peticiones
├── services/            # Lógica de negocio y casos de uso
├── repositories/        # Acceso a datos y operaciones con BD
├── models/             # Modelos de Mongoose (esquemas)
├── adapters/           # Integraciones con servicios externos
├── middlewares/        # Guards, pipes y middlewares
├── common/             # Utilidades, DTOs, interfaces compartidas
├── config/             # Configuración de la aplicación
└── infrastructure/     # Logging, excepciones, etc.
```

### 🔄 Flujo de Datos

```markdowun
Request → Controller → Service → Repository → Database
                          ↓
                     Adapter (APIs externas)
```

## Tecnologías Utilizadas

### Backend Core

- **Framework**: NestJS (Node.js + TypeScript)
- **Base de Datos**: MongoDB
- **ODM**: Mongoose
- **Autenticación**: JWT (JSON Web Tokens)
- **Validación**: class-validator y class-transformer

### Seguridad

- **Encriptación**: bcrypt para contraseñas
- **Autenticación**: JWT con guards personalizados
- **Autorización**: RBAC (Role-Based Access Control)

### APIs Externas

- **Google Books API**: Para obtener información bibliográfica

### Herramientas de Desarrollo

- **Logging**: Winston
- **Testing**: Jest
- **Linting**: ESLint + Prettier

## Requisitos Previos

- **Node.js** (v18 o superior)
- **npm** o **yarn**
- **MongoDB** (v6.0 o superior)
- **Git**

## Instalación y Configuración

### 1. 📥 Clonar el Repositorio

```bash
git clone https://github.com/MasCreaThor/BIBLIOTECA-BACKEND.git
cd biblioteca-backend
```

### 2. 📦 Instalar Dependencias

```bash
npm install
```

### 3. ⚙️ Configurar Variables de Entorno

Copia el archivo de ejemplo y edítalo con tus valores:

```bash
cp .env.example .env
```

Variables principales requeridas:

```bash
# Base de datos
MONGODB_URI=mongodb://localhost:27017/biblioteca-escolar

# JWT
JWT_SECRET=tu_clave_secreta_super_segura

# Google Books (opcional)
GOOGLE_BOOKS_API_KEY=tu_api_key_de_google_books
```

### 4. 🗄️ Configurar Base de Datos

Asegúrate de que MongoDB esté ejecutándose:

```bash

# En Windows
net start MongoDB
```

### 5. 🚀 Iniciar el Servidor

#### Modo Desarrollo (recomendado)

```bash
npm run start:dev
```

#### Modo Producción

```bash
npm run build
npm run start:prod
```

El servidor estará disponible en: **<http://localhost:3000/api>**

## 🏗️ Desarrollo

### Crear un Nuevo Módulo

Para crear un módulo completo siguiendo la arquitectura en capas:

```bash
# Generar recurso completo
nest g resource nombre-modulo

# Luego organizar archivos según la arquitectura:
# - Controller → src/controllers/
# - Service → src/services/
# - DTO → src/common/dto/
# - Interfaces → src/common/interfaces/
```

### Estructura de un Módulo Típico

```typescript
// Controller (src/controllers/)
@Controller('recursos')
export class RecursoController {
  constructor(private readonly recursoService: RecursoService) {}
  
  @Get()
  findAll() {
    return this.recursoService.findAll();
  }
}

// Service (src/services/)
@Injectable()
export class RecursoService {
  constructor(private readonly recursoRepository: RecursoRepository) {}
  
  findAll() {
    return this.recursoRepository.findAll();
  }
}

// Repository (src/repositories/)
@Injectable()
export class RecursoRepository extends BaseRepositoryImpl<Recurso> {
  constructor(@InjectModel(Recurso.name) recursoModel: Model<Recurso>) {
    super(recursoModel);
  }
}
```

### Comandos Útiles

```bash
#Verificar y Probar
npm run build

# Verificar estado
npm run admin:status

# Crear administrador
npm run admin:init
# Desarrollo
npm run start:dev          # Modo desarrollo con watch
npm run start:debug        # Modo debug

# Calidad de código
npm run lint               # Ejecutar linter
npm run format             # Formatear código

# Base de datos
npm run db:seed

```

## 🛡️ Seguridad

### Principios Implementados

- **Confidencialidad**: JWT + bcrypt
- **Integridad**: Validación de datos + middleware
- **Disponibilidad**: Manejo de errores + logging

### Autenticación

```typescript
// Ruta pública (sin autenticación)
@Public()
@Get('publico')
metodoPublico() {}

// Ruta protegida (requiere autenticación)
@Get('privado')
metodoPrivado() {}

// Ruta con roles específicos
@Roles(UserRole.ADMIN)
@Get('admin-only')
metodoAdmin() {}
```

## 📊 Monitoreo y Logging

El sistema incluye logging estructurado con Winston:

```typescript
// En cualquier servicio
constructor(private logger: LoggerService) {
  this.logger.setContext('NombreClase');
}

// Usar logging
this.logger.log('Operación exitosa');
this.logger.error('Error en operación', error.stack);
this.logger.warn('Advertencia');
```

### Ejecutar Pruebas

```bash
# Todas las pruebas
npm test

# Pruebas específicas
npm test -- --testNamePattern="Usuario"

# Con cobertura
npm run test:cov
```

### Convenciones de Código

- **TypeScript**: Tipado estricto
- **ESLint + Prettier**: Estilo de código consistente
- **Commits**: Mensajes descriptivos

## 📞 Soporte

### Contacto

- **Email**: [yadmunozr22@itp.edu.co](mailto:yadmunozr22@itp.edu.co) - [andersonceron2020@itp.edu.co](mailto:andersonceron2020@itp.edu.co)
- **GitHub**: [MasCreaThor](https://github.com/MasCreaThor)
