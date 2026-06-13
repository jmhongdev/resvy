import swaggerJsdoc from 'swagger-jsdoc';
import path from 'path';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title:       'Resvy API',
      version:     '1.0.0',
      description: 'Apartment amenity booking platform API. Residents book shared spaces like gyms, BBQ areas, and study rooms.',
    },
    servers: [
      {
        url:         process.env.API_URL ?? 'http://localhost:3000',
        description: process.env.NODE_ENV === 'production'
          ? 'Production server'
          : 'Local development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type:         'http',
          scheme:       'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        // Auth schemas
        RegisterInput: {
          type:     'object',
          required: ['name', 'email', 'password', 'building_code'],
          properties: {
            name:          { type: 'string', example: '김지수' },
            email:         { type: 'string', format: 'email', example: 'jisu@resvy.com' },
            password:      { type: 'string', example: 'Test1234!' },
            building_code: { type: 'string', example: 'DEMO-BUILD1' },
          },
        },
        LoginInput: {
          type:     'object',
          required: ['email', 'password'],
          properties: {
            email:    { type: 'string', format: 'email', example: 'jisu@resvy.com' },
            password: { type: 'string', example: 'Test1234!' },
          },
        },
        AuthResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                user: {
                  type: 'object',
                  properties: {
                    id:    { type: 'string', format: 'uuid' },
                    name:  { type: 'string' },
                    email: { type: 'string', format: 'email' },
                    role:  { type: 'string', enum: ['resident', 'admin'] },
                  },
                },
                accessToken:  { type: 'string' },
                refreshToken: { type: 'string' },
              },
            },
          },
        },
        // Amenity schemas
        Amenity: {
          type: 'object',
          properties: {
            id:                 { type: 'string', format: 'uuid' },
            building_id:        { type: 'string', format: 'uuid' },
            name:               { type: 'string', example: '헬스장' },
            description:        { type: 'string', example: '최신 운동 기구 완비' },
            capacity:           { type: 'integer', example: 10 },
            location:           { type: 'string', example: 'B1층' },
            is_active:          { type: 'boolean', example: true },
            open_time:          { type: 'string', example: '08:00' },
            close_time:         { type: 'string', example: '22:00' },
            slot_duration_mins: { type: 'integer', example: 60 },
            max_advance_days:   { type: 'integer', example: 7 },
          },
        },
        // Booking schemas
        Booking: {
          type: 'object',
          properties: {
            id:           { type: 'string', format: 'uuid' },
            user_id:      { type: 'string', format: 'uuid' },
            amenity_id:   { type: 'string', format: 'uuid' },
            booking_date: { type: 'string', format: 'date', example: '2026-05-10' },
            start_time:   { type: 'string', example: '09:00' },
            end_time:     { type: 'string', example: '10:00' },
            status:       { type: 'string', enum: ['confirmed', 'cancelled', 'completed'] },
            notes:        { type: 'string' },
            created_at:   { type: 'string', format: 'date-time' },
          },
        },
        // Error schema
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: [path.join(__dirname, '../routes/*.ts')],
};

export const swaggerSpec = swaggerJsdoc(options);