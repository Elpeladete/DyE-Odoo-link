/**
 * Test Script para Google Forms to Odoo Integration
 * Este archivo puede ser usado para probar las funciones individualmente
 */

// Función simple para probar que el script principal carga correctamente
function testScriptLoading() {
  try {
    Logger.log("=== PRUEBA DE CARGA DEL SCRIPT ===");
    
    // Verificar que las configuraciones están definidas
    Logger.log("✅ ODOO_CONFIG definido: " + (typeof ODOO_CONFIG !== 'undefined'));
    Logger.log("✅ FORM_CONFIG definido: " + (typeof FORM_CONFIG !== 'undefined'));
    
    // Verificar configuraciones principales
    if (typeof ODOO_CONFIG !== 'undefined') {
      Logger.log("📄 URL Odoo: " + ODOO_CONFIG.url);
      Logger.log("📄 Base de datos: " + ODOO_CONFIG.db);
      Logger.log("📄 Usuario: " + ODOO_CONFIG.login);
    }
    
    if (typeof FORM_CONFIG !== 'undefined') {
      Logger.log("📋 Form ID: " + FORM_CONFIG.formId);
      Logger.log("📋 Cantidad de mapeos: " + Object.keys(FORM_CONFIG.fieldMapping).length);
    }
    
    // Verificar que las funciones principales existen
    const mainFunctions = [
      'onFormSubmit',
      'extractFormData', 
      'createOdooLead',
      'xmlrpcLogin',
      'testLocationSearch',
      'testNewFieldMappings',
      'testSalespersonSearch'
    ];
    
    Logger.log("\n🔍 Verificando funciones principales:");
    mainFunctions.forEach(funcName => {
      const exists = typeof eval(funcName) === 'function';
      Logger.log((exists ? "✅" : "❌") + " " + funcName + ": " + (exists ? "OK" : "NO ENCONTRADA"));
    });
    
    Logger.log("\n🎉 Script cargado correctamente - listo para usar!");
    Logger.log("\n📋 PRÓXIMOS PASOS:");
    Logger.log("1. Ejecutar testNewFieldMappings() para probar mapeo");
    Logger.log("2. Ejecutar testLocationSearch() para probar ubicaciones");
    Logger.log("3. Ejecutar testSalespersonSearch() para probar vendedores");
    Logger.log("4. Configurar trigger de formulario para producción");
    
  } catch (error) {
    Logger.log("❌ Error al cargar script: " + error.toString());
    Logger.log("📝 Stack trace: " + (error.stack || 'No disponible'));
  }
}

// Función para probar conexión básica a Odoo
function testOdooConnection() {
  try {
    Logger.log("=== PRUEBA DE CONEXIÓN A ODOO ===");
    
    Logger.log("🔗 Intentando conectar a: " + ODOO_CONFIG.url);
    Logger.log("🗃️ Base de datos: " + ODOO_CONFIG.db);
    Logger.log("👤 Usuario: " + ODOO_CONFIG.login);
    
    const uid = xmlrpcLogin(ODOO_CONFIG.url, ODOO_CONFIG.db, ODOO_CONFIG.login, ODOO_CONFIG.password);
    
    if (uid && uid > 0) {
      Logger.log("✅ ¡Conexión exitosa! UID: " + uid);
      Logger.log("🎉 El script puede conectarse correctamente a Odoo");
    } else {
      Logger.log("❌ Conexión fallida - UID inválido: " + uid);
    }
    
  } catch (error) {
    Logger.log("❌ Error de conexión: " + error.toString());
    Logger.log("🔧 Verificar URL, credenciales y conectividad");
  }
}
