/**
 * Test Final de Integración Corregida
 * Este script prueba la integración completa con las correcciones implementadas
 */

/**
 * Test completo con datos reales simulados
 */
function testCompleteIntegrationFixed() {
  Logger.log("🚀 TEST COMPLETO DE INTEGRACIÓN CORREGIDA");
  Logger.log("=" + "=".repeat(50));
  
  try {
    // Simular un evento de formulario con datos reales
    const mockFormData = {
      nombre: "Juan Carlos",
      apellido: "Pérez López", 
      mail: "jperez@agro.com",
      telefono: "+54 11 4567-8901",
      localidad: "Rosario",
      provincia: "Santa Fe",
      registrador: "María García",           // ✅ Corregido
      empresaRegistradora: "DyE Agro SRL",   // ✅ Corregido  
      comercial: "Carlos Vendedor",          // ✅ Corregido
      evento: "Expo Campo 2025",
      verticales: "WeedSeeker, Solución de Siembra, Post Venta",
      comentarios: "Cliente muy interesado en tecnología de precisión para cultivo de soja. Necesita cotización urgente.",
      montoEstimado: "$75,000",
      presupuesto: "Alto"
    };
    
    Logger.log("📝 DATOS DE ENTRADA:");
    Logger.log(JSON.stringify(mockFormData, null, 2));
    
    // Procesar verticales
    mockFormData.concatenatedCheckboxes = processVerticales(mockFormData);
    Logger.log("\n🎯 Verticales procesadas: " + mockFormData.concatenatedCheckboxes);
    
    // Agregar país por defecto
    if (!mockFormData.pais) {
      mockFormData.pais = "Argentina";
    }
    
    Logger.log("\n📋 DATOS DESPUÉS DEL PROCESAMIENTO:");
    Logger.log("👤 Persona: " + mockFormData.nombre + " " + mockFormData.apellido);
    Logger.log("📧 Email: " + (mockFormData.mail || 'No proporcionado'));
    Logger.log("📞 Teléfono: " + (mockFormData.telefono || 'No proporcionado'));
    Logger.log("🏢 Empresa registradora: " + (mockFormData.empresaRegistradora || 'No especificada'));
    Logger.log("👨‍💼 Registrador/Operador: " + (mockFormData.registrador || 'No especificado'));
    Logger.log("💼 Comercial asignado: " + (mockFormData.comercial || 'No asignado'));
    Logger.log("🎯 Verticales: " + (mockFormData.concatenatedCheckboxes || 'Ninguna'));
    Logger.log("💬 Comentarios: " + (mockFormData.comentarios || 'Sin comentarios'));
    Logger.log("🎪 Evento: " + (mockFormData.evento || 'No especificado'));
    
    Logger.log("\n✅ DATOS PREPARADOS PARA ODOO");
    Logger.log("🔄 Para enviar realmente a Odoo, ejecute: testRealOdooConnection()");
    
  } catch (error) {
    Logger.log("❌ Error en test: " + error.toString());
    Logger.log("📝 Stack: " + (error.stack || 'No disponible'));
  }
}

/**
 * Test de conexión real a Odoo con datos corregidos
 */
function testRealOdooConnection() {
  Logger.log("🌐 TEST DE CONEXIÓN REAL A ODOO");
  Logger.log("=" + "=".repeat(40));
  
  try {
    // Datos de prueba para envío real
    const testFormData = {
      nombre: "TEST",
      apellido: "INTEGRACIÓN",
      mail: "test@dye.com",
      telefono: "+54 11 1111-1111",
      localidad: "Buenos Aires",
      provincia: "Buenos Aires",
      pais: "Argentina",
      registrador: "Test Registrador",
      empresaRegistradora: "DyE Test",
      comercial: "Admin", // Usar un usuario que probablemente existe
      evento: "Test Integración",
      concatenatedCheckboxes: "WeedSeeker, Test",
      comentarios: "Este es un lead de prueba generado por la integración de Google Forms"
    };
    
    Logger.log("📤 Enviando lead de prueba a Odoo...");
    Logger.log("📝 Datos: " + JSON.stringify(testFormData, null, 2));
    
    // Enviar a Odoo
    const odooResult = createOdooLead(testFormData);
    
    if (odooResult && odooResult.success) {
      Logger.log("🎉 ¡ÉXITO! Lead creado en Odoo con ID: " + odooResult.lead_id);
      Logger.log("✅ La integración está funcionando correctamente");
      Logger.log("🔗 URL lead: " + ODOO_CONFIG.url + "/web#id=" + odooResult.lead_id + "&model=crm.lead");
    } else {
      Logger.log("❌ Error al crear lead: " + (odooResult ? odooResult.error : 'Sin respuesta'));
    }
    
  } catch (error) {
    Logger.log("❌ Error en conexión: " + error.toString());
    Logger.log("🔧 Verificar configuración de Odoo y credenciales");
  }
}

/**
 * Test de verificación de mapeos corregidos
 */
function testMappingCorrections() {
  Logger.log("🔍 VERIFICACIÓN DE MAPEOS CORREGIDOS");
  Logger.log("=" + "=".repeat(40));
  
  const testMappings = [
    { input: "EMPRESAREGISTRADOR", expected: "empresaRegistradora" },
    { input: "Registrador", expected: "registrador" },
    { input: "Asignado a:", expected: "comercial" },
    { input: "NOMBRE", expected: "nombre" },
    { input: "APELLIDO", expected: "apellido" },
    { input: "EMAIL", expected: "mail" },
    { input: "TELEFONO", expected: "telefono" }
  ];
  
  let allCorrect = true;
  
  testMappings.forEach(test => {
    const result = mapQuestionToField(test.input);
    const isCorrect = result === test.expected;
    
    Logger.log((isCorrect ? "✅" : "❌") + ` "${test.input}" → "${result}" (esperado: "${test.expected}")`);
    
    if (!isCorrect) {
      allCorrect = false;
    }
  });
  
  if (allCorrect) {
    Logger.log("\n🎉 ¡TODOS LOS MAPEOS ESTÁN CORRECTOS!");
  } else {
    Logger.log("\n⚠️ Algunos mapeos necesitan corrección");
  }
  
  return allCorrect;
}

/**
 * Suite completa de tests
 */
function runAllTests() {
  Logger.log("🧪 EJECUTANDO SUITE COMPLETA DE TESTS");
  Logger.log("=" + "=".repeat(50));
  
  const tests = [
    { name: "Mapeos Corregidos", func: testMappingCorrections },
    { name: "Integración Completa", func: testCompleteIntegrationFixed }
  ];
  
  let allPassed = true;
  
  tests.forEach((test, index) => {
    Logger.log(`\n${index + 1}. EJECUTANDO: ${test.name}`);
    Logger.log("-".repeat(30));
    
    try {
      const result = test.func();
      if (result === false) {
        allPassed = false;
      }
      Logger.log(`✅ ${test.name} completado`);
    } catch (error) {
      Logger.log(`❌ Error en ${test.name}: ${error.toString()}`);
      allPassed = false;
    }
  });
  
  Logger.log("\n" + "=" + "=".repeat(50));
  Logger.log(allPassed ? "🎉 TODOS LOS TESTS PASARON" : "⚠️ ALGUNOS TESTS FALLARON");
  Logger.log("=" + "=".repeat(50));
  
  if (allPassed) {
    Logger.log("\n🚀 PRÓXIMO PASO: Ejecutar testRealOdooConnection() para probar con Odoo real");
  }
  
  return allPassed;
}
