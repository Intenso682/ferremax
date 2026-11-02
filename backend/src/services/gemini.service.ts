import { prisma } from '../prisma';
import { config } from '../config';

export interface GenerateProductInput {
  name: string;
  category?: string;
  brand?: string;
  features?: string;
}

export interface AdminAssistantInput {
  prompt: string;
  context?: string;
}

export interface HelpCopilotInput {
  question: string;
  role?: string;
  currentScreen?: string;
}

export class GeminiService {
  private static cachedApiKey: string | null = null;
  private static cachedModel: string | null = null;
  private static defaultModel = 'gemini-3.8-flash';

  /**
   * Obtiene el modelo activo de Gemini:
   * 1. Revisa StoreSetting en base de datos.
   * 2. Revisa variable de entorno GEMINI_MODEL.
   * 3. Por defecto usa 'gemini-3.8-flash'.
   */
  public static async getModel(): Promise<string> {
    if (this.cachedModel) {
      return this.cachedModel;
    }

    try {
      const setting = await prisma.storeSetting.findUnique({
        where: { key: 'GEMINI_MODEL' },
      });
      if (setting && setting.value && setting.value.trim().length > 0) {
        this.cachedModel = setting.value.trim();
        return this.cachedModel;
      }
    } catch (err) {
      console.warn('[GeminiService] No se pudo consultar StoreSetting para GEMINI_MODEL:', err);
    }

    const envModel = (process.env.GEMINI_MODEL || (config as any).geminiModel || '').trim();
    if (envModel) {
      this.cachedModel = envModel;
      return envModel;
    }

    this.cachedModel = this.defaultModel;
    return this.defaultModel;
  }

  /**
   * Guarda o actualiza el modelo en StoreSetting y en caché local
   */
  public static async setModel(model: string): Promise<void> {
    const cleanModel = (model || '').trim();
    if (!cleanModel) return;
    await prisma.storeSetting.upsert({
      where: { key: 'GEMINI_MODEL' },
      update: { value: cleanModel, description: 'Modelo activo de Google Gemini' },
      create: { key: 'GEMINI_MODEL', value: cleanModel, description: 'Modelo activo de Google Gemini' },
    });
    this.cachedModel = cleanModel;
  }

  /**
   * Obtiene la clave de API activa de Gemini:
   * 1. Verifica StoreSetting en base de datos.
   * 2. Recurre a GEMINI_API_KEY en backend/.env.
   */
  public static async getApiKey(): Promise<string> {
    if (this.cachedApiKey) {
      return this.cachedApiKey;
    }

    try {
      const setting = await prisma.storeSetting.findUnique({
        where: { key: 'GEMINI_API_KEY' },
      });
      if (setting && setting.value && setting.value.trim().length > 0) {
        this.cachedApiKey = setting.value.trim();
        return this.cachedApiKey;
      }
    } catch (err) {
      console.warn('[GeminiService] No se pudo consultar StoreSetting para GEMINI_API_KEY:', err);
    }

    const envKey = (process.env.GEMINI_API_KEY || (config as any).geminiApiKey || '').trim();
    if (envKey) {
      this.cachedApiKey = envKey;
      return envKey;
    }

    return '';
  }

  /**
   * Guarda o actualiza la clave en StoreSetting y en caché local
   */
  public static async setApiKey(apiKey: string): Promise<void> {
    const cleanKey = (apiKey || '').trim();
    await prisma.storeSetting.upsert({
      where: { key: 'GEMINI_API_KEY' },
      update: { value: cleanKey, description: 'Google Gemini API Key para redacción y asistente de administración' },
      create: { key: 'GEMINI_API_KEY', value: cleanKey, description: 'Google Gemini API Key para redacción y asistente de administración' },
    });
    this.cachedApiKey = cleanKey;
  }

  /**
   * Retorna el estado actual de configuración de Gemini
   */
  public static async getStatus(): Promise<{
    configured: boolean;
    model: string;
    maskedKey: string | null;
  }> {
    const key = await this.getApiKey();
    const model = await this.getModel();
    if (!key) {
      return {
        configured: false,
        model,
        maskedKey: null,
      };
    }

    const masked = key.length > 8 ? `${key.substring(0, 4)}...${key.substring(key.length - 4)}` : '****';
    return {
      configured: true,
      model,
      maskedKey: masked,
    };
  }

  /**
   * Invoca a la API de Google Gemini (REST endpoint oficial v1beta).
   * Prioriza el modelo configurado (ej: gemini-3.8-flash) y cuenta con fallback automático
   * para garantizar disponibilidad continua sin errores 404.
   */
  private static async callGeminiApi(
    prompt: string,
    apiKeyOverride?: string,
    systemInstruction?: string
  ): Promise<{ text: string; modelUsed: string }> {
    const apiKey = apiKeyOverride || (await this.getApiKey());
    if (!apiKey) {
      throw new Error('NO_API_KEY: No se ha configurado la clave de API de Google Gemini.');
    }

    const primaryModel = await this.getModel();
    const candidateModels = Array.from(new Set([
      primaryModel,
      'gemini-3.8-flash',
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-flash',
    ]));

    let lastError: any = null;

    for (const model of candidateModels) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const requestBody: any = {
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          },
        };

        if (systemInstruction) {
          requestBody.systemInstruction = {
            parts: [{ text: systemInstruction }],
          };
        }

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        if (response.status === 404) {
          // El modelo específico no está disponible en este endpoint; probar siguiente modelo
          lastError = new Error(`El modelo "${model}" no fue encontrado (404) en la API de Google.`);
          continue;
        }

        if (!response.ok) {
          const errText = await response.text();
          let errorMsg = `Error HTTP ${response.status}`;
          try {
            const errJson = JSON.parse(errText);
            errorMsg = errJson.error?.message || errorMsg;
          } catch {
            errorMsg = errText || errorMsg;
          }
          throw new Error(`Gemini API Error (${response.status}): ${errorMsg}`);
        }

        const data = await response.json();
        const candidate = data.candidates?.[0];
        const textPart = candidate?.content?.parts?.[0]?.text;

        if (!textPart) {
          throw new Error('La respuesta de Gemini no contiene texto válido.');
        }

        return {
          text: textPart.trim(),
          modelUsed: model,
        };
      } catch (err: any) {
        lastError = err;
        if (!err.message?.includes('404')) {
          throw err;
        }
      }
    }

    throw lastError || new Error('No se pudo conectar con ningún modelo de Gemini disponible.');
  }

  /**
   * Prueba la conectividad con Gemini con una solicitud ligera
   */
  public static async testConnection(candidateKey?: string): Promise<{ success: boolean; latencyMs: number; message: string; modelUsed?: string }> {
    const t0 = Date.now();
    try {
      const res = await this.callGeminiApi(
        'Hola Gemini, responde únicamente la palabra: CONECTADO',
        candidateKey,
        'Eres el asistente técnico de FerreMax.'
      );
      const latencyMs = Date.now() - t0;
      return {
        success: true,
        latencyMs,
        modelUsed: res.modelUsed,
        message: `${res.text} (Modelo: ${res.modelUsed})`,
      };
    } catch (err: any) {
      const latencyMs = Date.now() - t0;
      return {
        success: false,
        latencyMs,
        message: err.message || 'Error al conectar con Google Gemini.',
      };
    }
  }

  /**
   * Redactor inteligente de fichas de producto para el panel de administración
   */
  public static async generateProductCopy(input: GenerateProductInput): Promise<{
    description: string;
    modelUsed: string;
  }> {
    const systemPrompt = `Eres el redactor técnico y especialista comercial de FerreMax, una ferretería industrial líder en Venezuela y Latinoamérica.
Tu misión es generar la descripción comercial y técnica de un producto para la tienda online.
Instrucciones estrictas:
- Redacta en español claro, profesional y persuasivo, orientado a maestros de obra, talleres y particulares.
- Estructura la respuesta con:
  1. Un párrafo introductorio de alto impacto comercial destacando la calidad y el uso principal.
  2. Una sección de "Beneficios destacados:" con 3 viñetas explicativas.
  3. Una sección breve de "Aplicaciones recomendadas y consejos de uso".
- Si no se especifican especificaciones detalladas, sugiere especificaciones comunes y coherentes para ese tipo de producto ferretero.
- No inventes marcas no especificadas. Mantén un tono serio y confiable.`;

    const userPrompt = `Por favor redacta la descripción técnica y comercial para el siguiente producto de ferretería:
- Nombre del producto: "${input.name}"
${input.category ? `- Categoría: ${input.category}` : ''}
${input.brand ? `- Marca: ${input.brand}` : ''}
${input.features ? `- Características adicionales mencionadas por el usuario: ${input.features}` : ''}`;

    const res = await this.callGeminiApi(userPrompt, undefined, systemPrompt);

    return {
      description: res.text,
      modelUsed: res.modelUsed,
    };
  }

  /**
   * Asistente de configuración y diagnóstico para el Administrador de FerreMax
   */
  public static async adminAssistant(input: AdminAssistantInput): Promise<{ reply: string; modelUsed: string }> {
    const systemPrompt = `Eres el Asistente Experto de Administración de FerreMax (Core-Business Suite).
Ayudas al dueño y administradores de la ferretería a:
1. Configuración de inventario, márgenes de ganancia recomendados, categorización de herramientas y materiales de ferretería/construcción.
2. Solución de dudas operativas del sistema (cálculo de tasa BCV en Venezuela, IGTF, Punto de Venta, rotación de inventario).
3. Redacción de avisos a clientes o promociones comerciales.
Seguridad estricta:
- Nunca solicites claves, tokens ni datos bancarios privados.
- Responde de forma concisa, práctica y en viñetas directas.`;

    const fullPrompt = `${input.context ? `[Contexto actual del sistema: ${input.context}]\n\n` : ''}Pregunta del administrador: ${input.prompt}`;

    const res = await this.callGeminiApi(fullPrompt, undefined, systemPrompt);

    return {
      reply: res.text,
      modelUsed: res.modelUsed,
    };
  }

  /**
   * Copiloto de Ayuda Operativa en Vivo para cualquier empleado (Cajera, Almacén, Contabilidad, etc.)
   * Entrenado específicamente con los flujos de FerreMax v1.11.
   */
  public static async helpCopilot(input: HelpCopilotInput): Promise<{
    reply: string;
    modelUsed: string;
    isLocalFallback: boolean;
  }> {
    const key = await this.getApiKey();
    if (!key) {
      // Fallback local instantáneo con base de conocimiento semántica y contextual
      const fallback = this.getLocalHelpFallback(input.question, input.role, input.currentScreen);
      return {
        reply: fallback,
        modelUsed: 'local-knowledge-base',
        isLocalFallback: true,
      };
    }

    const roleName = input.role || 'CASHIER';
    const systemPrompt = `Eres el "Copiloto Oficial de Ayuda y Procedimientos de FerreMax" (Core-Business Suite v1.11).
Tu función es enseñar a cualquier empleado (desde un principiante sin conocimientos técnicos hasta un encargado) cómo realizar cualquier tarea en el sistema.
El usuario actual tiene el rol: ${roleName}.
${input.currentScreen ? `Pantalla actual: ${input.currentScreen}` : ''}

REGLAS ESTRICTAS DE RESPUESTA:
1. Responde SIEMPRE en español claro, cálido, profesional y muy fácil de entender.
2. Estructura SIEMPRE tu respuesta con el siguiente formato exacto:
   🎯 **Objetivo:** (1 frase explicando qué se va a hacer)
   📋 **Paso a Paso:**
   - **Paso 1:** (Qué pantalla abrir o qué botón tocar primero)
   - **Paso 2:** (Qué datos ingresar o qué opción elegir)
   - **Paso 3:** (Cómo confirmar y qué comprobante se emite)
   💡 **Consejo Clave o Regla de Oro:** (Un tip práctico para evitar equivocaciones comunes)
3. Conocimiento Oficial del Sistema:
   - Precios en USD con conversión automática a Bolívares según tasa oficial BCV.
   - Punto de Venta POS: buscador por código de barras, SKU o nombre.
   - Métodos de pago: Efectivo USD (calcula 3% IGTF y vuelto automáticamente), Pago Móvil (requiere 4-6 dígitos de referencia bancaria), Punto de Débito, Transferencia, Zelle y Crédito Comercial ("Fiado / A Cuenta").
   - Ventas Fiadas (Crédito): solo para clientes registrados con cupo disponible en dólares. El sistema bloquea si supera el cupo.
   - Cierres de caja: Corte X (auditoría sin cerrar turno) y Corte Z (cierre formal con arqueo físico de gaveta y reporte de faltantes/sobrantes).
   - Comprobantes digitales: WhatsApp 1-clic, descarga PNG 2x y PDF.
   - Cuentas por Cobrar & Abonos: pantalla Clientes & CxC -> botón [Registrar Abono] -> emite folio ABO-xxxx y actualiza deuda.
   - Respaldos: pantalla Ajustes -> Centro de Respaldos -> botón [Descargar Respaldo (.db)] de 1 clic.
4. Si la pregunta no se relaciona con FerreMax, responde cordialmente reenfocando al uso del sistema comercial.`;

    const userPrompt = `Pregunta del usuario: "${input.question}"`;

    try {
      const res = await this.callGeminiApi(userPrompt, undefined, systemPrompt);
      return {
        reply: res.text,
        modelUsed: res.modelUsed,
        isLocalFallback: false,
      };
    } catch (err) {
      console.warn('[GeminiService] Falló llamada a Gemini para helpCopilot, utilizando fallback local contextual:', err);
      const fallback = this.getLocalHelpFallback(input.question, input.role, input.currentScreen);
      return {
        reply: fallback,
        modelUsed: 'local-knowledge-base',
        isLocalFallback: true,
      };
    }
  }

  /**
   * Base de conocimiento local instantánea de contingencia.
   * Utiliza ponderación semántica de términos, coincidencia de frases y detección de la pantalla activa (currentScreen)
   * para dar respuestas precisas y específicas a cualquier pregunta operativa o técnica sin conexión.
   */
  public static getLocalHelpFallback(question: string, role?: string, currentScreen?: string): string {
    const rawQ = question || '';
    const norm = (str: string) => (str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const q = norm(rawQ);
    const screen = norm(currentScreen || '');
    const tokens = q.split(' ').filter(t => t.length > 2);

    interface HelpItem {
      id: string;
      screens: string[];
      phrases: string[];
      keywords: string[];
      content: string;
    }

    const ARTICLES: HelpItem[] = [
      // 1. API & DevOps - Desplegar Módulo (Botón Verde)
      {
        id: 'devops_deploy',
        screens: ['devops', 'admin devops', 'api devops'],
        phrases: ['desplegar modulo', 'boton verde', 'boton desplegar', 'deploy modulo', 'pipeline ci cd', 'ejecutar deploy'],
        keywords: ['devops', 'desplegar', 'deploy', 'boton', 'verde', 'pipeline', 'traefik', 'docker', 'modulo', 'blue green', 'compilar'],
        content: `🎯 **Objetivo:** Para qué sirve y cómo opera el botón verde **[ 🚀 Desplegar módulo ]** en la pantalla de API & DevOps.

📋 **Explicación y Paso a Paso:**
- **¿Qué hace el botón verde?:** Activa la simulación y ejecución del Pipeline de Integración y Entrega Continua (CI/CD) Blue-Green para actualizar o desplegar un módulo sin detener el sistema.
- **Etapas del Pipeline automatizado:**
  1. **Checkout:** Clona y valida el código fuente desde el repositorio Git con control de versiones.
  2. **Lint & Tipos:** Ejecuta análisis estático con ESLint y validación estricta de TypeScript.
  3. **Tests del Módulo:** Corre las pruebas unitarias y de integración automáticas con Jest y Supertest.
  4. **Build Imagen:** Compila la imagen de contenedor Docker optimizada mediante Docker Buildx.
  5. **Push Registry:** Sube la versión al registro privado seguro (\`ghcr.io/core\`).
  6. **Deploy Blue-Green:** Traefik conmuta el tráfico en vivo hacia la nueva versión sin caída de servicio (Zero-Downtime).
- **Utilidad en Producción (VPS):** Permite actualizar cualquier módulo (por ejemplo Facturación o Reportes) sin detener la tienda online ni interrumpir a las cajeras en el mostrador.

💡 **Regla de Oro:** Los módulos de FerreMax están desacoplados. Si un módulo se actualiza o reinicia, el resto del negocio continúa cobrando y operando sin interrupciones.`,
      },

      // 2. API & DevOps - Pruebas E2E
      {
        id: 'devops_tests',
        screens: ['devops', 'admin devops'],
        phrases: ['correr pruebas', 'pruebas e2e', 'correr pruebas e2e', 'ejecutar tests'],
        keywords: ['pruebas', 'e2e', 'tests', 'test', 'supertest', 'jest', 'salud'],
        content: `🎯 **Objetivo:** Ejecutar la suite de pruebas automatizadas End-to-End (E2E) en API & DevOps.

📋 **Paso a Paso:**
- **Paso 1:** En la pantalla **API & DevOps**, haz clic en el botón superior **[ ✔️ Correr pruebas E2E ]**.
- **Paso 2:** El sistema simula transacciones automáticas en todos los micro-servicios: autenticación JWT, emisión de comprobantes, reserva de inventario y colas de Redis Streams.
- **Paso 3:** Observa la barra de salud y el indicador verde de cada contenedor (Ventas, Inventario, Facturación, Redis Streams).

💡 **Consejo Clave:** Realiza esta verificación antes de aperturar turnos masivos o inmediatamente después de aplicar una actualización en el servidor.`,
      },

      // 3. API & DevOps - Topología y Contenedores
      {
        id: 'devops_topology',
        screens: ['devops', 'admin devops'],
        phrases: ['topologia del sistema', 'tabla de contenedores', 'docker compose ps', 'cluster sano', 'servicios docker'],
        keywords: ['contenedores', 'topologia', 'cluster', 'servicios', 'ram', 'cpu', 'docker', 'compose', 'uptime', 'memoria'],
        content: `🎯 **Objetivo:** Supervisar la topología del sistema, contenedores Docker y consumo de CPU/RAM.

📋 **Paso a Paso:**
- **Paso 1:** En **API & DevOps**, observa el diagrama interactivo de arquitectura: muestra el flujo desde el cliente -> API Gateway -> micro-servicios -> colas Redis -> base de datos PostgreSQL/SQLite.
- **Paso 2:** Revisa la tabla **Contenedores** (\`docker compose ps\`), actualizada automáticamente cada 4 segundos.
- **Paso 3:** Supervisa las columnas de **CPU**, **RAM (MB)** y estado de salud. La insignia verde **cluster sano** certifica que todos los servicios operan óptimamente.

💡 **Regla de Oro:** El backend de FerreMax está altamente optimizado: en un VPS básico de $3.50 a $5/mes consume menos de 600 MB de RAM en total.`,
      },

      // 4. Seguridad - Re-escanear
      {
        id: 'seguridad_rescan',
        screens: ['seguridad', 'admin seguridad', 'security', 'admin security'],
        phrases: ['re escanear', 'boton re escanear', 'escanear seguridad', 'escaneo de seguridad', 'postura de seguridad', '41 controles', 'escanear sistema'],
        keywords: ['seguridad', 'security', 'rescan', 'escanear', 'escaneo', 'scanner', 'postura', 'controles', 'mfa', 'jwt', 'cifrado', 'aes 256', 'boton'],
        content: `🎯 **Objetivo:** Re-escanear y evaluar la postura de seguridad global del sistema.

📋 **Paso a Paso:**
- **Paso 1:** En el menú lateral, abre **Seguridad**.
- **Paso 2:** Haz clic en el botón superior **[ 🔄 Re-escanear ]**.
- **Paso 3:** El sistema evaluará en vivo los 41 controles:
  - Cifrado en tránsito HTTPS/TLS 1.3 y cabeceras de blindaje (CSP, HSTS, X-Frame).
  - Cifrado de contraseñas con bcrypt (costo 12).
  - Tokens de acceso JWT rotativos de 15 minutos.
  - Rate limiting por IP y por usuario (prevención de ataques de fuerza bruta).
  - Consultas SQL 100% parametrizadas (prevención de inyección SQL).
- **Paso 4:** Observa el velocímetro circular con el puntaje de postura (Sólida: >90/100).

💡 **Consejo Clave:** Realiza este escaneo periódicamente para auditar la integridad de tu servidor.`,
      },

      // 5. Seguridad - Pentest
      {
        id: 'seguridad_pentest',
        screens: ['seguridad', 'admin seguridad', 'security', 'admin security'],
        phrases: ['solicitar pentest', 'boton pentest', 'pruebas de penetracion', 'para que sirve el pentest', 'hacer pentest', 'pentest'],
        keywords: ['pentest', 'pentesting', 'penetracion', 'ataque', 'vulnerabilidades', 'auditoria externa', 'auditoria'],
        content: `🎯 **Objetivo:** Para qué sirve el botón **[ 🛡️ Solicitar pentest ]** en Seguridad.

📋 **Paso a Paso:**
- **Paso 1:** En la pantalla **Seguridad**, haz clic en el botón azul **[ 🛡️ Solicitar pentest ]**.
- **Paso 2:** Esta acción programa una solicitud formal de auditoría de seguridad ofensiva para evaluar defensas ante intentos simulados de intrusión en un entorno controlado.
- **Paso 3:** El sistema notifica la solicitud y genera un ticket de seguimiento administrativo.

💡 **Regla de Oro:** La mejor defensa es la prevención: nunca compartas tu contraseña de Administrador ni uses la misma clave para distintos empleados.`,
      },

      // 6. Reportes
      {
        id: 'reportes',
        screens: ['reportes', 'admin reportes', 'reports', 'admin reports'],
        phrases: ['generar reporte', 'imprimir pdf', 'exportar reporte', 'reporte de ventas', 'mas vendidos', 'inventario valuado'],
        keywords: ['reportes', 'reporte', 'reports', 'generar', 'periodo', 'fechas', 'csv', 'pdf', 'grafica'],
        content: `🎯 **Objetivo:** Generar, exportar e imprimir reportes comerciales y contables.

📋 **Paso a Paso:**
- **Paso 1:** En el menú lateral, haz clic en **Reportes**.
- **Paso 2:** Selecciona el **Tipo de reporte**: *Ventas por período*, *Productos más vendidos*, *Inventario valuado*, *Cuentas por cobrar* o *Márgenes por categoría*.
- **Paso 3:** Selecciona el rango de fechas (*Desde* y *Hasta*) y la escala temporal (*Día, Semana, Mes*).
- **Paso 4:** Haz clic en el botón morado **[ ✨ Generar ]**.
- **Paso 5:** Para descargar a Excel, presiona **[ Exportar CSV ]**; para imprimir o guardar en PDF formal, presiona **[ Imprimir / PDF ]**.

💡 **Consejo Clave:** Los reportes consultan los datos consolidados en tiempo real con una caché de alta velocidad (60s) para no saturar la base de datos durante horas de venta intensa.`,
      },

      // 7. Marketing & Cupones
      {
        id: 'marketing',
        screens: ['marketing', 'admin marketing'],
        phrases: ['nuevo cupon', 'crear cupon', 'campana de email', 'automatizaciones de marketing', 'carrito abandonado'],
        keywords: ['marketing', 'cupon', 'cupones', 'descuento', 'promocion', 'campana', 'automatizacion'],
        content: `🎯 **Objetivo:** Crear cupones de descuento y gestionar automatizaciones de marketing.

📋 **Paso a Paso:**
- **Paso 1:** En el menú lateral, abre **Marketing**.
- **Paso 2:** Haz clic en el botón azul superior **[ ➕ Nuevo cupón ]**.
- **Paso 3:** Escribe el código en mayúsculas (ej: \`FERRE10\`), el porcentaje o monto fijo de descuento y el monto mínimo de compra.
- **Paso 4:** Presiona **[ Crear Cupón ]**. Estará activo de inmediato tanto en el Punto de Venta (POS) como en la Tienda Online.
- **Paso 5:** En la sección **Automatizaciones**, puedes activar con 1 clic recordatorios automáticos de Carrito Abandonado por WhatsApp y correos de bienvenida.

💡 **Regla de Oro:** Puedes activar o pausar cualquier cupón al instante usando el interruptor deslizante de la columna *Activo*.`,
      },

      // 8. Inventario - Nuevo Producto
      {
        id: 'inv_nuevo_prod',
        screens: ['inventario', 'admin inventario'],
        phrases: ['nuevo producto', 'crear producto', 'registrar producto', 'agregar producto', 'agregar sku', 'redactar con ia'],
        keywords: ['producto', 'nuevo producto', 'inventario', 'sku', 'costo', 'precio', 'margen', 'stock'],
        content: `🎯 **Objetivo:** Registrar un nuevo producto con precio, costo, stock y código de barras.

📋 **Paso a Paso:**
- **Paso 1:** En el menú lateral, haz clic en **Inventario**.
- **Paso 2:** Presiona el botón azul **[ ➕ Nuevo producto ]**.
- **Paso 3:** Ingresa el nombre del producto, la categoría correspondiente y el código SKU o código de barras del fabricante.
- **Paso 4:** Establece el **Costo ($)** y el **Precio de Venta ($)** en dólares. El sistema calcula automáticamente el margen de ganancia porcentual.
- **Paso 5:** Ingresa el **Stock Actual** y el **Stock Mínimo** de seguridad.
- **Paso 6:** Presiona **[ Guardar Producto ]**. Se reflejará de inmediato en el POS de caja y en la Tienda Online.

💡 **Consejo Clave:** Si tienes configurado Google Gemini, presiona **[ ✨ Redactar con IA ]** para generar automáticamente la ficha técnica comercial y beneficios del producto.`,
      },

      // 9. Inventario - Stock Bajo y Reorden
      {
        id: 'inv_stock_reorden',
        screens: ['inventario', 'admin inventario'],
        phrases: ['stock bajo', 'agotado', 'reabastecer', 'reorden', 'proveedor', 'orden de compra', 'merma', 'ajustar stock'],
        keywords: ['stock bajo', 'agotado', 'reorden', 'existencia', 'ajuste', 'merma', 'oc'],
        content: `🎯 **Objetivo:** Controlar existencias bajas, registrar ajustes de stock y generar órdenes de compra.

📋 **Paso a Paso:**
- **Paso 1:** En la pantalla **Inventario**, usa el selector de filtro superior y elige **Stock bajo** o **Agotado**.
- **Paso 2:** En la tabla inferior **Órdenes de compra sugeridas**, el sistema calcula las unidades a pedir basándose en el punto de reorden y tiempo de entrega del proveedor.
- **Paso 3:** Para sumar mercancía recibida o descontar mermas/roturas, usa los botones directos **[+]** y **[-]** en la fila del producto.
- **Paso 4:** Presiona el botón verde **[ Ordenar XX ]** para generar la solicitud al proveedor correspondiente.

💡 **Regla de Oro:** Mantén los stocks mínimos bien configurados para que el sistema te alerte antes de que te quedes sin mercancía en mostrador.`,
      },

      // 10. Ventas POS - Venta en Mostrador
      {
        id: 'pos_venta',
        screens: ['pos', 'admin pos'],
        phrases: ['vender mostrador', 'como vendo', 'cobrar ticket', 'nueva venta', 'abrir caja', 'hacer una venta', 'boton verde cobrar'],
        keywords: ['vender', 'pos', 'mostrador', 'ticket', 'caja', 'carrito', 'cajero', 'cobrar'],
        content: `🎯 **Objetivo:** Realizar una venta en el Punto de Venta (POS) y cobrar al cliente.

📋 **Paso a Paso:**
- **Paso 1:** En el menú lateral, abre **Ventas POS**.
- **Paso 2:** Agrega productos escaneando con la pistola lectora de código de barras o escribiendo en el buscador superior \`[ 🔍 Buscar por nombre o SKU (F2) ]\`.
- **Paso 3:** Observa el ticket en la columna derecha. Ajusta las cantidades con los botones \`[+]\` y \`[-]\`.
- **Paso 4:** Haz clic en el botón verde inferior **[ Cobrar Ticket ]** (o presiona F4).
- **Paso 5:** Selecciona la forma de pago elegida por el cliente (*Efectivo USD*, *Pago Móvil*, *Punto Débito*, *Crédito Fiado* o *Multipago*).
- **Paso 6:** Presiona **[ Confirmar Pago ]** y envía el comprobante digital por **WhatsApp** o descárgalo en **PNG/PDF**.

💡 **Regla de Oro:** Todos los precios se expresan en Dólares ($) con conversión automática a Bolívares en vivo a la tasa oficial BCV.`,
      },

      // 11. Ventas POS - Crédito / Fiado
      {
        id: 'pos_credito',
        screens: ['pos', 'admin pos', 'clientes', 'admin clientes'],
        phrases: ['venta a credito', 'venta fiada', 'vender fiado', 'credito comercial', 'a cuenta', 'fiar'],
        keywords: ['fiado', 'fiar', 'credito', 'cuenta', 'cupo', 'limite', 'deuda'],
        content: `🎯 **Objetivo:** Registrar una venta a Crédito Comercial ("Fiado / A Cuenta") en el Punto de Venta.

📋 **Paso a Paso:**
- **Paso 1 (Identificar al Cliente):** En la parte superior del Ticket de Venta, haz clic en el selector de cliente y busca al cliente por su cédula o nombre. Debe estar registrado previamente.
- **Paso 2 (Verificar Cupo):** Observa los datos del cliente en pantalla: verás su *Límite Autorizado*, su *Deuda Actual* y su *Saldo Disponible*. La compra no puede superar su disponible.
- **Paso 3 (Seleccionar Método):** Agrega los productos al ticket y presiona el botón verde **[ Cobrar Ticket ]**.
- **Paso 4 (Confirmar Crédito):** En la ventana de cobro, selecciona la opción **Crédito Comercial (Fiado)** y presiona **Confirmar Venta**.
- **Paso 5 (Comprobante):** Haz clic en **[ Enviar por WhatsApp ]** para que el cliente reciba el comprobante digital de su compra a crédito con su nuevo saldo deudor y fecha límite de pago.

💡 **Regla de Oro:** Si el cliente no tiene cupo suficiente, el sistema bloqueará la venta automáticamente para proteger las finanzas de la empresa.`,
      },

      // 12. Clientes & CxC - Abonos
      {
        id: 'clientes_abonos',
        screens: ['clientes', 'admin clientes', 'pos', 'admin pos'],
        phrases: ['registrar abono', 'recibo de abono', 'recibo abo', 'cobrar deuda', 'abonar cuenta', 'pago de cliente'],
        keywords: ['abono', 'abonar', 'deuda', 'cobrar', 'recibo', 'abo', 'cobranza', 'estado de cuenta'],
        content: `🎯 **Objetivo:** Registrar un Abono de un cliente para rebajar o cancelar su deuda comercial.

📋 **Paso a Paso:**
- **Paso 1:** En el menú lateral, haz clic en **Clientes & CxC** (Cuentas por Cobrar).
- **Paso 2:** Busca al cliente en la lista por su nombre o cédula.
- **Paso 3:** Haz clic en el botón azul **[ 💵 Registrar Abono ]**.
- **Paso 4:** En la ventana emergente, escribe cuánto abona el cliente en dólares ($ USD). El sistema calcula el equivalente en Bolívares en vivo a la tasa BCV del día.
- **Paso 5:** Selecciona cómo pagó (*Pago Móvil, Punto Débito, Efectivo USD, etc.*) y escribe el número de referencia bancaria.
- **Paso 6:** Presiona **[ Guardar y Emitir Recibo de Abono ]**. Se generará el folio secuencial oficial \`ABO-xxxx\`.
- **Paso 7:** Haz clic en **[ Enviar por WhatsApp ]** para que el cliente reciba su comprobante de saldo actualizado al instante.

💡 **Consejo Clave:** Puedes registrar abonos parciales o la totalidad de la deuda. El cupo disponible del cliente se libera inmediatamente en todo el sistema.`,
      },

      // 13. Facturación / POS - Corte X
      {
        id: 'corte_x',
        screens: ['pos', 'admin pos', 'facturacion', 'admin facturacion'],
        phrases: ['corte x', 'auditoria en vivo', 'mitad de turno', 'corte caja x'],
        keywords: ['corte x', 'auditoria', 'balance turno', 'revisar caja', 'sin cerrar'],
        content: `🎯 **Objetivo:** Consultar el total vendido a mitad de turno (Corte X) sin cerrar la caja.

📋 **Paso a Paso:**
- **Paso 1:** En la pantalla **Ventas POS**, haz clic en el botón superior **[ Corte X (Auditoría) ]** (o ve a Facturación -> pestaña Cortes).
- **Paso 2:** Verás en pantalla el resumen consolidado de las ventas del turno hasta ese momento: total en USD, total en Bs. y desglose por cada método de cobro (Efectivo, Pago Móvil, Punto, Fiado).
- **Paso 3:** Puedes imprimirlo o cerrarlo. La caja continuará abierta operando con total normalidad.

💡 **Consejo Clave:** El Corte X no altera números ni resetea la caja; es 100% informativo y puedes consultarlo tantas veces al día como desees.`,
      },

      // 14. Facturación / POS - Corte Z
      {
        id: 'corte_z',
        screens: ['pos', 'admin pos', 'facturacion', 'admin facturacion'],
        phrases: ['corte z', 'cierre de turno', 'cierre de caja', 'arqueo fisico', 'descuadre de caja', 'gaveta'],
        keywords: ['corte z', 'cierre', 'cerrar caja', 'arqueo', 'gaveta', 'faltante', 'sobrante', 'contar dinero'],
        content: `🎯 **Objetivo:** Realizar el Cierre de Turno Definitivo (Corte Z) con arqueo físico de gaveta.

📋 **Paso a Paso:**
- **Paso 1:** En la pantalla **Ventas POS**, haz clic en el botón superior **[ Cierre de Caja (Corte Z) ]**.
- **Paso 2 (Contar el dinero físico):** Cuenta los billetes reales en la gaveta y escribe los totales en cada casilla: *Efectivo USD en Gaveta*, *Efectivo Bs. en Gaveta*, *Punto de Venta Declarado* (sumando los vouchers) y *Pago Móvil Declarado*.
- **Paso 3:** Haz clic en **[ Calcular Cuadre de Caja ]**.
- **Paso 4 (Auditoría):** El sistema comparará lo que tú contaste contra lo que registró el sistema:
  - Si coincide exacto: cartel verde de *¡Caja Cuadrada!*.
  - Si hay diferencia: indicará en azul si hay *Sobrante* o en rojo si hay *Faltante*.
- **Paso 5:** Escribe una observación en el campo de notas si hubo alguna novedad y presiona **[ Generar Cierre Definitivo (Corte Z) ]**.
- **Paso 6:** Haz clic en **[ Enviar a WhatsApp ]** para notificar el reporte gerencial a la administración.

💡 **Regla de Oro:** El Corte Z cierra el turno y prepara los acumuladores para el día siguiente. Si solo quieres auditar a mitad de turno sin cerrar la caja, usa el botón **Corte X**.`,
      },

      // 15. POS - Pago Móvil
      {
        id: 'pago_movil',
        screens: ['pos', 'admin pos'],
        phrases: ['pago movil', 'numero de referencia', 'cobrar pago movil', 'referencia bancaria'],
        keywords: ['pago movil', 'referencia', 'banco', 'telefono', 'cedula', 'bolivares', 'transferencia'],
        content: `🎯 **Objetivo:** Cobrar una venta mediante Pago Móvil de forma segura.

📋 **Paso a Paso:**
- **Paso 1:** Agrega los productos al ticket y presiona **[ Cobrar Ticket ]**.
- **Paso 2:** Selecciona la pestaña **Pago Móvil**. En pantalla aparecerán los datos de la empresa (Banco, Teléfono y Cédula/RIF) para dictárselos al cliente.
- **Paso 3:** Solicita al cliente su comprobante en su teléfono y anota los últimos 4 a 6 dígitos en la casilla obligatoria *N° de Referencia*.
- **Paso 4:** Verifica que el dinero haya ingresado en la cuenta bancaria de la tienda.
- **Paso 5:** Presiona **[ Confirmar Venta ]** y entrega la nota de entrega o envíasela a su WhatsApp.

💡 **Regla de Oro:** Nunca entregues mercancía sin verificar que la referencia bancaria sea correcta y corresponda al monto exacto en bolívares calculado por el sistema.`,
      },

      // 16. POS - Efectivo USD e IGTF
      {
        id: 'efectivo_igtf',
        screens: ['pos', 'admin pos'],
        phrases: ['efectivo usd', 'efectivo dolares', 'cobrar efectivo', 'calcular igtf', 'dar vuelto', 'vuelto en dolares'],
        keywords: ['efectivo', 'dolar', 'dolares', 'usd', 'igtf', 'vuelto', 'cambio', 'multipago'],
        content: `🎯 **Objetivo:** Cobrar en Efectivo Dólares (USD) con cálculo automático de IGTF y vuelto.

📋 **Paso a Paso:**
- **Paso 1:** Haz clic en **[ Cobrar Ticket ]** y selecciona **Efectivo USD**.
- **Paso 2:** El sistema aplicará automáticamente el **3% de IGTF** sobre el monto en divisas según la ley venezolana.
- **Paso 3:** En la casilla *Monto Recibido*, escribe el valor del billete entregado por el cliente (ej: si son $15.45 y entrega $20, escribe \`20\`).
- **Paso 4:** Observa el monto resaltado en verde: **Vuelto a entregar**. Puedes entregarlo en dólares o en bolívares según la disponibilidad de tu caja.
- **Paso 5:** Haz clic en **[ Confirmar Venta ]**.

💡 **Consejo Clave:** Si el cliente desea pagar parte en dólares y parte en bolívares, selecciona la opción **Pago Mixto / Multipago**.`,
      },

      // 17. Tasa BCV
      {
        id: 'tasa_bcv',
        screens: ['ajustes', 'admin ajustes', 'pos', 'admin pos'],
        phrases: ['tasa bcv', 'tasa del dolar', 'cambiar tasa', 'sincronizar tasa', 'banco central'],
        keywords: ['bcv', 'tasa', 'dolar', 'oficial', 'cambio', 'bolivares'],
        content: `🎯 **Objetivo:** Actualizar la Tasa Oficial del Dólar BCV en el sistema.

📋 **Paso a Paso:**
- **Paso 1:** Haz clic directamente sobre el indicador de tasa en la barra superior (\`BCV: Bs. XX.XX\`) o ve a **Ajustes -> Tasa BCV**.
- **Paso 2 (Automático):** Presiona el botón azul **[ Sincronizar Tasa Oficial Ahora ]**. El sistema consultará el valor oficial publicado por el BCV.
- **Paso 3 (Manual - Opcional):** Si la web del BCV presenta fallas, escribe el monto numérico en la casilla y presiona **[ Fijar Tasa Manual ]**.
- **Paso 4:** Todos los precios en bolívares de todo el sistema y la tienda online se actualizarán inmediatamente.

💡 **Regla de Oro:** Todos los precios maestros están en dólares ($), por lo que actualizar la tasa jamás descuadra tus ganancias ni tus inventarios.`,
      },

      // 18. Ajustes - Respaldos de Base de Datos
      {
        id: 'respaldos_db',
        screens: ['ajustes', 'admin ajustes'],
        phrases: ['descargar respaldo', 'descargar base de datos', 'crear snapshot', 'restaurar base de datos', 'copia de seguridad'],
        keywords: ['respaldo', 'backup', 'db', 'snapshot', 'restaurar', 'sqlite', 'descargar'],
        content: `🎯 **Objetivo:** Descargar una copia de seguridad completa de la base de datos a tu computadora.

📋 **Paso a Paso:**
- **Paso 1:** Inicia sesión como Administrador y ve a **Ajustes**.
- **Paso 2:** En la tarjeta **Centro de Respaldos y Seguridad**, haz clic en el botón verde **[ 💾 Descargar Base de Datos (.db) ]**.
- **Paso 3:** En 2 segundos se descargará a tu computadora un archivo con fecha (ej: \`FerreMax_Respaldo_2026-10-17.db\`).
- **Paso 4:** Guarda ese archivo en un pendrive o en tu nube personal (Google Drive / Dropbox).

💡 **Regla de Oro:** Contiene toda la información de tu negocio (productos, precios, clientes, ventas, abonos y usuarios). Descárgalo semanalmente para máxima tranquilidad.`,
      },

      // 19. Ajustes - Puesta a Cero de Operaciones
      {
        id: 'puesta_a_cero',
        screens: ['ajustes', 'admin ajustes'],
        phrases: ['puesta a cero', 'finalizar pruebas', 'limpiar operaciones', 'borrar ventas falsas', 'reiniciar a 1', 'arrancar desde cero'],
        keywords: ['puesta a cero', 'limpiar', 'cero', 'pruebas', 'reiniciar', 'folio 1', 'arrancar'],
        content: `🎯 **Objetivo:** Poner el sistema a cero tras el período de pruebas para arrancar formalmente las operaciones del negocio.

📋 **Paso a Paso:**
- **Paso 1:** Inicia sesión con cuenta de Administrador y ve a **Ajustes -> Centro de Respaldos**.
- **Paso 2:** En el recuadro destacado de color rojo, presiona el botón **[ 🧹 Finalizar Pruebas y Poner a Cero ]**.
- **Paso 3:** Selecciona el alcance: **Limpieza Operativa (Recomendada)** para borrar únicamente ventas falsas, recibos y cortes ficticios, manteniendo tus productos, bancos, logotipo y empleados.
- **Paso 4 (Opcional):** Si lo deseas, marca las casillas para vaciar también clientes de prueba o poner el stock en 0 para conteo físico inicial.
- **Paso 5:** Ingresa tu contraseña de Administrador para autorizar la operación y presiona **[ Confirmar y Poner Sistema a Cero ]**.
- **Paso 6:** El sistema creará un respaldo automático preventivo en el servidor antes de purgar nada y reiniciará tus correlativos al folio #000001.

💡 **Regla de Oro:** Tu configuración corporativa, bancos de pago móvil y catálogo de productos quedan 100% protegidos e intactos.`,
      },

      // 20. Ajustes - Marca Blanca y Logotipo
      {
        id: 'marca_blanca',
        screens: ['ajustes', 'admin ajustes'],
        phrases: ['marca blanca', 'logotipo de la empresa', 'subir logo', 'cambiar logo', 'colores de marca', 'nombre comercial'],
        keywords: ['logotipo', 'logo', 'colores', 'marca', 'eslogan', 'blanca', 'personalizar'],
        content: `🎯 **Objetivo:** Personalizar el sistema con el logotipo, colores corporativos y nombre de tu ferretería.

📋 **Paso a Paso:**
- **Paso 1:** Ve a la pantalla **Ajustes** con tu usuario Administrador.
- **Paso 2:** En la sección **🎨 Identidad Corporativa y Marca Blanca**, escribe el nombre comercial y eslogan de tu negocio.
- **Paso 3:** Presiona **[ Subir Imagen de Logo ]** y selecciona tu archivo PNG o JPG.
- **Paso 4:** Elige tu **Color Primario** (para botones principales y encabezados) y tu **Color Secundario** (para contraste y etiquetas), o haz clic en cualquiera de las paletas industriales recomendadas.
- **Paso 5:** Haz clic en el botón azul superior **[ ✔️ Guardar cambios en servidor ]**.

💡 **Regla de Oro:** Todos los comprobantes digitales, tickets, barra superior y tienda online se visten automáticamente con tus colores de marca en tiempo real.`,
      },

      // 21. Ajustes - Empleados y Roles
      {
        id: 'empleados_roles',
        screens: ['ajustes', 'admin ajustes'],
        phrases: ['nuevo empleado', 'crear usuario', 'matriz de roles', 'permisos por pantalla', 'rbac', 'bloqueo de pantalla'],
        keywords: ['empleado', 'empleados', 'usuario', 'usuarios', 'roles', 'permisos', 'rbac', 'cajero', 'almacen'],
        content: `🎯 **Objetivo:** Registrar un nuevo empleado y asignarle su rol de trabajo en el sistema.

📋 **Paso a Paso:**
- **Paso 1:** En la pantalla **Ajustes**, dirígete a la columna derecha en **👥 Personal y Empleados**.
- **Paso 2:** Haz clic en el botón azul **[ ➕ Nuevo Empleado ]**.
- **Paso 3:** Escribe su nombre, correo de acceso, teléfono y asigna una contraseña inicial segura.
- **Paso 4:** Selecciona el **Rol** de trabajo:
  - **Cajero (CASHIER):** Acceso restringido al Punto de Venta (POS) y comprobantes de entrega.
  - **Almacén (WAREHOUSE):** Acceso al Inventario, entradas/salidas y pedidos de stock.
  - **Contador (ACCOUNTANT):** Acceso a Facturación, Cortes Z, CxC y Reportes contables.
  - **Administrador (ADMIN):** Acceso completo al sistema y configuraciones.
- **Paso 5:** Presiona **[ Guardar Empleado ]**.

💡 **Regla de Oro:** Si un empleado intenta acceder a una sección no autorizada para su rol, el sistema desplegará automáticamente la pantalla de seguridad con acceso denegado (RBAC).`,
      },

      // 22. Ajustes - Configuración Gemini AI
      {
        id: 'gemini_config',
        screens: ['ajustes', 'admin ajustes'],
        phrases: ['configurar gemini', 'clave de api', 'api key', 'activar ia', 'google gemini gratis'],
        keywords: ['gemini', 'clave', 'api key', 'inteligencia artificial', 'ai studio', 'copiloto'],
        content: `🎯 **Objetivo:** Activar Google Gemini AI para el Asistente Redactor de Productos y el Copiloto Inteligente.

📋 **Paso a Paso:**
- **Paso 1:** Ve a la web oficial gratuita de Google: **https://aistudio.google.com/app/apikey** e inicia sesión con cualquier cuenta Google (Gmail).
- **Paso 2:** Haz clic en **Create API key** y copia la clave generada (empieza por \`AIzaSy...\`).
- **Paso 3:** En el sistema FerreMax, ve a **Ajustes** y busca la tarjeta **✨ Inteligencia Artificial · Google Gemini**.
- **Paso 4:** Pega tu clave en la casilla *API Key de Google Gemini* y presiona **[ Probar Conexión ]**.
- **Paso 5:** Cuando aparezca el cartel verde de conexión exitosa, haz clic en **[ Guardar Clave ]**.

💡 **Consejo Clave:** Google AI Studio ofrece un nivel 100% gratuito que no requiere tarjeta de crédito y es más que suficiente para miles de consultas mensuales.`,
      },
    ];

    // Algoritmo de ponderación y coincidencia semántica
    let bestArticle: HelpItem | null = null;
    let highestScore = 0;

    for (const art of ARTICLES) {
      let score = 0;

      // 1. Bonificación por coincidencia con la pantalla actual del usuario
      const screenMatches = art.screens.some(sc => screen.includes(sc) || sc.includes(screen));
      if (screenMatches) {
        score += 25;
      }

      // 2. Bonificación por preguntas sobre botones o funciones en la pantalla actual
      if (screenMatches && (q.includes('boton') || q.includes('para que sirve') || q.includes('que hace') || q.includes('como funciona'))) {
        score += 35;
      }

      // 3. Coincidencia de frases exactas
      for (const phrase of art.phrases) {
        const normPhrase = norm(phrase);
        if (q.includes(normPhrase)) {
          score += 45;
        }
      }

      // 4. Coincidencia de palabras clave (exactas y por raíz/prefijo de 4+ caracteres)
      for (const kw of art.keywords) {
        const normKw = norm(kw);
        if (tokens.includes(normKw) || q.includes(normKw)) {
          score += 18;
          continue;
        }
        if (normKw.length >= 4) {
          const stem = normKw.slice(0, 5);
          if (tokens.some(t => t.startsWith(stem) || (t.length >= 4 && stem.startsWith(t.slice(0, 4))))) {
            score += 12;
          }
        }
      }

      if (score > highestScore) {
        highestScore = score;
        bestArticle = art;
      }
    }

    if (bestArticle && highestScore >= 18) {
      return bestArticle.content;
    }

    // Si no hubo coincidencia alta pero conocemos la pantalla actual, ofrecer ayuda guiada de la pantalla
    if (screen.includes('devops')) {
      return ARTICLES[0].content; // Guía de DevOps
    }
    if (screen.includes('seguridad') || screen.includes('security')) {
      return ARTICLES[3].content; // Guía de Seguridad
    }
    if (screen.includes('reportes') || screen.includes('reports')) {
      return ARTICLES[5].content; // Guía de Reportes
    }
    if (screen.includes('marketing')) {
      return ARTICLES[6].content; // Guía de Marketing
    }
    if (screen.includes('inventario') || screen.includes('inventory')) {
      return ARTICLES[7].content; // Guía de Inventario
    }
    if (screen.includes('clientes') || screen.includes('customers')) {
      return ARTICLES[11].content; // Guía de Clientes & Abonos
    }
    if (screen.includes('pos') || screen.includes('ventas')) {
      return ARTICLES[9].content; // Guía de Ventas POS
    }
    if (screen.includes('facturacion') || screen.includes('billing')) {
      return ARTICLES[13].content; // Guía de Cortes X y Z
    }
    if (screen.includes('ajustes') || screen.includes('settings')) {
      return ARTICLES[17].content; // Guía de Respaldos
    }

    // Directorio de ayuda general de contingencia
    return `🎯 **Objetivo:** Directorio del Manual Operativo FerreMax (Modo Local).

📋 **Temas Rápidos Disponibles (Escribe cualquiera en el buscador):**
- **Ventas & Caja:** *"¿cómo vendo en mostrador?"*, *"¿cómo vendo fiado?"*, *"pago móvil"*, *"efectivo dólares e IGTF"*, *"corte X"*, *"corte Z"*.
- **Clientes & Crédito:** *"registrar abono"*, *"límite de crédito"*, *"recibo ABO"*, *"estado de cuenta"*.
- **Inventario:** *"crear nuevo producto"*, *"stock bajo"*, *"ajuste de inventario"*, *"órdenes de compra sugeridas"*.
- **Administración & Respaldo:** *"descargar respaldo .db"*, *"puesta a cero de operaciones"*, *"cambiar logotipo"*, *"crear empleado"*, *"tasa BCV"*.
- **Técnico & DevOps:** *"desplegar módulo"*, *"botón verde en devops"*, *"pruebas E2E"*, *"re-escanear seguridad"*.

💡 **Consejo:** También puedes activar la **IA Google Gemini gratis** en **Ajustes -> Inteligencia Artificial** para hacer preguntas en lenguaje conversacional abierto.`;
  }
}

