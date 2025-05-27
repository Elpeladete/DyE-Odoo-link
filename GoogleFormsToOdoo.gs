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
    "entry.276961824": "operadorApp", // Nombre registrador
    "entry.1185082508": "comercialAsignado",
    "entry.716935390": "evento",
    "entry.1582004362": "empresaOperador", // Empresa registrador
    // Checkboxes individuales
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
    }
    
    // Enviar a Odoo
    const odooResult = createOdooLead(formData);
    
    if (odooResult.success) {
      Logger.log("✅ Lead creado exitosamente en Odoo con ID: " + odooResult.lead_id);
      
      // Opcional: Enviar notificación por WhatsApp usando Wazzup
      try {
        if (formData.telefono && formData.comercialAsignado) {
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
        formData[fieldName] = answer;
      }
      
      Logger.log(`Pregunta: "${question}" -> Campo: "${fieldName}" -> Respuesta: "${answer}"`);
    }
    
    // Validaciones básicas
    if (!formData.nombre) {
      throw new Error("Nombre es requerido");
    }
    if (!formData.apellido) {
      throw new Error("Apellido es requerido");
    }
    
    return formData;
    
  } catch (error) {
    Logger.log("Error al extraer datos del formulario: " + error.toString());
    throw error;
  }
}

/**
 * Mapea las preguntas del formulario a nombres de campos
 */
function mapQuestionToField(question) {
  const questionMappings = {
    "APELLIDO": "apellido",
    "NOMBRE": "nombre",
    "LOCALIDAD": "localidad", 
    "PROVINCIA": "provincia",
    "TELÉFONO": "telefono",
    "EMAIL": "mail",
    "VERTICALES": "verticales",
    "COMENTARIOS": "comentarios",
    "MONTO": "montoEstimado",
    "PRESUPUESTO": "presupuesto",
    "NOMBREREGISTRADOR": "operadorApp",
    "COMERCIALASIGNADO": "comercialAsignado",
    "EVENTO": "evento",
    "EMPRESAREGISTRADOR": "empresaOperador"
  };
  
  // Buscar coincidencia exacta o parcial
  for (const [key, value] of Object.entries(questionMappings)) {
    if (question.toUpperCase().includes(key)) {
      return value;
    }
  }
  
  // Para checkboxes, mapear por contenido
  if (question.toLowerCase().includes("weed") || question.toLowerCase().includes("seeker")) {
    return "weedSeeker";
  }
  if (question.toLowerCase().includes("siembra")) {
    return "solucionSiembra";
  }
  if (question.toLowerCase().includes("pulverización") || question.toLowerCase().includes("pulverizacion")) {
    return "solucionPulverizacion";
  }
  if (question.toLowerCase().includes("post") && question.toLowerCase().includes("venta")) {
    return "postVenta";
  }
  if (question.toLowerCase().includes("drone")) {
    return "dronesDJI";
  }
  if (question.toLowerCase().includes("guía") || question.toLowerCase().includes("autoguía")) {
    return "guiaAutoguia";
  }
  if (question.toLowerCase().includes("taps") || question.toLowerCase().includes("señales")) {
    return "tapsSenales";
  }
  if (question.toLowerCase().includes("qr")) {
    return "accionQR";
  }
  
  return null;
}

/**
 * Procesa las verticales/checkboxes seleccionadas
 */
function processVerticales(formData) {
  const verticales = [];
  
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
    if (formData[checkbox.field] === "TRUE" || formData[checkbox.field] === true) {
      verticales.push(checkbox.label);
    }
  }
  
  // Si hay campo verticales directo, agregarlo también
  if (formData.verticales) {
    verticales.push(formData.verticales);
  }
  
  return verticales.join(", ");
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
    
    // Construir descripción detallada
    let descripcion = `INFORMACIÓN DEL PROSPECTO\n`;
    descripcion += `=============================================\n\n`;
    
    descripcion += `DATOS PERSONALES:\n`;
    descripcion += `---------------------------------------------\n`;
    descripcion += `Nombre completo: ${nombreCompleto}\n`;
    descripcion += `Teléfono: ${formData.telefono || 'No proporcionado'}\n`;
    descripcion += `Email: ${formData.mail || 'No proporcionado'}\n\n`;
    
    descripcion += `UBICACIÓN:\n`;
    descripcion += `---------------------------------------------\n`;
    descripcion += `Localidad: ${formData.localidad || 'No proporcionada'}\n`;
    descripcion += `Provincia: ${formData.provincia || 'No proporcionada'}\n`;
    descripcion += `País: ${formData.pais || 'No proporcionado'}\n\n`;
    
    descripcion += `INTERESES (VERTICALES):\n`;
    descripcion += `---------------------------------------------\n`;
    descripcion += `${formData.concatenatedCheckboxes || 'No especificados'}\n\n`;
    
    descripcion += `DETALLES ADICIONALES:\n`;
    descripcion += `---------------------------------------------\n`;
    descripcion += `Comentarios: ${formData.comentarios || 'Sin comentarios'}\n`;
    descripcion += `Monto Estimado: ${formData.montoEstimado || 'No especificado'}\n\n`;
    
    descripcion += `INFORMACIÓN DEL EVENTO:\n`;
    descripcion += `---------------------------------------------\n`;
    descripcion += `Evento: ${formData.evento || 'No especificado'}\n\n`;
    
    descripcion += `INFORMACIÓN DE REGISTRO:\n`;
    descripcion += `---------------------------------------------\n`;
    descripcion += `Registrado por: ${formData.operadorApp || 'No especificado'}\n`;
    descripcion += `Empresa del registrador: ${formData.empresaOperador || 'No especificada'}\n`;
    descripcion += `Comercial asignado: ${formData.comercialAsignado || 'No asignado'}\n\n`;
    
    descripcion += `INFORMACIÓN ADICIONAL:\n`;
    descripcion += `---------------------------------------------\n`;
    descripcion += `Origen: Google Forms\n`;
    descripcion += `Fecha de registro: ${new Date().toLocaleString('es-AR')}\n`;
    
    // Construir los datos para Odoo
    const odooLeadData = {
      'name': `${nombreCompleto} - ${formData.concatenatedCheckboxes}`,
      'contact_name': nombreCompleto,
      'email_from': formData.mail || '',
      'phone': formData.telefono || '',
      'description': descripcion,
      'type': 'lead',
      'function': formData.operadorApp,
      'street': formData.localidad || '',
      'city': formData.localidad || '',
      'country_id': 10, // Argentina por defecto
      'campaign_id': '',
      'source_id': '',
      'referred': formData.evento || ''
    };
    
    // Buscar el ID del país dinámicamente si está especificado
    if (formData.pais) {
      const countryId = getCountryId(ODOO_CONFIG.url, ODOO_CONFIG.db, uid, ODOO_CONFIG.password, formData.pais);
      if (countryId) {
        odooLeadData['country_id'] = countryId;
        Logger.log("ID de país encontrado y asignado: " + countryId + " para " + formData.pais);
      }
    }
    
    // Buscar el ID de la provincia
    if (formData.provincia) {
      const provinceId = getProvinceId(ODOO_CONFIG.url, ODOO_CONFIG.db, uid, ODOO_CONFIG.password, formData.provincia, odooLeadData['country_id']);
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

// ===============================
// FUNCIONES DE NOTIFICACIÓN
// ===============================

/**
 * Enviar notificación por WhatsApp usando Wazzup (opcional)
 */
function sendWazzupNotification(formData) {
  // Esta función es opcional y requiere configuración adicional
  // Puedes implementarla basándote en tu función sendWazzupMessage original
  Logger.log("Función de notificación WhatsApp no implementada aún");
}

/**
 * Guardar envío fallido para retry manual
 */
function saveFailedSubmission(formData, error) {
  try {
    // Crear una hoja de cálculo para almacenar envíos fallidos
    const spreadsheetId = "TU_SPREADSHEET_ID_AQUI"; // Reemplazar con tu ID
    const sheet = SpreadsheetApp.openById(spreadsheetId).getActiveSheet();
    
    const row = [
      new Date(),
      formData.nombre || '',
      formData.apellido || '',
      formData.mail || '',
      formData.telefono || '',
      formData.localidad || '',
      formData.provincia || '',
      formData.concatenatedCheckboxes || '',
      formData.comentarios || '',
      formData.evento || '',
      error,
      'PENDIENTE'
    ];
    
    sheet.appendRow(row);
    Logger.log("Envío fallido guardado en hoja de cálculo");
    
  } catch (saveError) {
    Logger.log("Error al guardar envío fallido: " + saveError.toString());
  }
}

/**
 * Enviar notificación de error por email
 */
function sendErrorNotification(error, formEvent) {
  try {
    const subject = "Error en integración Google Forms -> Odoo";
    const body = `
Se produjo un error al procesar una respuesta del formulario:

Error: ${error.toString()}

Timestamp: ${new Date()}

Datos del evento: ${JSON.stringify(formEvent, null, 2)}

Por favor revisa los logs para más detalles.
    `;
    
    // Reemplaza con tu email
    const adminEmail = "maused@dyesa.com";
    
    MailApp.sendEmail(adminEmail, subject, body);
    Logger.log("Notificación de error enviada por email");
    
  } catch (emailError) {
    Logger.log("Error al enviar notificación por email: " + emailError.toString());
  }
}

// ===============================
// FUNCIONES DE CONFIGURACIÓN Y TESTING
// ===============================

/**
 * Función para configurar el trigger automáticamente
 * IMPORTANTE: Ejecuta esta función manualmente desde el editor de Apps Script
 */
function setupFormTrigger() {
  try {
    Logger.log("Iniciando configuración de trigger...");
    
    // Verificar permisos primero
    Logger.log("Verificando permisos de acceso...");
    
    // Eliminar triggers existentes para este formulario
    const triggers = ScriptApp.getProjectTriggers();
    Logger.log("Triggers existentes encontrados: " + triggers.length);
    
    for (const trigger of triggers) {
      if (trigger.getHandlerFunction() === 'onFormSubmit') {
        Logger.log("Eliminando trigger existente...");
        ScriptApp.deleteTrigger(trigger);
      }
    }
    
    // Intentar acceder al formulario
    Logger.log("Intentando acceder al formulario con ID: " + FORM_CONFIG.formId);
    const form = FormApp.openById(FORM_CONFIG.formId);
    Logger.log("Acceso al formulario exitoso. Título: " + form.getTitle());
      // Verificar si el formulario tiene hoja de cálculo vinculada
    Logger.log("Verificando si el formulario tiene hoja de cálculo vinculada...");
    
    try {
      const destinationId = form.getDestinationId();
      if (destinationId) {
        Logger.log("Formulario vinculado a hoja de cálculo: " + destinationId);
          // Crear trigger en la hoja de cálculo
        const spreadsheet = SpreadsheetApp.openById(destinationId);
        const newTrigger = ScriptApp.newTrigger('onFormSubmit')
          .onFormSubmit()
          .create();
          
        Logger.log("✅ Trigger configurado exitosamente en la hoja de cálculo");
        Logger.log("ID del trigger: " + newTrigger.getUniqueId());
        
      } else {
        Logger.log("❌ El formulario no está vinculado a una hoja de cálculo");
        Logger.log("📋 SOLUCIÓN: Necesitas vincular el formulario a una hoja de cálculo");
        Logger.log("1. Ve al formulario en modo edición");
        Logger.log("2. Haz clic en 'Respuestas' > Crear hoja de cálculo");
        Logger.log("3. Una vez vinculado, ejecuta esta función nuevamente");
        throw new Error("Formulario no vinculado a hoja de cálculo");
      }
      
    } catch (destinationError) {
      Logger.log("❌ Error al obtener destino del formulario: " + destinationError.toString());
      Logger.log("🔧 ALTERNATIVA: Configuración manual del trigger");
      throw destinationError;
    }
    
  } catch (error) {
    Logger.log("❌ Error al configurar trigger: " + error.toString());
    Logger.log("📝 SOLUCIONES POSIBLES:");
    Logger.log("1. Verifica que el ID del formulario sea correcto");
    Logger.log("2. Asegúrate de tener permisos de edición en el formulario");
    Logger.log("3. El formulario debe estar en tu Google Drive o compartido contigo");
    Logger.log("4. Usa la función setupTriggerManual() como alternativa");
    throw error;
  }
}

/**
 * Función alternativa para configurar trigger manualmente
 * Usa esta función si setupFormTrigger() falla
 */
function setupTriggerManual() {
  Logger.log("=== CONFIGURACIÓN MANUAL DE TRIGGER ===");
  Logger.log("El formulario necesita estar vinculado a una hoja de cálculo para funcionar.");
  Logger.log("");
  Logger.log("📋 PASOS PARA CONFIGURAR:");
  Logger.log("");
  Logger.log("OPCIÓN 1 - Vincular formulario a hoja de cálculo:");
  Logger.log("1. Ve a tu formulario: https://docs.google.com/forms/d/" + FORM_CONFIG.formId + "/edit");
  Logger.log("2. Haz clic en la pestaña 'Respuestas'");
  Logger.log("3. Haz clic en 'Crear hoja de cálculo' (ícono verde)");
  Logger.log("4. Una vez creada, ejecuta: setupFormTrigger()");
  Logger.log("");
  Logger.log("OPCIÓN 2 - Configurar trigger desde la hoja de cálculo:");
  Logger.log("1. Si ya tienes una hoja de cálculo vinculada, ábrela");
  Logger.log("2. Ve a Extensiones > Apps Script");
  Logger.log("3. Pega este código y configura el trigger");
  Logger.log("");
  Logger.log("OPCIÓN 3 - Configurar trigger manualmente en Apps Script:");
  Logger.log("1. Ve a 'Activadores' en el menú izquierdo del editor");
  Logger.log("2. Haz clic en '+ Agregar activador'");
  Logger.log("3. Configura:");
  Logger.log("   - Función: onFormSubmit");
  Logger.log("   - Origen del evento: Desde hojas de cálculo");
  Logger.log("   - Tipo de evento: Al enviar formulario");
  Logger.log("   - Selecciona la hoja vinculada al formulario");
  Logger.log("4. Haz clic en 'Guardar'");
  Logger.log("");
  Logger.log("Formulario ID: " + FORM_CONFIG.formId);
  Logger.log("=====================================");
}

/**
 * Función para configurar automáticamente la vinculación con hoja de cálculo
 */
function setupFormWithSpreadsheet() {
  try {
    Logger.log("🔗 Configurando formulario con hoja de cálculo...");
    
    const form = FormApp.openById(FORM_CONFIG.formId);
    Logger.log("Formulario encontrado: " + form.getTitle());
    
    // Verificar si ya está vinculado
    const existingDestination = form.getDestinationId();
    if (existingDestination) {
      Logger.log("✅ El formulario ya está vinculado a: " + existingDestination);
      
      // Configurar trigger en la hoja existente
      const spreadsheet = SpreadsheetApp.openById(existingDestination);
      
      // Eliminar triggers existentes
      const triggers = ScriptApp.getProjectTriggers();
      for (const trigger of triggers) {
        if (trigger.getHandlerFunction() === 'onFormSubmit') {
          ScriptApp.deleteTrigger(trigger);
        }
      }
        // Crear nuevo trigger
      const newTrigger = ScriptApp.newTrigger('onFormSubmit')
        .onFormSubmit()
        .create();
        
      Logger.log("✅ Trigger configurado en hoja existente");
      Logger.log("ID del trigger: " + newTrigger.getUniqueId());
      Logger.log("URL de la hoja: " + spreadsheet.getUrl());
      
    } else {
      Logger.log("❌ El formulario no está vinculado a ninguna hoja de cálculo");
      Logger.log("📋 Necesitas crear la vinculación manualmente:");
      Logger.log("1. Ve a: https://docs.google.com/forms/d/" + FORM_CONFIG.formId + "/edit");
      Logger.log("2. Pestaña 'Respuestas' > 'Crear hoja de cálculo'");
      Logger.log("3. Luego ejecuta: setupFormWithSpreadsheet()");
    }
    
  } catch (error) {
    Logger.log("❌ Error: " + error.toString());
    throw error;
  }
}

/**
 * Función para verificar el acceso al formulario
 */
function checkFormAccess() {
  try {
    Logger.log("Verificando acceso al formulario...");
    Logger.log("ID del formulario: " + FORM_CONFIG.formId);
    
    const form = FormApp.openById(FORM_CONFIG.formId);
    const title = form.getTitle();
    const items = form.getItems();
    
    Logger.log("✅ Acceso exitoso al formulario:");
    Logger.log("Título: " + title);
    Logger.log("Número de preguntas: " + items.length);
    Logger.log("URL de edición: " + form.getEditUrl());
    Logger.log("URL de respuesta: " + form.getPublishedUrl());
    
    // Verificar vinculación con hoja de cálculo
    try {
      const destinationId = form.getDestinationId();
      if (destinationId) {
        Logger.log("✅ Formulario vinculado a hoja de cálculo: " + destinationId);
        const spreadsheet = SpreadsheetApp.openById(destinationId);
        Logger.log("URL de la hoja: " + spreadsheet.getUrl());
      } else {
        Logger.log("⚠️ Formulario NO vinculado a hoja de cálculo");
        Logger.log("💡 Para configurar triggers automáticos, necesitas vincular el formulario");
      }
    } catch (destError) {
      Logger.log("⚠️ Error verificando vinculación: " + destError.toString());
    }
    
    // Mostrar las preguntas para verificar el mapeo
    Logger.log("\n📋 Preguntas del formulario:");
    items.forEach((item, index) => {
      const title = item.getTitle();
      const fieldName = mapQuestionToField(title);
      Logger.log(`${index + 1}. "${title}" -> ${fieldName || 'NO MAPEADO'} (Tipo: ${item.getType()})`);
    });
    
    return { success: true, form: form, hasDestination: !!form.getDestinationId() };
    
  } catch (error) {
    Logger.log("❌ Error al acceder al formulario: " + error.toString());
    Logger.log("💡 Posibles causas:");
    Logger.log("- ID del formulario incorrecto");
    Logger.log("- Sin permisos de acceso");
    Logger.log("- Formulario eliminado o movido");
    return { success: false, error: error.toString() };
  }
}

/**
 * Función de test para validar la integración
 */
function testIntegration() {
  Logger.log("=== INICIANDO TEST DE INTEGRACIÓN ===");
  
  // Datos de prueba
  const testFormData = {
    nombre: "Juan",
    apellido: "Pérez",
    mail: "juan.perez@test.com",
    telefono: "+54911234567",
    localidad: "Buenos Aires",
    provincia: "Buenos Aires",
    pais: "Argentina",
    concatenatedCheckboxes: "WeedSeeker, Solución Siembra",
    comentarios: "Test desde Google Forms",
    montoEstimado: "50000",
    evento: "Test Event",
    operadorApp: "Test Operator",
    empresaOperador: "Test Company",
    comercialAsignado: "Test Commercial"
  };
  
  try {
    const result = createOdooLead(testFormData);
    Logger.log("Resultado del test: " + JSON.stringify(result));
    
    if (result.success) {
      Logger.log("✅ Test exitoso - Lead creado con ID: " + result.lead_id);
    } else {
      Logger.log("❌ Test fallido: " + result.error);
    }
    
  } catch (error) {
    Logger.log("❌ Error en test: " + error.toString());
  }
  
  Logger.log("=== FIN TEST DE INTEGRACIÓN ===");
}

/**
 * Función para mostrar información de configuración
 */
function showConfiguration() {
  Logger.log("=== CONFIGURACIÓN ACTUAL ===");
  Logger.log("Formulario ID: " + FORM_CONFIG.formId);
  Logger.log("URL Odoo: " + ODOO_CONFIG.url);
  Logger.log("Base de datos: " + ODOO_CONFIG.db);
  Logger.log("Usuario: " + ODOO_CONFIG.login);
  Logger.log("Mapeo de campos: " + JSON.stringify(FORM_CONFIG.fieldMapping, null, 2));
  Logger.log("=== FIN CONFIGURACIÓN ===");
}

/**
 * Función para mostrar instrucciones detalladas de configuración
 */
function showSetupInstructions() {
  Logger.log("╔═══════════════════════════════════════════════════════════════════════════════╗");
  Logger.log("║                    INSTRUCCIONES DE CONFIGURACIÓN                            ║");
  Logger.log("║                   Google Forms → Odoo Integration                            ║");
  Logger.log("╚═══════════════════════════════════════════════════════════════════════════════╝");
  Logger.log("");
  Logger.log("🎯 OBJETIVO: Configurar trigger para capturar respuestas del formulario");
  Logger.log("");
  Logger.log("📋 PROBLEMA ACTUAL:");
  Logger.log("   El error 'onFormSubmit is not a function' indica que el trigger no se puede");
  Logger.log("   configurar directamente en el formulario. Necesita una hoja de cálculo.");
  Logger.log("");
  Logger.log("🔧 SOLUCIÓN - OPCIÓN 1 (RECOMENDADA):");
  Logger.log("   1. Ve a tu formulario: https://docs.google.com/forms/d/" + FORM_CONFIG.formId + "/edit");
  Logger.log("   2. Haz clic en la pestaña 'Respuestas'");
  Logger.log("   3. Haz clic en 'Crear hoja de cálculo' (ícono verde con +)");
  Logger.log("   4. Una vez creada la hoja, vuelve aquí y ejecuta: setupTriggerFromSpreadsheet()");
  Logger.log("");
  Logger.log("🔧 SOLUCIÓN - OPCIÓN 2 (MANUAL):");
  Logger.log("   1. Si ya tienes una hoja vinculada al formulario:");
  Logger.log("   2. Ve a esa hoja de cálculo en Google Sheets");
  Logger.log("   3. Menú Extensiones > Apps Script");
  Logger.log("   4. Copia y pega el código completo de GoogleFormsToOdoo.gs");
  Logger.log("   5. Ejecuta setupTriggerFromSpreadsheet() desde allí");
  Logger.log("");
  Logger.log("🔧 SOLUCIÓN - OPCIÓN 3 (TRIGGER MANUAL):");
  Logger.log("   1. En el editor de Apps Script, ve a 'Activadores' (menú izquierdo)");
  Logger.log("   2. Haz clic en '+ Agregar activador'");
  Logger.log("   3. Configura:");
  Logger.log("      - Función: onFormSubmit");
  Logger.log("      - Origen del evento: Desde hojas de cálculo");
  Logger.log("      - Tipo de evento: Al enviar formulario");
  Logger.log("      - Selecciona la hoja vinculada al formulario");
  Logger.log("   4. Haz clic en 'Guardar'");
  Logger.log("");
  Logger.log("🧪 VERIFICAR CONFIGURACIÓN:");
  Logger.log("   Ejecuta: checkTriggerStatus() para verificar que todo esté configurado");
  Logger.log("");
  Logger.log("🧪 PROBAR INTEGRACIÓN:");
  Logger.log("   Ejecuta: testOdooConnection() para probar la conexión con Odoo");
  Logger.log("   Ejecuta: testFormSubmission() para simular una respuesta");
  Logger.log("");
  Logger.log("📊 DATOS DEL FORMULARIO:");
  Logger.log("   ID: " + FORM_CONFIG.formId);
  Logger.log("   URL: https://docs.google.com/forms/d/" + FORM_CONFIG.formId);
  Logger.log("");
  Logger.log("🏢 CONFIGURACIÓN ODOO:");
  Logger.log("   URL: " + ODOO_CONFIG.url);
  Logger.log("   Base de datos: " + ODOO_CONFIG.database);
  Logger.log("   Usuario: " + ODOO_CONFIG.username);
  Logger.log("");
  Logger.log("❓ Si tienes problemas, ejecuta: diagnosticFormIntegration()");
  Logger.log("");
  Logger.log("╚═══════════════════════════════════════════════════════════════════════════════╝");
}

/**
 * Función para ejecutar todas las verificaciones necesarias
 */
function runFullDiagnostic() {
  Logger.log("🔍 EJECUTANDO DIAGNÓSTICO COMPLETO...");
  Logger.log("");
  
  try {
    Logger.log("1️⃣ Verificando acceso al formulario...");
    checkFormAccess();
    Logger.log("");
    
    Logger.log("2️⃣ Verificando estado de triggers...");
    checkTriggerStatus();
    Logger.log("");
    
    Logger.log("3️⃣ Verificando conexión con Odoo...");
    testOdooConnection();
    Logger.log("");
    
    Logger.log("✅ DIAGNÓSTICO COMPLETADO");
    Logger.log("Revisa los resultados arriba para identificar problemas");
    
  } catch (error) {
    Logger.log("❌ Error durante diagnóstico: " + error.toString());
  }
}
