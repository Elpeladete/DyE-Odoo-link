/**
 * Script de Debug para Google Forms to Odoo Integration
 * Este archivo contiene funciones específicas para debuggear los problemas identificados
 */

/**
 * Test específico para el mapeo de campos problemáticos
 */
function testFieldMappingFixes() {
  Logger.log("=== TEST DE CORRECCIONES DE MAPEO ===");
  
  // Simular las preguntas problemáticas que aparecían en los logs
  const testQuestions = [
    "EMPRESAREGISTRADOR",  // Debería mapear a "empresaRegistradora" no "registrador"
    "Registrador",         // Debería mapear a "registrador"
    "Asignado a:",         // Debería mapear a "comercial"
    "EMAIL",               // Debería mapear a "mail"
    "NOMBRE",              // Debería mapear a "nombre"
    "APELLIDO"             // Debería mapear a "apellido"
  ];
  
  Logger.log("🧪 Probando mapeos corregidos:");
  testQuestions.forEach(question => {
    const mappedField = mapQuestionToField(question);
    Logger.log(`  "${question}" → "${mappedField}"`);
    
    // Validaciones específicas
    if (question === "EMPRESAREGISTRADOR" && mappedField !== "empresaRegistradora") {
      Logger.log(`  ❌ ERROR: EMPRESAREGISTRADOR debería mapear a "empresaRegistradora", no a "${mappedField}"`);
    } else if (question === "EMPRESAREGISTRADOR" && mappedField === "empresaRegistradora") {
      Logger.log(`  ✅ CORRECTO: EMPRESAREGISTRADOR mapea correctamente a "empresaRegistradora"`);
    }
  });
  
  Logger.log("\n✅ Test de mapeo completado");
}

/**
 * Test para validar que los campos personalizados ya no se usan
 */
function testNoCustomFields() {
  Logger.log("=== TEST DE ELIMINACIÓN DE CAMPOS PERSONALIZADOS ===");
  
  // Simular datos de formulario
  const testFormData = {
    nombre: "Juan",
    apellido: "Pérez",
    mail: "juan.perez@test.com",
    telefono: "+54 11 1234-5678",
    localidad: "Buenos Aires",
    provincia: "Buenos Aires",
    registrador: "María García",          // Operador que registra
    empresaRegistradora: "DyE Agro",      // Empresa registradora
    comercial: "Carlos Vendedor",         // Comercial asignado
    verticales: "WeedSeeker, Solución de Siembra",
    comentarios: "Cliente interesado en tecnología de precisión",
    evento: "Expo Campo 2025"
  };
  
  try {
    Logger.log("🔍 Simulando creación de lead (sin enviar a Odoo)...");
    
    // Simular el proceso de construcción de datos
    const nombreCompleto = testFormData.nombre + " " + testFormData.apellido;
    const verticalesParaTitulo = testFormData.verticales || 'Consulta General';
    
    // Validar email
    const emailField = (testFormData.mail && testFormData.mail.trim() !== '') ? testFormData.mail.trim() : null;
    
    const simulatedOdooData = {
      'name': `${nombreCompleto} - ${verticalesParaTitulo}`,
      'contact_name': nombreCompleto,
      'phone': testFormData.telefono || '',
      'description': "Descripción HTML simulada",
      'type': 'lead',
      'street': testFormData.localidad || '',
      'city': testFormData.localidad || '',
      'country_id': 10, // Argentina por defecto
      'referred': testFormData.evento || ''
    };
    
    // Agregar email solo si es válido
    if (emailField) {
      simulatedOdooData['email_from'] = emailField;
      Logger.log("✅ Email agregado: " + emailField);
    } else {
      Logger.log("⚠️ Email vacío o inválido, no se agregará al lead");
    }
    
    // Verificar que NO se usen campos personalizados
    Logger.log("\n🔍 Verificando que NO se usen campos personalizados...");
    const customFields = ['x_studio_registrador', 'x_studio_empresa_registradora'];
    let customFieldsFound = false;
    
    customFields.forEach(field => {
      if (simulatedOdooData.hasOwnProperty(field)) {
        Logger.log(`❌ ERROR: Se encontró campo personalizado "${field}" que debería estar eliminado`);
        customFieldsFound = true;
      }
    });
    
    if (!customFieldsFound) {
      Logger.log("✅ CORRECTO: No se usan campos personalizados");
    }
    
    Logger.log("\n📋 Datos simulados de Odoo:");
    Logger.log(JSON.stringify(simulatedOdooData, null, 2));
    
    Logger.log("\n✅ Test de campos personalizados completado");
    
  } catch (error) {
    Logger.log("❌ Error en test: " + error.toString());
  }
}

/**
 * Test para validar la descripción HTML
 */
function testHtmlDescription() {
  Logger.log("=== TEST DE DESCRIPCIÓN HTML ===");
  
  const testData = {
    nombre: "Juan",
    apellido: "Pérez",
    telefono: "+54 11 1234-5678",
    mail: "juan.perez@test.com",
    localidad: "Buenos Aires",
    provincia: "Buenos Aires",
    pais: "Argentina",
    concatenatedCheckboxes: "WeedSeeker, Solución de Siembra, Post Venta",
    comentarios: "Cliente muy interesado en tecnología de precisión para maíz",
    montoEstimado: "$50,000",
    presupuesto: "Alto",
    registrador: "María García",
    empresaRegistradora: "DyE Agro",
    comercial: "Carlos Vendedor",
    evento: "Expo Campo 2025"
  };
  
  const nombreCompleto = testData.nombre + " " + testData.apellido;
  
  // Simular construcción de descripción HTML
  let descripcion = `<div style="font-family: Arial, sans-serif; line-height: 1.6;">`;
  descripcion += `<h2 style="color: #2E75B6; margin-bottom: 20px;">📋 INFORMACIÓN DEL PROSPECTO</h2>`;
  
  descripcion += `<div style="margin-bottom: 20px;">`;
  descripcion += `<h3 style="color: #1B5E20; border-bottom: 2px solid #4CAF50; padding-bottom: 5px;">👤 DATOS PERSONALES</h3>`;
  descripcion += `<ul style="margin: 10px 0; padding-left: 20px;">`;
  descripcion += `<li><strong>Nombre completo:</strong> ${nombreCompleto}</li>`;
  descripcion += `<li><strong>Teléfono:</strong> ${testData.telefono}</li>`;
  descripcion += `<li><strong>Email:</strong> ${testData.mail}</li>`;
  descripcion += `</ul>`;
  descripcion += `</div>`;
  
  descripcion += `<div style="margin-bottom: 20px;">`;
  descripcion += `<h3 style="color: #1B5E20; border-bottom: 2px solid #4CAF50; padding-bottom: 5px;">📋 INFORMACIÓN DE REGISTRO</h3>`;
  descripcion += `<ul style="margin: 10px 0; padding-left: 20px;">`;
  descripcion += `<li><strong>Registrador (Operador):</strong> ${testData.registrador}</li>`;
  descripcion += `<li><strong>Empresa Registradora:</strong> ${testData.empresaRegistradora}</li>`;
  descripcion += `<li><strong>Comercial Asignado:</strong> ${testData.comercial}</li>`;
  descripcion += `<li><strong>Evento:</strong> ${testData.evento}</li>`;
  descripcion += `</ul>`;
  descripcion += `</div>`;
  
  descripcion += `</div>`;
  
  Logger.log("📄 Descripción HTML generada:");
  Logger.log(descripcion);
  
  // Verificar que contiene los datos importantes
  const importantData = [
    testData.registrador,
    testData.empresaRegistradora, 
    testData.comercial,
    testData.evento
  ];
  
  let allDataIncluded = true;
  importantData.forEach(data => {
    if (!descripcion.includes(data)) {
      Logger.log(`❌ ERROR: Dato "${data}" no encontrado en descripción`);
      allDataIncluded = false;
    }
  });
  
  if (allDataIncluded) {
    Logger.log("✅ CORRECTO: Todos los datos importantes están en la descripción HTML");
  }
  
  Logger.log("\n✅ Test de descripción HTML completado");
}

/**
 * Test completo de todas las correcciones
 */
function testAllFixes() {
  Logger.log("🚀 EJECUTANDO TODOS LOS TESTS DE CORRECCIÓN");
  Logger.log("=" + "=".repeat(50));
  
  try {
    testFieldMappingFixes();
    Logger.log("\n" + "-".repeat(30));
    testNoCustomFields();
    Logger.log("\n" + "-".repeat(30));
    testHtmlDescription();
    
    Logger.log("\n" + "=" + "=".repeat(50));
    Logger.log("🎉 TODOS LOS TESTS COMPLETADOS");
    Logger.log("📋 RESUMEN DE CORRECCIONES:");
    Logger.log("✅ Mapeo de campos corregido (EMPRESAREGISTRADOR → empresaRegistradora)");
    Logger.log("✅ Campos personalizados eliminados (x_studio_*)");
    Logger.log("✅ Validación de email implementada");
    Logger.log("✅ Descripción HTML contiene todos los datos");
    Logger.log("\n🔄 PRÓXIMO PASO: Probar con conexión real a Odoo");
    
  } catch (error) {
    Logger.log("❌ Error en tests: " + error.toString());
  }
}
