const { createBot, createProvider, createFlow, addKeyword } = require('@bot-whatsapp/bot')
const QRPortalWeb = require('@bot-whatsapp/portal')
const BaileysProvider = require('@bot-whatsapp/provider/baileys')
const PostgreSQLAdapter = require('@bot-whatsapp/database/postgres')

// Configuración PostgreSQL
const POSTGRES_CONFIG = {
    host: 'localhost',
    user: 'postgres',
    database: 'chatbotwsciec',
    password: 'Ciec2025!Db$@1xZ',
    port: 5432,
}

// Validaciones mejoradas
const validarEntrada = (mensaje, tipo) => {
    const validaciones = {
        texto: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]{2,50}$/,
        numero: /^\d+$/,
        fecha: /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[012])\/\d{4}$/,
        contacto: /^(\+\d{1,3}[- ]?)?\d{9,15}$|^[^\s@]+@[^\s@]+\.[^\s@]+$/
    }
    
    if (!validaciones[tipo].test(mensaje)) {
        return `❌ Formato inválido para ${tipo}`
    }
    return null
}

// Conexión a PostgreSQL
let dbClient

const initDB = async () => {
    const { Client } = require('pg')
    const client = new Client(POSTGRES_CONFIG)
    await client.connect()
    dbClient = client
}

// Flujo de confirmación con PostgreSQL
const flowConfirmacion = addKeyword(['confirmar'])
    .addAnswer(async (ctx, { flowDynamic }) => {
        try {
            // Registrar usuario
            await dbClient.query(`
                INSERT INTO users (phone, name)
                VALUES ($1, $2)
                ON CONFLICT (phone) DO NOTHING`,
                [ctx.from, ctx.tipoEvento]
            )

            // Registrar evento
            const eventRes = await dbClient.query(`
                INSERT INTO events (name, start_date, end_date, capacity, location)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id`,
                [
                    ctx.tipoEvento,
                    new Date(ctx.fechaEvento.split('/').reverse().join('-')),
                    new Date(ctx.fechaEvento.split('/').reverse().join('-')),
                    ctx.numeroPersonas,
                    'Cámara de Industriales de Carabobo'
                ]
            )

            // Registrar reserva
            await dbClient.query(`
                INSERT INTO reservations (event_id, user_id, status)
                SELECT $1, id, 'confirmed'
                FROM users WHERE phone = $2`,
                [eventRes.rows[0].id, ctx.from]
            )

            await flowDynamic(`✅ Reserva confirmada para el ${ctx.fechaEvento}
                \nEvento: ${ctx.tipoEvento}
                \nAsistentes: ${ctx.numeroPersonas}
                \nRecibirás confirmación en tu WhatsApp`)
        } catch (e) {
            console.error('Error en DB:', e)
            await flowDynamic('❌ Error al procesar la reserva. Intenta nuevamente.')
        }
    })

// Flujos mejorados con validaciones
const flowNumeroPersonas = addKeyword([])
    .addAnswer('👥 Número de asistentes (máximo 1000):', { capture: true }, async (ctx, { gotoFlow, fallBack }) => {
        const error = validarEntrada(ctx.body, 'numero')
        if (error || ctx.body > 1000) return fallBack('❌ Número inválido (1-1000)')
        ctx.numeroPersonas = ctx.body
        return gotoFlow(flowConfirmacion)
    })

const flowFechaEvento = addKeyword([])
    .addAnswer('📅 Fecha del evento (DD/MM/AAAA):', { capture: true }, async (ctx, { gotoFlow, fallBack }) => {
        const error = validarEntrada(ctx.body, 'fecha')
        if (error) return fallBack(error)
        ctx.fechaEvento = ctx.body
        return gotoFlow(flowNumeroPersonas)
    })

const flowTipoEvento = addKeyword(['reservar'])
    .addAnswer('🎉 Tipo de evento (ej: conferencia, exposición):', { capture: true }, async (ctx, { gotoFlow, fallBack }) => {
        const error = validarEntrada(ctx.body, 'texto')
        if (error) return fallBack(error)
        ctx.tipoEvento = ctx.body
        return gotoFlow(flowFechaEvento)
    })

// Flujo principal mejorado
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

const main = async () => {
    await initDB() // Inicializar conexión DB
    
    const adapterDB = new PostgreSQLAdapter(POSTGRES_CONFIG)
    const adapterFlow = createFlow([flowPrincipal, flowTipoEvento, flowFechaEvento, flowNumeroPersonas, flowConfirmacion])
    const adapterProvider = createProvider(BaileysProvider)

    createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    })

    QRPortalWeb()
}

main()