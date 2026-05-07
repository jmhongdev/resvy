import swaggerJsdoc from 'swagger-jsdoc';

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
        url:         'http://localhost:3000',
        description: 'Local development server',
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
            email:         { type: 'string', example: 'jisu@resvy.com' },
            password:      { type: 'string', example: 'Test1234!' },
            building_code: { type: 'string', example: 'DEMO-BUILD1' },
          },
        },
        LoginInput: {
          type:     'object',
          required: ['email', 'password'],
          properties: {
            email:    { type: 'string', example: 'jisu@resvy.com' },
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
                    id:    { type: 'string' },
                    name:  { type: 'string' },
                    email: { type: 'string' },
                    role:  { type: 'string', enum: ['resident', 'admin'] },
                  },
                },
                accessToken:  { type: 'string' },
                refreshToken: { type: 'string' },
              },
            },
          },
        },
        //Amenity schemas
        Amenity: {
          type: 'object',
          properties: {
            id:                 { type: 'string' },
            building_id:        { type: 'string' },
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
        //Booking schemas
        Booking: {
          type: 'object',
          properties: {
            id:           { type: 'string' },
            user_id:      { type: 'string' },
            amenity_id:   { type: 'string' },
            booking_date: { type: 'string', example: '2026-05-10' },
            start_time:   { type: 'string', example: '09:00' },
            end_time:     { type: 'string', example: '10:00' },
            status:       { type: 'string', enum: ['confirmed', 'cancelled', 'completed'] },
            notes:        { type: 'string' },
            created_at:   { type: 'string' },
          },
        },
        //Error schema
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
  // Tell swagger-jsdoc where to find the JSDoc comments
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);