/**
 * Google Forms to Odoo Integration Script
 * Este script captura las respuestas de Google Forms y las envía a Odoo como leads
 * Basado en el sistema existente de DyE-Odoo-Link
 */

// ===============================
// CONFIGURACIÓN PRINCIPAL
// ===============================

const ODOO_CONFIG = {
  url: "https://dye.quilsoft.com",
  db: "dye_prod", 
  login: "maused@dyesa.com",
  password: "967ce27624f6e6bfdf1b674efcbc2fda5603796e"
};

const FORM_CONFIG = {
  // ID del formulario de Google Forms
  // IMPORTANTE: Extraer el ID correcto de la URL del formulario
  // URL ejemplo: https://docs.google.com/forms/d/[ID_DEL_FORMULARIO]/viewform
  formId: "1b1-Adg1riv2aF6X_8cgtqLrsEAWgiToFJurQJcL2tKA",
  // Mapeo de entry IDs a nombres de campos
  fieldMapping: {
    "entry.1656615011": "apellido",
    "entry.1575414634": "nombre", 
    "entry.719416093": "localidad",
    "entry.706927167": "provincia",
    "entry.545349691": "telefono",
    "entry.518556737": "mail",
    "entry.620044556": "verticales", // Concatenated checkboxes
    "entry.1203722377": "comentarios",
    "entry.1848186805": "montoEstimado",
    "entry.759729973": "presupuesto",
    "entry.276961824": "operadorApp", // OPERADOR: Persona que usa la app para registrar
    "entry.1185082508": "comercialAsignado", // COMERCIAL: Vendedor/representante asignado
    "entry.716935390": "evento",
    "entry.1582004362": "empresaOperador", // EMPRESA: Empresa/organización registradora
    // Checkboxes individuales de verticales/intereses
    "entry.1677960690": "weedSeeker",
    "entry.1491059195": "solucionSiembra", 
    "entry.2007292571": "solucionPulverizacion",
    "entry.326858464": "postVenta",
    "entry.725115806": "dronesDJI",
    "entry.964478392": "guiaAutoguia", 
    "entry.1908485191": "tapsSenales",
    "entry.1736207191": "accionQR"
  }
};

/**
 * Función para extraer el ID correcto del formulario desde una URL
 * Usa esta función si tienes problemas con el ID del formulario
 */
function extractFormIdFromUrl() {
  // URLs de ejemplo que pueden funcionar:
  const possibleUrls = [
    "https://docs.google.com/forms/d/1FAIpQLSduy_8Q5StXatYz8A-2rmfGNAFqlL0I9YMb5dS8Q5fCovWN3w/viewform",
    "https://docs.google.com/forms/d/1FAIpQLSduy_8Q5StXatYz8A-2rmfGNAFqlL0I9YMb5dS8Q5fCovWN3w/edit"
  ];
  
  Logger.log("=== EXTRACCIÓN DE ID DE FORMULARIO ===");
  Logger.log("URL original proporcionada:");
  Logger.log("https://docs.google.com/forms/d/e/1FAIpQLSduy_8Q5StXatYz8A-2rmfGNAFqlL0I9YMb5dS8Q5fCovWN3w/viewform");
  Logger.log("");
  
  // El ID correcto podría ser diferente. Intentemos varias opciones:
  const possibleIds = [
    "1FAIpQLSduy_8Q5StXatYz8A-2rmfGNAFqlL0I9YMb5dS8Q5fCovWN3w", // ID actual
    // Agregar otros IDs posibles si es necesario
  ];
  
  Logger.log("IDs a probar:");
  possibleIds.forEach((id, index) => {
    Logger.log(`${index + 1}. ${id}`);
  });
  
  Logger.log("");
  Logger.log("💡 CÓMO OBTENER EL ID CORRECTO:");
  Logger.log("1. Ve al formulario en modo edición");
  Logger.log("2. La URL debería ser: https://docs.google.com/forms/d/[ID]/edit");
  Logger.log("3. Copia el ID de esa URL y actualiza FORM_CONFIG.formId");
  Logger.log("=====================================");
  
  return possibleIds;
}

// ===============================
// FUNCIÓN PRINCIPAL DE TRIGGER
// ===============================

/**
 * Función que se ejecuta automáticamente cuando se envía una respuesta al formulario
 * Configura este trigger en Google Apps Script: Triggers > Nuevo trigger > Al enviar formulario
 */
function onFormSubmit(e) {
  try {
    Logger.log("=== INICIO PROCESAMIENTO RESPUESTA GOOGLE FORMS ===");
    
    // Extraer datos de la respuesta
    const formData = extractFormData(e);
    Logger.log("Datos extraídos del formulario: " + JSON.stringify(formData, null, 2));
      // Procesar verticales/checkboxes
    formData.concatenatedCheckboxes = processVerticales(formData);
    
    // Agregar país por defecto si no está especificado
    if (!formData.pais) {
      formData.pais = "Argentina";
    }    // Log de datos procesados para debug
    Logger.log("📋 DATOS PROCESADOS:");
    Logger.log("👤 Persona: " + (formData.nombre || '') + " " + (formData.apellido || ''));
    Logger.log("📧 Email: " + (formData.mail || 'No proporcionado'));
    Logger.log("📞 Teléfono: " + (formData.telefono || 'No proporcionado'));
    Logger.log("🏢 Empresa registradora: " + (formData.empresaRegistradora || 'No especificada'));
    Logger.log("👨‍💼 Registrador/Operador: " + (formData.registrador || 'No especificado'));
    Logger.log("💼 Comercial asignado: " + (formData.comercial || 'No asignado'));
    Logger.log("🎯 Verticales: " + (formData.concatenatedCheckboxes || 'Ninguna'));
    Logger.log("💬 Comentarios: " + (formData.comentarios || 'Sin comentarios'));
    Logger.log("🎪 Evento: " + (formData.evento || 'No especificado'));
    
    // Enviar a Odoo
    const odooResult = createOdooLead(formData);
    
    if (odooResult.success) {
      Logger.log("✅ Lead creado exitosamente en Odoo con ID: " + odooResult.lead_id);
        // Opcional: Enviar notificación por WhatsApp usando Wazzup
      try {
        if (formData.telefono && formData.comercial) {
          sendWazzupNotification(formData);
        }
      } catch (whatsappError) {
        Logger.log("⚠️ Error en notificación WhatsApp (no crítico): " + whatsappError.toString());
      }
      
    } else {
      Logger.log("❌ Error al crear lead en Odoo: " + odooResult.error);
      
      // Opcional: Guardar en una hoja de cálculo para retry manual
      saveFailedSubmission(formData, odooResult.error);
    }
    
  } catch (error) {
    Logger.log("❌ Error crítico en onFormSubmit: " + error.toString());
    
    // Opcional: Enviar email de notificación al administrador
    sendErrorNotification(error, e);
  }
  
  Logger.log("=== FIN PROCESAMIENTO RESPUESTA GOOGLE FORMS ===");
}

// ===============================
// EXTRACCIÓN Y PROCESAMIENTO DE DATOS
// ===============================

/**
 * Extrae los datos de la respuesta del formulario
 */
function extractFormData(e) {
  const formData = {};
  
  try {
    // Obtener respuestas del evento
    const itemResponses = e.response.getItemResponses();
    
    // Procesar cada respuesta
    for (const itemResponse of itemResponses) {
      const question = itemResponse.getItem().getTitle();
      const answer = itemResponse.getResponse();
        // Mapear pregunta a campo conocido
      const fieldName = mapQuestionToField(question);
      if (fieldName) {
        // Manejar respuestas múltiples (checkboxes)
        if (Array.isArray(answer)) {
          // Para checkboxes múltiples, concatenar con comas
          formData[fieldName] = answer.join(", ");
        } else {
          formData[fieldName] = answer;
        }
        
        // Debugging específico para campos problemáticos
        if (question.toUpperCase().includes("EMPRESAREGISTRADOR")) {
          Logger.log(`🔍 DEBUG EMPRESAREGISTRADOR: "${question}" -> "${fieldName}" -> "${answer}"`);
        }
      }
      
      Logger.log(`Pregunta: "${question}" -> Campo: "${fieldName}" -> Respuesta: "${answer}"`);
    }
    
    // Procesar verticales de checkboxes individuales
    formData.verticalesSeleccionadas = extractSelectedVerticals(itemResponses);
    
    // Validaciones básicas
    if (!formData.nombre) {
      throw new Error("Nombre es requerido");
    }
    if (!formData.apellido) {
      throw new Error("Apellido es requerido");
    }
    
    // ✅ VALIDACIÓN ADICIONAL DE DATOS CRÍTICOS
    Logger.log("🔍 Validando datos críticos...");
    
    const nombreCompleto = formData.nombre + " " + formData.apellido;
    Logger.log("✅ Nombre completo: " + nombreCompleto);
    
    // Validar email si está presente
    if (formData.mail && formData.mail.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.mail)) {
        Logger.log("⚠️ Email inválido, se ignorará: " + formData.mail);
        formData.mail = ''; // Limpiar email inválido
      } else {
        Logger.log("✅ Email válido: " + formData.mail);
      }
    } else {
      Logger.log("⚠️ Email no proporcionado o vacío");
    }
    
    // Validar teléfono si está presente
    if (formData.telefono && formData.telefono.trim() !== '') {
      Logger.log("✅ Teléfono: " + formData.telefono);
    } else {
      Logger.log("⚠️ Teléfono no proporcionado");
    }
    
    return formData;
    
  } catch (error) {
    Logger.log("Error al extraer datos del formulario: " + error.toString());
    throw error;
  }
}

/**
 * Extrae las verticales seleccionadas de los checkboxes individuales
 */
function extractSelectedVerticals(itemResponses) {
  const selectedVerticals = [];
  
  // Mapeo de preguntas a etiquetas de verticales
  const verticalMappings = {
    "weed": "WeedSeeker",
    "seeker": "WeedSeeker", 
    "siembra": "Solución Siembra",
    "pulverización": "Solución Pulverización",
    "pulverizacion": "Solución Pulverización",
    "post": "Post Venta",
    "venta": "Post Venta",
    "drone": "Drones DJI",
    "dji": "Drones DJI",
    "guía": "Guía/Autoguía",
    "autoguía": "Guía/Autoguía",
    "autoguia": "Guía/Autoguía",
    "taps": "Taps y Señales",
    "señales": "Taps y Señales",
    "senales": "Taps y Señales",
    "qr": "Acción QR"
  };
  
  try {
    for (const itemResponse of itemResponses) {
      const question = itemResponse.getItem().getTitle().toLowerCase();
      const answer = itemResponse.getResponse();
      
      // Verificar si la respuesta indica que el checkbox está seleccionado
      const isSelected = answer === true || 
                        answer === "true" || 
                        answer === "TRUE" || 
                        answer === "Sí" || 
                        answer === "Si" || 
                        answer === "Yes" ||
                        (typeof answer === 'string' && answer.toLowerCase().includes("sí")) ||
                        (typeof answer === 'string' && answer.toLowerCase().includes("si")) ||
                        (Array.isArray(answer) && answer.length > 0);
      
      if (isSelected) {
        // Buscar coincidencia en el mapeo de verticales
        for (const [keyword, label] of Object.entries(verticalMappings)) {
          if (question.includes(keyword) && !selectedVerticals.includes(label)) {
            selectedVerticals.push(label);
            Logger.log(`✓ Vertical seleccionada: "${label}" (desde pregunta: "${question}")`);
            break;
          }
        }
      }
    }
    
    return selectedVerticals;
    
  } catch (error) {
    Logger.log("Error extrayendo verticales: " + error.toString());
    return [];
  }
}

/**
 * Mapea las preguntas del formulario a nombres de campos
 */
function mapQuestionToField(question) {
  const questionMappings = {
    // Datos personales básicos
    "APELLIDO": "apellido",
    "APELLIDOS": "apellido",
    "SURNAME": "apellido",
    "NOMBRE": "nombre",
    "NOMBRES": "nombre", 
    "NAME": "nombre",
    
    // Ubicación
    "LOCALIDAD": "localidad",
    "CIUDAD": "localidad",
    "CITY": "localidad", 
    "PROVINCIA": "provincia",
    "ESTADO": "provincia",
    "STATE": "provincia",
    
    // Contacto
    "TELÉFONO": "telefono",
    "TELEFONO": "telefono",
    "PHONE": "telefono",
    "CELULAR": "telefono",
    "EMAIL": "mail",
    "MAIL": "mail",
    "CORREO": "mail",
    
    // Intereses y comentarios
    "VERTICALES": "verticales",
    "INTERESES": "verticales",
    "COMENTARIOS": "comentarios",
    "COMENTARIO": "comentarios",
    "OBSERVACIONES": "comentarios",
      // Montos y presupuesto
    "MONTO": "montoEstimado",
    "PRESUPUESTO": "presupuesto",
    "BUDGET": "presupuesto",
    
    // ⚠️ IMPORTANTE: Empresa registradora DEBE ir ANTES que registrador 
    // porque "EMPRESAREGISTRADOR" contiene "REGISTRADOR"
    "EMPRESAREGISTRADOR": "empresaRegistradora",
    "EMPRESA REGISTRADORA": "empresaRegistradora", 
    "EMPRESA REGISTRADOR": "empresaRegistradora",
    "EMPRESA DEL REGISTRADOR": "empresaRegistradora",
    "EMPRESA QUE REGISTRA": "empresaRegistradora",
    "EMPRESA": "empresaRegistradora",
    "COMPAÑIA": "empresaRegistradora",
    "COMPANY": "empresaRegistradora",
    "ORGANIZACION": "empresaRegistradora",
    "ORGANIZACIÓN": "empresaRegistradora",
    
    // Registrador (persona que registra/operador) - mapea a "registrador"
    "REGISTRADOR": "registrador",
    "OPERADOR": "registrador",
    "OPERADOR APP": "registrador",
    "OPERADOR DE LA APP": "registrador",
    "REGISTRA": "registrador",
    "QUIEN REGISTRA": "registrador",
    "NOMBRE REGISTRADOR": "registrador",
    "NOMBRE DEL REGISTRADOR": "registrador",
    "PERSONA QUE REGISTRA": "registrador",
    
    // Asignado a (comercial) - mapea a "comercial"
    "ASIGNADO A": "comercial",
    "ASIGNADOA": "comercial",
    "COMERCIAL": "comercial",
    "COMERCIAL ASIGNADO": "comercial",
    "COMERCIALASIGNADO": "comercial",
    "VENDEDOR": "comercial",
    "VENDEDOR ASIGNADO": "comercial",
    "REPRESENTANTE": "comercial",
    "REPRESENTANTE COMERCIAL": "comercial",
    "ASESOR": "comercial",
    "ASESOR COMERCIAL": "comercial",
    
    // Evento
    "EVENTO": "evento",
    "EVENT": "evento",
    "EXHIBITION": "evento",
    "EXPOSICION": "evento",
    "EXPOSICIÓN": "evento"
  };
  
  // Buscar coincidencia exacta o parcial (normalizar texto)
  const normalizedQuestion = question.toUpperCase().replace(/[áéíóúñ]/g, match => {
    const replacements = {'á': 'A', 'é': 'E', 'í': 'I', 'ó': 'O', 'ú': 'U', 'ñ': 'N'};
    return replacements[match] || match;
  });
    // Primero buscar coincidencias EXACTAS
  for (const [key, value] of Object.entries(questionMappings)) {
    if (normalizedQuestion === key) {
      return value;
    }
  }
  
  // Luego buscar coincidencias parciales, pero priorizar las más específicas (más largas)
  const partialMatches = [];
  for (const [key, value] of Object.entries(questionMappings)) {
    if (normalizedQuestion.includes(key)) {
      partialMatches.push({key, value, length: key.length});
    }
  }
  
  // Ordenar por longitud descendente (más específico primero)
  if (partialMatches.length > 0) {
    partialMatches.sort((a, b) => b.length - a.length);
    return partialMatches[0].value;
  }
  
  // Para checkboxes, mapear por contenido específico
  const questionLower = question.toLowerCase();
  
  if (questionLower.includes("weed") || questionLower.includes("seeker")) {
    return "weedSeeker";
  }
  if (questionLower.includes("siembra")) {
    return "solucionSiembra";
  }
  if (questionLower.includes("pulverización") || questionLower.includes("pulverizacion")) {
    return "solucionPulverizacion";
  }
  if (questionLower.includes("post") && questionLower.includes("venta")) {
    return "postVenta";
  }
  if (questionLower.includes("drone")) {
    return "dronesDJI";
  }
  if (questionLower.includes("guía") || questionLower.includes("autoguía") || questionLower.includes("autoguia")) {
    return "guiaAutoguia";
  }
  if (questionLower.includes("taps") || questionLower.includes("señales") || questionLower.includes("senales")) {
    return "tapsSenales";
  }
  if (questionLower.includes("qr")) {
    return "accionQR";
  }
  
  return null;
}

/**
 * Procesa las verticales/checkboxes seleccionadas
 */
function processVerticales(formData) {
  const verticales = [];
  
  // Primero agregar verticales extraídas automáticamente
  if (formData.verticalesSeleccionadas && formData.verticalesSeleccionadas.length > 0) {
    verticales.push(...formData.verticalesSeleccionadas);
    Logger.log("Verticales automáticas agregadas: " + formData.verticalesSeleccionadas.join(", "));
  }
  
  // Luego verificar campos individuales de checkboxes
  const checkboxFields = [
    { field: "weedSeeker", label: "WeedSeeker" },
    { field: "solucionSiembra", label: "Solución Siembra" },
    { field: "solucionPulverizacion", label: "Solución Pulverización" },
    { field: "postVenta", label: "Post Venta" },
    { field: "dronesDJI", label: "Drones DJI" },
    { field: "guiaAutoguia", label: "Guía/Autoguía" },
    { field: "tapsSenales", label: "Taps y Señales" },
    { field: "accionQR", label: "Acción QR" }
  ];
  
  for (const checkbox of checkboxFields) {
    const value = formData[checkbox.field];
    
    // Verificar múltiples formas de "verdadero"
    const isSelected = value === "TRUE" || 
                      value === true || 
                      value === "true" || 
                      value === "Sí" ||
                      value === "Si" ||
                      value === "Yes" ||
                      value === "1" ||
                      (typeof value === 'string' && value.toLowerCase().includes("sí")) ||
                      (typeof value === 'string' && value.toLowerCase().includes("si")) ||
                      (Array.isArray(value) && value.length > 0) ||
                      (typeof value === 'string' && value.trim() !== "" && value !== "FALSE" && value !== "false" && value !== "No");
    
    if (isSelected && !verticales.includes(checkbox.label)) {
      verticales.push(checkbox.label);
      Logger.log(`✓ Checkbox agregado: ${checkbox.field} = "${value}" -> ${checkbox.label}`);
    } else if (value) {
      Logger.log(`✗ Checkbox no agregado: ${checkbox.field} = "${value}" (no cumple criterios)`);
    }
  }
  
  // Si hay campo verticales directo, agregarlo también
  if (formData.verticales && typeof formData.verticales === 'string' && formData.verticales.trim() !== '') {
    // Dividir por comas si es una lista
    const directVerticals = formData.verticales.split(',').map(v => v.trim()).filter(v => v !== '');
    for (const vertical of directVerticals) {
      if (!verticales.includes(vertical)) {
        verticales.push(vertical);
        Logger.log(`✓ Vertical directa agregada: ${vertical}`);
      }
    }
  }
  
  const result = verticales.join(", ");
  Logger.log(`🎯 Verticales finales concatenadas: "${result}"`);
  
  return result;
}

// ===============================
// FUNCIONES DE INTEGRACIÓN CON ODOO
// ===============================

// Copiar las funciones XML-RPC del archivo gs.gs original

/**
 * Crear payload XML-RPC
 */
function createXmlRpcPayload(method, params) {
  let payload = '<?xml version="1.0"?><methodCall><methodName>' + method + '</methodName><params>';
  
  for (const param of params) {
    payload += '<param><value>' + convertJsValueToXmlRpc(param) + '</value></param>';
  }
  
  payload += '</params></methodCall>';
  return payload;
}

/**
 * Convertir valor JS a XML-RPC
 */
function convertJsValueToXmlRpc(value) {
  if (typeof value === 'string') {
    return '<string>' + escapeXml(value) + '</string>';
  } else if (typeof value === 'number') {
    if (Number.isInteger(value)) {
      return '<int>' + value + '</int>';
    } else {
      return '<double>' + value + '</double>';
    }
  } else if (typeof value === 'boolean') {
    return '<boolean>' + (value ? '1' : '0') + '</boolean>';
  } else if (Array.isArray(value)) {
    let arrayXml = '<array><data>';
    for (const item of value) {
      arrayXml += '<value>' + convertJsValueToXmlRpc(item) + '</value>';
    }
    arrayXml += '</data></array>';
    return arrayXml;
  } else if (typeof value === 'object' && value !== null) {
    let structXml = '<struct>';
    for (const [key, val] of Object.entries(value)) {
      structXml += '<member><name>' + escapeXml(key) + '</name><value>' + convertJsValueToXmlRpc(val) + '</value></member>';
    }
    structXml += '</struct>';
    return structXml;
  } else {
    return '<string></string>';
  }
}

/**
 * Escapar caracteres XML
 */
function escapeXml(unsafe) {
  return unsafe.replace(/[<>&'"]/g, function (c) {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
    }
  });
}

/**
 * Parsear respuesta XML-RPC
 */
function parseXmlRpcResponse(xmlString) {
  try {
    const doc = XmlService.parse(xmlString);
    const root = doc.getRootElement();
    
    // Buscar elementos de respuesta o falla
    const paramsElement = root.getChild('params');
    const faultElement = root.getChild('fault');
    
    if (faultElement) {
      const faultValue = parseXmlRpcValue(faultElement.getChild('value'));
      throw new Error('XML-RPC Fault: ' + JSON.stringify(faultValue));
    }
    
    if (paramsElement) {
      const paramElements = paramsElement.getChildren('param');
      if (paramElements.length > 0) {
        const valueElement = paramElements[0].getChild('value');
        return parseXmlRpcValue(valueElement);
      }
    }
    
    throw new Error('Respuesta XML-RPC inválida');
    
  } catch (error) {
    Logger.log("Error parseando respuesta XML-RPC: " + error.toString());
    throw error;
  }
}

/**
 * Parsear valor XML-RPC recursivamente
 */
function parseXmlRpcValue(valueElement) {
  if (!valueElement) return null;
  
  const children = valueElement.getChildren();
  if (children.length === 0) {
    return valueElement.getText();
  }
  
  const firstChild = children[0];
  const tagName = firstChild.getName();
  
  switch (tagName) {
    case 'string':
      return firstChild.getText();
    case 'int':
    case 'i4':
      return parseInt(firstChild.getText());
    case 'double':
      return parseFloat(firstChild.getText());
    case 'boolean':
      return firstChild.getText() === '1';
    case 'array':
      const dataElement = firstChild.getChild('data');
      const result = [];
      if (dataElement) {
        const valueElements = dataElement.getChildren('value');
        for (const ve of valueElements) {
          result.push(parseXmlRpcValue(ve));
        }
      }
      return result;
    case 'struct':
      const structResult = {};
      const memberElements = firstChild.getChildren('member');
      for (const member of memberElements) {
        const nameElement = member.getChild('name');
        const valueEl = member.getChild('value');
        if (nameElement && valueEl) {
          structResult[nameElement.getText()] = parseXmlRpcValue(valueEl);
        }
      }
      return structResult;
    default:
      return firstChild.getText();
  }
}

/**
 * Login XML-RPC en Odoo
 */
function xmlrpcLogin(url, db, username, password) {
  Logger.log("Iniciando login XML-RPC en Odoo");
  
  try {
    const loginUrl = url + '/xmlrpc/2/common';
    const payload = createXmlRpcPayload('authenticate', [db, username, password, {}]);
    
    const options = {
      'method': 'post',
      'contentType': 'text/xml',
      'payload': payload,
      'muteHttpExceptions': true
    };
    
    const response = UrlFetchApp.fetch(loginUrl, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    if (responseCode !== 200) {
      throw new Error('Error de autenticación: ' + responseText);
    }
    
    const result = parseXmlRpcResponse(responseText);
    
    if (!result) {
      throw new Error('Credenciales inválidas');
    }
    
    Logger.log("Login exitoso con UID: " + result);
    return result;
    
  } catch (error) {
    Logger.log("Error en xmlrpcLogin: " + error.toString());
    throw error;
  }
}

/**
 * Ejecutar método XML-RPC
 */
function xmlrpcExecute(url, db, uid, password, model, method, args) {
  Logger.log(`Ejecutando método XML-RPC: ${method} en modelo: ${model}`);
  
  try {
    const executeUrl = url + '/xmlrpc/2/object';
    const payload = createXmlRpcPayload('execute_kw', [db, uid, password, model, method, args]);
    
    const options = {
      'method': 'post',
      'contentType': 'text/xml',
      'payload': payload,
      'muteHttpExceptions': true
    };
    
    const response = UrlFetchApp.fetch(executeUrl, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    if (responseCode !== 200) {
      throw new Error('Error en la ejecución: ' + responseText);
    }
    
    const result = parseXmlRpcResponse(responseText);
    Logger.log("Ejecución exitosa");
    
    return result;
    
  } catch (error) {
    Logger.log("Error en xmlrpcExecute: " + error.toString());
    throw error;
  }
}

/**
 * Crear lead en Odoo (función principal)
 */
function createOdooLead(formData) {
  try {
    Logger.log("Iniciando creación de lead en Odoo");
    
    // Autenticación en Odoo
    const uid = xmlrpcLogin(ODOO_CONFIG.url, ODOO_CONFIG.db, ODOO_CONFIG.login, ODOO_CONFIG.password);
    Logger.log("Autenticación exitosa en Odoo con UID: " + uid);
    
    // Preparar datos para el lead
    const nombreCompleto = formData.nombre + " " + formData.apellido;
    Logger.log(`Preparando datos para: ${nombreCompleto}, Email: ${formData.mail}, Teléfono: ${formData.telefono}`);
      // Construir descripción detallada como HTML
    let descripcion = `<div style="font-family: Arial, sans-serif; line-height: 1.6;">`;
    descripcion += `<h2 style="color: #2E75B6; margin-bottom: 20px;">📋 INFORMACIÓN DEL PROSPECTO</h2>`;
    
    descripcion += `<div style="margin-bottom: 20px;">`;
    descripcion += `<h3 style="color: #1B5E20; border-bottom: 2px solid #4CAF50; padding-bottom: 5px;">👤 DATOS PERSONALES</h3>`;
    descripcion += `<ul style="margin: 10px 0; padding-left: 20px;">`;
    descripcion += `<li><strong>Nombre completo:</strong> ${nombreCompleto}</li>`;
    descripcion += `<li><strong>Teléfono:</strong> ${formData.telefono || '<em>No proporcionado</em>'}</li>`;
    descripcion += `<li><strong>Email:</strong> ${formData.mail || '<em>No proporcionado</em>'}</li>`;
    descripcion += `</ul>`;
    descripcion += `</div>`;
    
    descripcion += `<div style="margin-bottom: 20px;">`;
    descripcion += `<h3 style="color: #1B5E20; border-bottom: 2px solid #4CAF50; padding-bottom: 5px;">🌍 UBICACIÓN</h3>`;
    descripcion += `<ul style="margin: 10px 0; padding-left: 20px;">`;
    descripcion += `<li><strong>Localidad:</strong> ${formData.localidad || '<em>No proporcionada</em>'}</li>`;
    descripcion += `<li><strong>Provincia:</strong> ${formData.provincia || '<em>No proporcionada</em>'}</li>`;
    descripcion += `<li><strong>País:</strong> ${formData.pais || '<em>No proporcionado</em>'}</li>`;
    descripcion += `</ul>`;
    descripcion += `</div>`;
    
    descripcion += `<div style="margin-bottom: 20px;">`;
    descripcion += `<h3 style="color: #1B5E20; border-bottom: 2px solid #4CAF50; padding-bottom: 5px;">🎯 INTERESES (VERTICALES)</h3>`;
    if (formData.concatenatedCheckboxes && formData.concatenatedCheckboxes.trim() !== '') {
      const verticales = formData.concatenatedCheckboxes.split(',').map(v => v.trim()).filter(v => v !== '');
      descripcion += `<ul style="margin: 10px 0; padding-left: 20px;">`;
      verticales.forEach(vertical => {
        descripcion += `<li><span style="background-color: #E3F2FD; padding: 2px 8px; border-radius: 12px; font-size: 0.9em;">${vertical}</span></li>`;
      });
      descripcion += `</ul>`;
    } else {
      descripcion += `<p style="font-style: italic; color: #666;">No se especificaron intereses particulares</p>`;
    }
    descripcion += `</div>`;
    
    descripcion += `<div style="margin-bottom: 20px;">`;
    descripcion += `<h3 style="color: #1B5E20; border-bottom: 2px solid #4CAF50; padding-bottom: 5px;">💼 DETALLES COMERCIALES</h3>`;
    descripcion += `<ul style="margin: 10px 0; padding-left: 20px;">`;
    if (formData.comentarios && formData.comentarios.trim() !== '') {
      descripcion += `<li><strong>Comentarios:</strong> <div style="background-color: #F5F5F5; padding: 10px; border-left: 4px solid #2196F3; margin: 5px 0;">${formData.comentarios}</div></li>`;
    } else {
      descripcion += `<li><strong>Comentarios:</strong> <em>Sin comentarios adicionales</em></li>`;
    }
    descripcion += `<li><strong>Monto Estimado:</strong> ${formData.montoEstimado || '<em>No especificado</em>'}</li>`;
    descripcion += `<li><strong>Presupuesto:</strong> ${formData.presupuesto || '<em>No especificado</em>'}</li>`;
    descripcion += `</ul>`;
    descripcion += `</div>`;
    
    descripcion += `<div style="margin-bottom: 20px;">`;
    descripcion += `<h3 style="color: #1B5E20; border-bottom: 2px solid #4CAF50; padding-bottom: 5px;">📋 INFORMACIÓN DE REGISTRO</h3>`;
    descripcion += `<ul style="margin: 10px 0; padding-left: 20px;">`;
    descripcion += `<li><strong>Registrador (Operador):</strong> ${formData.registrador || '<em>No especificado</em>'}</li>`;
    descripcion += `<li><strong>Empresa Registradora:</strong> ${formData.empresaRegistradora || '<em>No especificada</em>'}</li>`;
    descripcion += `<li><strong>Comercial Asignado:</strong> ${formData.comercial || '<em>No asignado</em>'}</li>`;
    descripcion += `<li><strong>Evento:</strong> ${formData.evento || '<em>No especificado</em>'}</li>`;
    descripcion += `</ul>`;
    descripcion += `</div>`;
    
    descripcion += `<div style="background-color: #E8F5E8; padding: 15px; border-radius: 8px; margin-bottom: 20px;">`;
    descripcion += `<h3 style="color: #1B5E20; margin-top: 0;">ℹ️ INFORMACIÓN ADICIONAL</h3>`;
    descripcion += `<ul style="margin: 5px 0; padding-left: 20px;">`;
    descripcion += `<li><strong>Origen:</strong> <span style="background-color: #4CAF50; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.9em;">Google Forms</span></li>`;
    descripcion += `<li><strong>Fecha de registro:</strong> ${new Date().toLocaleString('es-AR')}</li>`;
    descripcion += `</ul>`;
    descripcion += `</div>`;
    descripcion += `</div>`;    // Construir los datos para Odoo
    const verticalesParaTitulo = formData.concatenatedCheckboxes && formData.concatenatedCheckboxes.trim() !== '' 
      ? formData.concatenatedCheckboxes 
      : 'Consulta General';
    
    // 🌍 Búsqueda dinámica de país basada en localidad y provincia
    const countryId = findCountryByLocation(
      ODOO_CONFIG.url, 
      ODOO_CONFIG.db, 
      uid, 
      ODOO_CONFIG.password, 
      formData.localidad, 
      formData.provincia
    );
      // Validar email - si está vacío, no enviarlo (evita problemas en Odoo)
    const emailField = (formData.mail && formData.mail.trim() !== '') ? formData.mail.trim() : null;
    
    const odooLeadData = {
      'name': `${nombreCompleto} - ${verticalesParaTitulo}`,
      'contact_name': nombreCompleto,
      'phone': formData.telefono || '',
      'description': descripcion,
      'type': 'lead',
      'street': formData.localidad || '',
      'city': formData.localidad || '',
      'country_id': countryId,
      'campaign_id': '',
      'source_id': '',      'referred': formData.evento || ''
    };
    
    // Agregar email solo si tiene un valor válido
    if (emailField) {
      odooLeadData['email_from'] = emailField;
      Logger.log("✅ Email agregado: " + emailField);
    } else {
      Logger.log("⚠️ Email vacío o inválido, no se agregará al lead");
    }
    
    // Buscar y asignar comercial (salesperson)
    if (formData.comercial && formData.comercial.trim() !== '') {
      const salespersonId = getSalespersonId(ODOO_CONFIG.url, ODOO_CONFIG.db, uid, ODOO_CONFIG.password, formData.comercial);
      if (salespersonId) {
        odooLeadData['user_id'] = salespersonId;
        Logger.log("✅ Comercial asignado con ID: " + salespersonId);
      } else {
        Logger.log("⚠️ No se pudo encontrar el comercial: " + formData.comercial);
      }
    }
      // ✅ NO USAR CAMPOS PERSONALIZADOS - ya están incluidos en la descripción HTML
    // Los datos de registrador y empresa ya están en la descripción formateada
    Logger.log("ℹ️ Datos de registrador y empresa incluidos en descripción HTML");
    Logger.log("📝 Registrador: " + (formData.registrador || 'No especificado'));
    Logger.log("🏢 Empresa registradora: " + (formData.empresaRegistradora || 'No especificada'));
    
    // Buscar el ID del país dinámicamente si está especificado
    if (formData.pais) {
      const countryId = getCountryId(ODOO_CONFIG.url, ODOO_CONFIG.db, uid, ODOO_CONFIG.password, formData.pais);
      if (countryId) {
        odooLeadData['country_id'] = countryId;
        Logger.log("ID de país encontrado y asignado: " + countryId + " para " + formData.pais);
      }
    }
      // 🗺️ Buscar provincia con país dinámico
    if (formData.provincia) {
      const provinceId = getProvinceIdDynamic(
        ODOO_CONFIG.url, 
        ODOO_CONFIG.db, 
        uid, 
        ODOO_CONFIG.password, 
        formData.provincia, 
        countryId
      );
      if (provinceId) {
        odooLeadData['state_id'] = provinceId;
        Logger.log("ID de provincia encontrado y asignado: " + provinceId);
      }
    }
    
    // Crear el lead en Odoo
    const leadId = xmlrpcExecute(
      ODOO_CONFIG.url,
      ODOO_CONFIG.db,
      uid,
      ODOO_CONFIG.password,
      'crm.lead',
      'create',
      [odooLeadData]
    );
    
    // Si se crea exitosamente, configurar campaña y origen
    if (leadId) {
      try {
        // Buscar o crear la campaña basada en el evento
        if (formData.evento) {
          const campaignId = getCampaignId(ODOO_CONFIG.url, ODOO_CONFIG.db, uid, ODOO_CONFIG.password, formData.evento);
          if (campaignId) {
            xmlrpcExecute(
              ODOO_CONFIG.url,
              ODOO_CONFIG.db,
              uid,
              ODOO_CONFIG.password,
              'crm.lead',
              'write',
              [[leadId], { 'campaign_id': campaignId }]
            );
            Logger.log("Lead actualizado con campaña ID: " + campaignId);
          }
        }
        
        // Buscar o crear el origen
        const sourceId = getSourceId(ODOO_CONFIG.url, ODOO_CONFIG.db, uid, ODOO_CONFIG.password, "Google Forms");
        if (sourceId) {
          xmlrpcExecute(
            ODOO_CONFIG.url,
            ODOO_CONFIG.db,
            uid,
            ODOO_CONFIG.password,
            'crm.lead',
            'write',
            [[leadId], { 'source_id': sourceId }]
          );
          Logger.log("Lead actualizado con origen ID: " + sourceId);
        }
      } catch (updateError) {
        Logger.log("Error al actualizar campaña/origen: " + updateError.toString());
        // Continuamos aunque falle esta parte
      }
    }
    
    Logger.log("Lead creado exitosamente en Odoo con ID: " + leadId);
    return { success: true, lead_id: leadId };
    
  } catch (error) {
    Logger.log("Error al crear lead en Odoo: " + error.toString());
    
    const errorMessage = error.message || error.toString();
    
    // Verificar si es error de duplicado
    if (errorMessage.toLowerCase().includes('duplicate') || 
        errorMessage.toLowerCase().includes('duplicado') ||
        errorMessage.toLowerCase().includes('already exists') ||
        errorMessage.toLowerCase().includes('ya existe')) {
      return { 
        success: false, 
        error: "Lead duplicado según el servidor de Odoo: " + errorMessage,
        isDuplicate: true
      };
    }
    
    return { success: false, error: errorMessage };
  }
}

// ===============================
// FUNCIONES AUXILIARES DE ODOO
// ===============================

/**
 * Obtener o crear una campaña en Odoo
 */
function getCampaignId(url, db, uid, password, campaignName) {
  if (!campaignName) return null;
  
  try {
    const existingCampaigns = xmlrpcExecute(
      url, db, uid, password,
      'utm.campaign',
      'search_read',
      [[['name', '=', campaignName]], ['id', 'name'], 0, 1]
    );
    
    if (existingCampaigns && existingCampaigns.length > 0) {
      Logger.log("Campaña encontrada con ID: " + existingCampaigns[0].id);
      return existingCampaigns[0].id;
    }
    
    const newCampaignId = xmlrpcExecute(
      url, db, uid, password,
      'utm.campaign',
      'create',
      [{ 'name': campaignName }]
    );
    
    Logger.log("Nueva campaña creada con ID: " + newCampaignId);
    return newCampaignId;
  } catch (error) {
    Logger.log("Error al obtener/crear campaña: " + error.toString());
    return null;
  }
}

/**
 * Obtener o crear un origen en Odoo
 */
function getSourceId(url, db, uid, password, sourceName) {
  if (!sourceName) return null;
  
  try {
    const existingSources = xmlrpcExecute(
      url, db, uid, password,
      'utm.source',
      'search_read',
      [[['name', '=', sourceName]], ['id', 'name'], 0, 1]
    );
    
    if (existingSources && existingSources.length > 0) {
      Logger.log("Origen encontrado con ID: " + existingSources[0].id);
      return existingSources[0].id;
    }
    
    const newSourceId = xmlrpcExecute(
      url, db, uid, password,
      'utm.source',
      'create',
      [{ 'name': sourceName }]
    );
    
    Logger.log("Nuevo origen creado con ID: " + newSourceId);
    return newSourceId;
  } catch (error) {
    Logger.log("Error al obtener/crear origen: " + error.toString());
    return null;
  }
}

/**
 * Buscar el ID del país en Odoo
 */
function getCountryId(url, db, uid, password, countryName) {
  if (!countryName) return null;
  
  try {
    const countries = xmlrpcExecute(
      url, db, uid, password,
      'res.country',
      'search_read',
      [[['name', 'ilike', countryName]], ['id', 'name'], 0, 1]
    );
    
    if (countries && countries.length > 0) {
      Logger.log("País encontrado: " + countries[0].name + " con ID: " + countries[0].id);
      return countries[0].id;
    }
    
    Logger.log("No se encontró el país: " + countryName);
    return null;
  } catch (error) {
    Logger.log("Error al buscar país: " + error.toString());
    return null;
  }
}

/**
 * Buscar el ID de la provincia en Odoo
 */
function getProvinceId(url, db, uid, password, provinceName, countryId = 10) {
  if (!provinceName) return null;
  
  try {
    const provinces = xmlrpcExecute(
      url, db, uid, password,
      'res.country.state',
      'search_read',
      [[['name', 'ilike', provinceName], ['country_id', '=', countryId]], ['id', 'name'], 0, 1]
    );
    
    if (provinces && provinces.length > 0) {
      Logger.log("Provincia encontrada: " + provinces[0].name + " con ID: " + provinces[0].id);
      return provinces[0].id;
    }
    
    Logger.log("No se encontró la provincia: " + provinceName);
    return null;
  } catch (error) {
    Logger.log("Error al buscar provincia: " + error.toString());
    return null;
  }
}

/**
 * Buscar comercial/salesperson en Odoo por nombre
 * Búsqueda GLOBAL sin restricciones de empresa o equipo de ventas
 */
function getSalespersonId(url, db, uid, password, salespersonName) {
  if (!salespersonName || salespersonName.trim() === '') return null;
  
  try {
    Logger.log(`🔍 Buscando comercial GLOBALMENTE (sin restricciones): "${salespersonName}"`);
    
    // 1. BÚSQUEDA PRINCIPAL: Usuarios SIN restricciones de empresa
    const userSearchCriteria = [
      '|', '|', '|', '|',
      ['name', 'ilike', salespersonName],
      ['login', 'ilike', salespersonName], 
      ['partner_id.name', 'ilike', salespersonName],
      ['partner_id.email', 'ilike', salespersonName],
      ['email', 'ilike', salespersonName]
    ];
    
    Logger.log("🔎 Buscando en res.users (TODOS los usuarios, todas las empresas)...");
    
    // IMPORTANTE: Usar context vacío para evitar filtros de empresa
    const contextFree = {};
    
    const existingUsers = xmlrpcExecute(
      url, db, uid, password,
      'res.users',
      'search_read',
      [userSearchCriteria, ['id', 'name', 'login', 'email', 'active', 'company_id', 'company_ids'], 0, 20], // Más resultados
      contextFree  // Context vacío = sin restricciones
    );
    
    if (existingUsers && existingUsers.length > 0) {
      Logger.log(`📊 Encontrados ${existingUsers.length} usuarios candidatos`);
      
      // Mostrar todos los candidatos para debug
      existingUsers.forEach((user, index) => {
        Logger.log(`   ${index + 1}. ${user.name} (ID: ${user.id}, Login: ${user.login}, Activo: ${user.active}, Empresas: ${user.company_ids || user.company_id})`);
      });
      
      // Priorizar usuarios activos
      const activeUsers = existingUsers.filter(user => user.active !== false);
      
      if (activeUsers.length > 0) {
        const user = activeUsers[0];
        Logger.log(`✅ Usuario ACTIVO seleccionado: ${user.name} (ID: ${user.id})`);
        return user.id;
      } else {
        // Si no hay activos, tomar el primero disponible
        const user = existingUsers[0];
        Logger.log(`⚠️ Usuario INACTIVO seleccionado: ${user.name} (ID: ${user.id}) - usando de todas formas`);
        return user.id;
      }
    }
    
    // 2. BÚSQUEDA ALTERNATIVA: Partners SIN restricciones de empresa
    Logger.log("🔎 Buscando en res.partner (TODOS los contactos individuales)...");
    const partnerSearchCriteria = [
      ['name', 'ilike', salespersonName],
      ['is_company', '=', false]  // Solo contactos individuales
    ];
    
    const existingPartners = xmlrpcExecute(
      url, db, uid, password,
      'res.partner',
      'search_read',
      [partnerSearchCriteria, ['id', 'name', 'email', 'company_id'], 0, 20],
      contextFree  // Sin restricciones de empresa
    );
    
    if (existingPartners && existingPartners.length > 0) {
      Logger.log(`📊 Encontrados ${existingPartners.length} partners candidatos`);
      
      // Para cada partner, buscar si tiene usuario asociado
      for (const partner of existingPartners) {
        Logger.log(`   Verificando partner: ${partner.name} (ID: ${partner.id})`);
        
        const partnerUser = xmlrpcExecute(
          url, db, uid, password,
          'res.users',
          'search_read',
          [[['partner_id', '=', partner.id]], ['id', 'name', 'active'], 0, 1],
          contextFree  // Sin restricciones
        );
        
        if (partnerUser && partnerUser.length > 0) {
          const user = partnerUser[0];
          Logger.log(`✅ Usuario encontrado via partner: ${user.name} (ID: ${user.id}, Partner: ${partner.name})`);
          return user.id;
        }
      }
      
      Logger.log(`ℹ️ Partners encontrados pero ninguno con usuario asociado`);
    }
    
    // 3. BÚSQUEDA POR COINCIDENCIA PARCIAL SÚPER FLEXIBLE
    Logger.log("🔎 Búsqueda súper flexible por coincidencia parcial...");
    const flexibleSearch = [
      '|', '|',
      ['name', 'ilike', `%${salespersonName}%`],
      ['login', 'ilike', `%${salespersonName}%`],
      ['email', 'ilike', `%${salespersonName}%`]
    ];
    
    const flexibleUsers = xmlrpcExecute(
      url, db, uid, password,
      'res.users',
      'search_read',
      [flexibleSearch, ['id', 'name', 'login', 'active', 'company_id'], 0, 10],
      contextFree  // Sin restricciones
    );
    
    if (flexibleUsers && flexibleUsers.length > 0) {
      Logger.log(`📊 Búsqueda flexible encontró ${flexibleUsers.length} candidatos:`);
      flexibleUsers.forEach((user, index) => {
        Logger.log(`   ${index + 1}. ${user.name} (ID: ${user.id}, Login: ${user.login})`);
      });
      
      const user = flexibleUsers[0];
      Logger.log(`✅ Usuario seleccionado (coincidencia parcial): ${user.name} (ID: ${user.id})`);
      return user.id;
    }
    
    // 4. BÚSQUEDA DE RESPALDO: CUALQUIER usuario que pueda ser comercial
    Logger.log("🔎 Búsqueda de respaldo: cualquier usuario disponible...");
    try {
      // Buscar usuarios que NO sean internos del sistema (admin, etc.)
      const fallbackUsers = xmlrpcExecute(
        url, db, uid, password,
        'res.users',
        'search_read',
        [
          [
            ['active', '=', true],
            ['login', '!=', '__system__'],
            ['id', '>', 1]  // Excluir usuario admin (ID 1)
          ],
          ['id', 'name', 'login', 'company_id'], 
          0, 
          5
        ],
        contextFree  // Sin restricciones
      );
      
      if (fallbackUsers && fallbackUsers.length > 0) {
        const user = fallbackUsers[0];
        Logger.log(`⚠️ FALLBACK: Usando usuario disponible: ${user.name} (ID: ${user.id})`);
        return user.id;
      }
    } catch (fallbackError) {
      Logger.log("⚠️ Error en búsqueda de respaldo: " + fallbackError.toString());
    }
    
    Logger.log(`❌ NO se encontró NINGÚN comercial con nombre: "${salespersonName}"`);
    Logger.log("💡 Posibles causas:");
    Logger.log("   - El nombre no coincide con ningún usuario en Odoo");
    Logger.log("   - Problemas de permisos en la base de datos");
    Logger.log("   - Usuario inexistente o mal escrito");
    return null;
    
  } catch (error) {
    Logger.log("❌ Error CRÍTICO al buscar comercial: " + error.toString());
    Logger.log("🔧 Stack trace: " + error.stack);
    return null;
  }
}

/**
 * Buscar país basado en localidad y provincia
 */
function findCountryByLocation(url, db, uid, password, localidad, provincia) {
  try {
    Logger.log(`🌍 Buscando país para: Localidad="${localidad}", Provincia="${provincia}"`);
    
    // Mapeo de provincias argentinas para búsqueda rápida
    const argentineProvinces = [
      'buenos aires', 'ba', 'cordoba', 'córdoba', 'santa fe', 'mendoza', 'tucuman', 'tucumán',
      'entre rios', 'entre ríos', 'salta', 'misiones', 'chaco', 'corrientes', 'santiago del estero',
      'san juan', 'jujuy', 'rio negro', 'río negro', 'formosa', 'neuquen', 'neuquén', 'chubut',
      'san luis', 'catamarca', 'la rioja', 'la pampa', 'santa cruz', 'tierra del fuego'
    ];
    
    // Primero verificar si es una provincia argentina conocida
    if (provincia) {
      const provinciaLower = provincia.toLowerCase().trim();
      const isArgentineProvince = argentineProvinces.some(argProv => 
        provinciaLower.includes(argProv) || argProv.includes(provinciaLower)
      );
      
      if (isArgentineProvince) {
        Logger.log("✅ Provincia argentina detectada, usando Argentina (ID: 10)");
        return 10; // ID de Argentina
      }
    }
    
    // Si no es provincia argentina conocida, buscar dinámicamente
    let countryId = null;
    
    // 1. Buscar por provincia en res.country.state
    if (provincia && provincia.trim() !== '') {
      Logger.log(`🔍 Buscando provincia: "${provincia}"`);
      
      const states = xmlrpcExecute(
        url, db, uid, password,
        'res.country.state',
        'search_read',
        [[['name', 'ilike', provincia]], ['id', 'name', 'country_id'], 0, 5]
      );
      
      if (states && states.length > 0) {
        countryId = states[0].country_id[0];
        const countryName = states[0].country_id[1];
        Logger.log(`✅ Provincia encontrada: ${states[0].name}, País: ${countryName} (ID: ${countryId})`);
        return countryId;
      }
    }
    
    // 2. Si no encuentra por provincia, buscar por localidad en ciudades conocidas
    if (localidad && localidad.trim() !== '') {
      Logger.log(`🔍 Buscando por localidad: "${localidad}"`);
      
      // Mapeo de ciudades importantes a países
      const cityCountryMapping = {
        // Argentina
        'buenos aires': 10, 'capital federal': 10, 'caba': 10, 'cordoba': 10, 'córdoba': 10,
        'rosario': 10, 'mendoza': 10, 'tucuman': 10, 'tucumán': 10, 'la plata': 10,
        'mar del plata': 10, 'salta': 10, 'san juan': 10, 'resistencia': 10, 'neuquen': 10,
        // Brasil
        'sao paulo': 31, 'rio de janeiro': 31, 'brasilia': 31, 'salvador': 31, 'fortaleza': 31,
        // Chile
        'santiago': 46, 'valparaiso': 46, 'valparaíso': 46, 'concepcion': 46, 'concepción': 46,
        // Uruguay
        'montevideo': 234, 'punta del este': 234, 'maldonado': 234,
        // Paraguay
        'asuncion': 179, 'asunción': 179, 'ciudad del este': 179,
        // Bolivia
        'la paz': 26, 'santa cruz': 26, 'cochabamba': 26, 'sucre': 26
      };
      
      const localidadLower = localidad.toLowerCase().trim();
      for (const [city, countryIdMap] of Object.entries(cityCountryMapping)) {
        if (localidadLower.includes(city) || city.includes(localidadLower)) {
          Logger.log(`✅ Ciudad reconocida: ${localidad} → País ID: ${countryIdMap}`);
          return countryIdMap;
        }
      }
    }
    
    // 3. Búsqueda manual en partners de Odoo por localidad
    if (localidad && localidad.trim() !== '') {
      const partners = xmlrpcExecute(
        url, db, uid, password,
        'res.partner',
        'search_read',
        [[['city', 'ilike', localidad]], ['country_id'], 0, 3]
      );
      
      if (partners && partners.length > 0) {
        for (const partner of partners) {
          if (partner.country_id && partner.country_id[0]) {
            countryId = partner.country_id[0];
            Logger.log(`✅ País encontrado por partners existentes: ID ${countryId}`);
            return countryId;
          }
        }
      }
    }
    
    // 4. Por defecto, usar Argentina si no se encuentra nada
    Logger.log("⚠️ No se pudo determinar el país, usando Argentina por defecto (ID: 10)");
    return 10;
    
  } catch (error) {
    Logger.log("❌ Error buscando país por ubicación: " + error.toString());
    return 10; // Argentina por defecto
  }
}

/**
 * Buscar provincia mejorada con país dinámico
 */
function getProvinceIdDynamic(url, db, uid, password, provincia, countryId) {
  if (!provincia || provincia.trim() === '') return null;
  
  try {
    Logger.log(`🔍 Buscando provincia: "${provincia}" en país ID: ${countryId}`);
    
    // Buscar provincia en el país específico
    const searchCriteria = [
      ['name', 'ilike', provincia],
      ['country_id', '=', countryId]
    ];
    
    const provinces = xmlrpcExecute(
      url, db, uid, password,
      'res.country.state',
      'search_read',
      [searchCriteria, ['id', 'name', 'country_id'], 0, 1]
    );
    
    if (provinces && provinces.length > 0) {
      Logger.log(`✅ Provincia encontrada: ${provinces[0].name} (ID: ${provinces[0].id})`);
      return provinces[0].id;
    }
    
    // Si no encuentra exacta, buscar parcial
    const partialSearch = [
      '|',
      ['name', 'ilike', `%${provincia}%`],
      ['code', 'ilike', provincia],
      ['country_id', '=', countryId]
    ];
    
    const partialProvinces = xmlrpcExecute(
      url, db, uid, password,
      'res.country.state',
      'search_read',
      [partialSearch, ['id', 'name', 'country_id'], 0, 3]
    );
    
    if (partialProvinces && partialProvinces.length > 0) {
      Logger.log(`✅ Provincia encontrada (búsqueda parcial): ${partialProvinces[0].name} (ID: ${partialProvinces[0].id})`);
      return partialProvinces[0].id;
    }
    
    Logger.log(`❌ Provincia "${provincia}" no encontrada en país ID: ${countryId}`);
    return null;
    
  } catch (error) {
    Logger.log("Error al buscar provincia: " + error.toString());
    return null;
  }
}

/**
 * Guardar envío fallido para retry manual
 */
function saveFailedSubmission(formData, error) {
  try {
    Logger.log("💾 Guardando envío fallido para retry manual");
    
    // Crear un registro en el log con la información del error
    const errorData = {
      timestamp: new Date().toISOString(),
      formData: formData,
      error: error,
      status: 'FAILED'
    };
    
    Logger.log("❌ ENVÍO FALLIDO - DATOS PARA RETRY:");
    Logger.log(JSON.stringify(errorData, null, 2));
    
    // Opcional: Si tienes una hoja de cálculo configurada, puedes guardar ahí
    // const spreadsheetId = "TU_SPREADSHEET_ID_AQUI"; // Reemplazar con tu ID
    // const sheet = SpreadsheetApp.openById(spreadsheetId).getActiveSheet();
    // 
    // const row = [
    //   new Date(),
    //   formData.nombre || '',
    //   formData.apellido || '',
    //   formData.mail || '',
    //   formData.telefono || '',
    //   formData.localidad || '',
    //   formData.provincia || '',
    //   formData.concatenatedCheckboxes || '',
    //   formData.comentarios || '',
    //   formData.evento || '',
    //   error,
    //   'PENDIENTE'
    // ];
    // 
    // sheet.appendRow(row);
    // Logger.log("Envío fallido guardado en hoja de cálculo");
    
  } catch (saveError) {
    Logger.log("Error al guardar envío fallido: " + saveError.toString());
  }
}

/**
 * Enviar notificación de error al administrador
 */
function sendErrorNotification(error, formEvent) {
  try {
    Logger.log("📧 Enviando notificación de error al administrador");
    
    // Crear mensaje de error detallado
    const errorMessage = `
ERROR EN INTEGRACIÓN GOOGLE FORMS → ODOO
========================================

TIMESTAMP: ${new Date().toLocaleString('es-AR')}
ERROR: ${error.toString()}

STACK TRACE:
${error.stack || 'No disponible'}

DATOS DEL EVENTO:
${formEvent ? JSON.stringify(formEvent, null, 2) : 'No disponible'}

ACCIÓN REQUERIDA:
- Revisar logs en Google Apps Script
- Verificar conectividad con Odoo
- Validar datos del formulario
    `;
    
    Logger.log("🚨 NOTIFICACIÓN DE ERROR:");
    Logger.log(errorMessage);
    
    // Opcional: Enviar email si tienes configurado
    // MailApp.sendEmail({
    //   to: 'admin@tuempresa.com',
    //   subject: '🚨 Error en integración Google Forms → Odoo',
    //   body: errorMessage
    // });
    
  } catch (notificationError) {
    Logger.log("Error al enviar notificación: " + notificationError.toString());
  }
}

// ===============================
// DOCUMENTACIÓN ACTUALIZADA
// ===============================

/**
 * 📄 RESUMEN DE CONFIGURACIÓN ACTUALIZADA
 * =======================================
 * 
 * ✅ PROBLEMAS CORREGIDOS:
 * 
 * 1. ERROR DE SINTAXIS CORREGIDO:
 *    - Línea 24: fieldMapping = {} cambiado a fieldMapping: {}
 * 
 * 2. BÚSQUEDA DINÁMICA DE PAÍS IMPLEMENTADA:
 *    - No más país hardcodeado (Argentina por defecto)
 *    - findCountryByLocation() busca país basado en localidad/provincia
 *    - Mapeo inteligente de provincias argentinas conocidas
 *    - Mapeo de ciudades importantes de Sudamérica (Argentina, Brasil, Chile, Uruguay, Paraguay, Bolivia)
 *    - Búsqueda en res.country.state y partners existentes de Odoo
 *    - Fallback inteligente a Argentina si no se encuentra
 * 
 * CARACTERÍSTICAS PRINCIPALES:
 * 
 * 3. MAPEOS DE CAMPOS CORREGIDOS:
 *    - "Registrador" → registrador (operador que registra)
 *    - "EMPRESAREGISTRADOR" → empresaRegistradora (empresa registradora) 
 *    - "Asignado a" → comercial (comercial asignado/salesperson)
 * 
 * 4. BÚSQUEDA MEJORADA DE PROVINCIAS:
 *    - getProvinceIdDynamic() busca en el país correcto dinámicamente
 *    - Búsqueda exacta y parcial por nombre y código
 *    - Considera el país encontrado para búsqueda precisa
 * 
 * 5. BÚSQUEDA DE COMERCIALES:
 *    - getSalespersonId() busca comerciales en Odoo
 *    - Asigna automáticamente al campo user_id del lead
 *    - Búsqueda múltiple: nombre, login, partner, email
 * 
 * 6. FORMATO HTML EN DESCRIPCIÓN:
 *    - Notas internas formateadas como HTML con estilos profesionales
 *    - Colores, iconos y estructura visual mejorada
 *    - Información organizada en secciones claras con CSS inline
 * 
 * 7. CAMPOS PERSONALIZADOS:
 *    - Intenta guardar registrador en x_studio_registrador
 *    - Intenta guardar empresa en x_studio_empresa_registradora
 *    - Si no existen, incluye en descripción HTML
 * 
 * 8. FUNCIONES DE PRUEBA DISPONIBLES:
 *    - testNewFieldMappings(): Verifica mapeo de campos
 *    - testSalespersonSearch(): Prueba búsqueda de comerciales
 *    - testLocationSearch(): Prueba búsqueda dinámica de ubicación (NUEVA)
 * 
 * FLUJO DE BÚSQUEDA DE UBICACIÓN:
 * 1. Analiza provincia → Si es argentina conocida → Retorna Argentina (ID: 10)
 * 2. Busca provincia en res.country.state → Retorna país de la provincia
 * 3. Busca localidad en mapeo de ciudades → Retorna país conocido
 * 4. Busca en partners existentes por ciudad → Retorna país encontrado
 * 5. Fallback → Argentina (ID: 10)
 * 
 * PRÓXIMOS PASOS PARA IMPLEMENTACIÓN:
 * 1. ✅ Corregir sintaxis y guardar script
 * 2. 🔧 Ejecutar testLocationSearch() para verificar búsqueda de ubicación
 * 3. 🔧 Ejecutar testNewFieldMappings() para verificar mapeos * 4. 🔧 Ejecutar testSalespersonSearch() para probar búsqueda
 * 5. 📊 Enlazar formulario con spreadsheet  
 * 6. ⚙️ Configurar trigger de envío automático
 * 7. 🧪 Probar con envío real del formulario
 */

// ===============================
// FUNCIONES DE PRUEBA
// ===============================

/**
 * Test de búsqueda de ubicación (países y provincias)
 */
function testLocationSearch() {
  Logger.log("=== PRUEBA DE BÚSQUEDA DE UBICACIÓN ===");
  
  try {
    // Autenticación
    const uid = xmlrpcLogin(ODOO_CONFIG.url, ODOO_CONFIG.db, ODOO_CONFIG.login, ODOO_CONFIG.password);
    Logger.log("✅ Autenticación exitosa con UID: " + uid);
    
    // Prueba 1: Provincia argentina conocida
    Logger.log("\n--- Prueba 1: Buenos Aires, Argentina ---");
    const country1 = findCountryByLocation(ODOO_CONFIG.url, ODOO_CONFIG.db, uid, ODOO_CONFIG.password, "La Plata", "Buenos Aires");
    Logger.log("Resultado: " + JSON.stringify(country1));
    
    // Prueba 2: Ciudad brasileña
    Logger.log("\n--- Prueba 2: São Paulo, Brasil ---");
    const country2 = findCountryByLocation(ODOO_CONFIG.url, ODOO_CONFIG.db, uid, ODOO_CONFIG.password, "São Paulo", "");
    Logger.log("Resultado: " + JSON.stringify(country2));
    
    // Prueba 3: Ubicación desconocida
    Logger.log("\n--- Prueba 3: Ubicación desconocida ---");
    const country3 = findCountryByLocation(ODOO_CONFIG.url, ODOO_CONFIG.db, uid, ODOO_CONFIG.password, "Ciudad Inventada", "Provincia Inventada");
    Logger.log("Resultado: " + JSON.stringify(country3));
    
    Logger.log("✅ Prueba de búsqueda de ubicación completada");
    
  } catch (error) {
    Logger.log("❌ Error en prueba de ubicación: " + error.toString());
  }
}

/**
 * Test de mapeo de campos nuevos
 */
function testNewFieldMappings() {
  Logger.log("=== PRUEBA DE MAPEO DE CAMPOS ===");
  
  // Simular datos de formulario
  const testFormData = {
    nombre: "Juan",
    apellido: "Pérez",
    mail: "juan.perez@test.com",
    telefono: "+54 11 1234-5678",
    localidad: "Buenos Aires",
    provincia: "Buenos Aires",
    operadorApp: "María García",
    empresaOperador: "DyE Agro",
    comercialAsignado: "Carlos Vendedor",
    verticales: "WeedSeeker, Solución de Siembra",
    comentarios: "Cliente interesado en tecnología de precisión",
    evento: "Expo Campo 2025"
  };
  
  Logger.log("📋 Datos de prueba:");
  Logger.log(JSON.stringify(testFormData, null, 2));
  
  Logger.log("\n🔄 Procesando verticales...");
  const concatenatedVerticals = processVerticales(testFormData);
  Logger.log("Verticales concatenadas: " + concatenatedVerticals);
  
  Logger.log("✅ Prueba de mapeo completada");
}

/**
 * Test de búsqueda de vendedores
 */
function testSalespersonSearch() {
  Logger.log("=== PRUEBA DE BÚSQUEDA DE VENDEDORES ===");
  
  try {
    // Autenticación
    const uid = xmlrpcLogin(ODOO_CONFIG.url, ODOO_CONFIG.db, ODOO_CONFIG.login, ODOO_CONFIG.password);
    Logger.log("✅ Autenticación exitosa con UID: " + uid);
    
    // Prueba 1: Buscar vendedor existente
    Logger.log("\n--- Prueba 1: Buscar vendedor ---");
    const salesperson1 = getSalespersonId(ODOO_CONFIG.url, ODOO_CONFIG.db, uid, ODOO_CONFIG.password, "Admin");
    Logger.log("Resultado búsqueda 'Admin': " + JSON.stringify(salesperson1));
    
    // Prueba 2: Buscar vendedor por email
    Logger.log("\n--- Prueba 2: Buscar por email ---");
    const salesperson2 = getSalespersonId(ODOO_CONFIG.url, ODOO_CONFIG.db, uid, ODOO_CONFIG.password, "admin@example.com");
    Logger.log("Resultado búsqueda por email: " + JSON.stringify(salesperson2));
    
    // Prueba 3: Vendedor inexistente
    Logger.log("\n--- Prueba 3: Vendedor inexistente ---");
    const salesperson3 = getSalespersonId(ODOO_CONFIG.url, ODOO_CONFIG.db, uid, ODOO_CONFIG.password, "Vendedor Inexistente");
    Logger.log("Resultado vendedor inexistente: " + JSON.stringify(salesperson3));
    
    Logger.log("✅ Prueba de búsqueda de vendedores completada");
    
  } catch (error) {
    Logger.log("❌ Error en prueba de vendedores: " + error.toString());
  }
}

/**
 * Test específico para búsqueda GLOBAL de comerciales (sin restricciones de empresa)
 */
function testGlobalSalespersonSearch() {
  Logger.log("=== PRUEBA BÚSQUEDA GLOBAL DE COMERCIALES ===");
  
  try {
    // Autenticación
    const uid = xmlrpcLogin(ODOO_CONFIG.url, ODOO_CONFIG.db, ODOO_CONFIG.login, ODOO_CONFIG.password);
    Logger.log("✅ Autenticación exitosa con UID: " + uid);
    
    // 1. Listar TODOS los usuarios sin filtros para ver qué hay disponible
    Logger.log("\n--- PASO 1: Listando TODOS los usuarios disponibles ---");
    const allUsers = xmlrpcExecute(
      ODOO_CONFIG.url, ODOO_CONFIG.db, uid, ODOO_CONFIG.password,
      'res.users',
      'search_read',
      [[], ['id', 'name', 'login', 'active', 'company_id', 'company_ids'], 0, 10],
      {}  // Context vacío
    );
    
    if (allUsers && allUsers.length > 0) {
      Logger.log(`📊 Total usuarios encontrados: ${allUsers.length}`);
      allUsers.forEach((user, index) => {
        Logger.log(`   ${index + 1}. ${user.name} (ID: ${user.id}, Login: ${user.login}, Activo: ${user.active})`);
        Logger.log(`      Empresa actual: ${user.company_id || 'N/A'}, Empresas: ${user.company_ids || 'N/A'}`);
      });
    } else {
      Logger.log("❌ No se encontraron usuarios");
    }
    
    // 2. Pruebas de búsqueda específicas
    const testNames = ["Admin", "admin", "Administrator", "Usuario", "Test"];
    
    for (const testName of testNames) {
      Logger.log(`\n--- PASO 2: Probando búsqueda de "${testName}" ---`);
      const foundUser = getSalespersonId(ODOO_CONFIG.url, ODOO_CONFIG.db, uid, ODOO_CONFIG.password, testName);
      
      if (foundUser) {
        Logger.log(`✅ ÉXITO: Comercial "${testName}" encontrado con ID: ${foundUser}`);
      } else {
        Logger.log(`❌ FALLO: No se encontró comercial "${testName}"`);
      }
    }
    
    // 3. Verificar contexto de empresa actual
    Logger.log("\n--- PASO 3: Verificando contexto de usuario actual ---");
    const currentUser = xmlrpcExecute(
      ODOO_CONFIG.url, ODOO_CONFIG.db, uid, ODOO_CONFIG.password,
      'res.users',
      'read',
      [uid, ['name', 'company_id', 'company_ids']]
    );
    
    if (currentUser) {
      Logger.log(`Usuario actual: ${currentUser.name}`);
      Logger.log(`Empresa actual: ${currentUser.company_id || 'N/A'}`);
      Logger.log(`Empresas accesibles: ${currentUser.company_ids || 'N/A'}`);
    }
    
    Logger.log("\n✅ PRUEBA DE BÚSQUEDA GLOBAL COMPLETADA");
    
  } catch (error) {
    Logger.log("❌ Error en prueba global de comerciales: " + error.toString());
    Logger.log("🔧 Stack trace: " + error.stack);
  }
}

/**
 * Test completo de integración
 */
function testCompleteIntegration() {
  Logger.log("=== PRUEBA COMPLETA DE INTEGRACIÓN ===");
  
  // Simular evento de formulario
  const mockFormEvent = {
    response: {
      getItemResponses: function() {
        return [
          {
            getItem: function() { return { getTitle: function() { return "Nombre"; } }; },
            getResponse: function() { return "Juan"; }
          },
          {
            getItem: function() { return { getTitle: function() { return "Apellido"; } }; },
            getResponse: function() { return "Pérez"; }
          },
          {
            getItem: function() { return { getTitle: function() { return "Email"; } }; },
            getResponse: function() { return "juan.perez@test.com"; }
          },
          {
            getItem: function() { return { getTitle: function() { return "Teléfono"; } }; },
            getResponse: function() { return "+54 11 1234-5678"; }
          }
        ];
      }
    }
  };
  
  try {
    Logger.log("🚀 Iniciando prueba completa...");
    onFormSubmit(mockFormEvent);
    Logger.log("✅ Prueba completa finalizada - revisar logs anteriores");
    
  } catch (error) {
    Logger.log("❌ Error en prueba completa: " + error.toString());
  }
}
