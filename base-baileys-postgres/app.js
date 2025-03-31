// ... (configuraciones anteriores se mantienen igual)

// Flujo de Servicios
const flowServicios = addKeyword(['servicios', 'servicio'])
    .addAnswer([
        '🏢 Nuestros servicios incluyen:',
        '- Salas de conferencias equipadas',
        '- Espacios para eventos sociales',
        '- Equipo audiovisual completo',
        '- Catering profesional',
        '\nEscribe *reservar* para iniciar una reserva'
    ]);

// Flujo de Horarios
const flowHorarios = addKeyword(['horario', 'horarios'])
    .addAnswer([
        '⏰ Horarios de atención:',
        '- Lunes a Viernes: 8:00 AM - 6:00 PM',
        '- Sábados: 9:00 AM - 2:00 PM',
        '- Domingos: Solo eventos especiales'
    ]);

// Flujo de Contacto
const flowContactoDirecto = addKeyword(['contacto', 'llamar'])
    .addAnswer([
        '📞 Contáctanos directamente:',
        '- Teléfono: +58 241-1234567',
        '- Email: eventos@camaracarabobo.com.ve',
        '- Dirección: Av. Principal, Cámara de Industriales, Valencia'
    ]);

// Flujo principal mejorado (ya existente en tu código)
const flowPrincipal = addKeyword(['hola', 'menu'])
    .addAnswer('🏭 ¡Bienvenido a la Cámara de Industriales de Carabobo!')
    .addAnswer(
        [
            'Opciones disponibles:',
            '👉 *reservar* - Reservar espacio para evento',
            '👉 *contacto* - Información de contacto',
            '👉 *horarios* - Horarios de atención',
            '👉 *servicios* - Nuestros servicios'
        ],
        null,
        null,
        [flowTipoEvento, flowServicios, flowHorarios, flowContactoDirecto]
    )

// ... (el resto del código se mantiene igual)

const main = async () => {
    await initDB()
    
    const adapterDB = new PostgreSQLAdapter(POSTGRES_CONFIG)
    const adapterFlow = createFlow([
        flowPrincipal,
        flowServicios,     // ← Añadidos aquí
        flowHorarios,      // ←
        flowContactoDirecto, // ←
        flowTipoEvento,
        flowFechaEvento,
        flowNumeroPersonas,
        flowConfirmacion
    ])
    const adapterProvider = createProvider(BaileysProvider)

    createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    })

    QRPortalWeb()
}

main()