/**
 * ==============================================================================
 * CONECTOR OFICIAL FERREJADE, C.A. PARA GOOGLE DRIVE & GOOGLE SHEETS
 * Cuenta: ferrejadepzo@gmail.com
 * ==============================================================================
 * Este script convierte tu Google Sheet en un microservicio en la nube 100% gratuito.
 * Recibe los productos escaneados con la IA de la aplicación móvil de FerreJade,
 * guarda la información en la hoja de cálculo y almacena la foto física en una
 * carpeta de tu Google Drive, insertando el enlace directo a la imagen.
 *
 * 📋 INSTRUCCIONES DE INSTALACIÓN (Solo toma 2 minutos):
 * 1. Entra a tu Google Drive con tu correo (ferrejadepzo@gmail.com).
 * 2. Crea una Hoja de Cálculo de Google en blanco y nómbrala "FerreJade - Catálogo Maestro".
 * 3. En el menú superior de la hoja, haz clic en: Extensiones -> Apps Script.
 * 4. Borra todo el código que aparezca y pega este código completo.
 * 5. Haz clic en el disquete "Guardar" (Ctrl + S).
 * 6. Haz clic en el botón azul superior "Implementar" -> "Nueva implementación".
 * 7. En el icono de engranaje (⚙️), selecciona: "Aplicación web".
 * 8. Configura los campos:
 *    - Descripción: Conector FerreJade Catálogo IA
 *    - Ejecutar como: "Yo (ferrejadepzo@gmail.com)"
 *    - Quién tiene acceso: "Cualquier persona" (Anyone)
 * 9. Haz clic en "Implementar" y autoriza los permisos de Google.
 * 10. Copia la "URL de la aplicación web" generada (termina en /exec) y pégala
 *     en el sistema FerreJade en: Ajustes -> Conexión Google Drive / Sheets.
 * ==============================================================================
 */

function doPost(e) {
  try {
    var lock = LockService.getScriptLock();
    lock.waitLock(30000); // Evitar condiciones de carrera en escaneos simultáneos

    var payload = {};
    if (e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    } else {
      payload = e.parameter || {};
    }

    var sheet = getOrCreateCatalogSheet();
    var folder = getOrCreateDriveFolder("FerreJade - Fotos de Productos");

    // Si viene un solo producto o una lista de productos
    var products = [];
    if (payload.products && Array.isArray(payload.products)) {
      products = payload.products;
    } else if (payload.product) {
      products = [payload.product];
    } else {
      products = [payload];
    }

    var savedCount = 0;
    var lastFileUrl = "";

    for (var i = 0; i < products.length; i++) {
      var p = products[i];
      if (!p.name && !p.sku) continue;

      var fileUrl = "";
      // Si el producto incluye la imagen en Base64 tomada por el escáner
      var rawImage = p.imageBase64 || p.imageUrl || "";
      if (rawImage && rawImage.indexOf("base64,") !== -1) {
        try {
          var cleanBase64 = rawImage.split("base64,")[1];
          var contentType = "image/jpeg";
          if (rawImage.indexOf("image/png") !== -1) contentType = "image/png";
          else if (rawImage.indexOf("image/webp") !== -1) contentType = "image/webp";

          var fileName = (p.sku || "PRODUCTO") + "_" + Utilities.formatDate(new Date(), "GMT-4", "yyyyMMdd_HHmmss") + ".jpg";
          var decoded = Utilities.base64Decode(cleanBase64);
          var blob = Utilities.newBlob(decoded, contentType, fileName);
          var file = folder.createFile(blob);
          file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          fileUrl = file.getUrl();
          lastFileUrl = fileUrl;
        } catch (imgErr) {
          fileUrl = "Error al guardar imagen: " + imgErr.toString();
        }
      } else if (rawImage.indexOf("http") === 0) {
        fileUrl = rawImage;
      }

      var nowStr = Utilities.formatDate(new Date(), "GMT-4", "yyyy-MM-dd HH:mm:ss");
      var cost = parseFloat(p.cost || p.costUsd || 0);
      var priceUsd = parseFloat(p.price || p.priceUsd || 0);
      var margin = cost > 0 ? Math.round(((priceUsd - cost) / cost) * 100) + "%" : "N/A";
      var rateBcv = parseFloat(p.rateBcv || payload.rateBcv || 893.22);
      var priceBs = (priceUsd * rateBcv).toFixed(2);

      sheet.appendRow([
        nowStr,
        p.sku || "",
        p.barcode || "",
        p.name || "",
        p.brand || "Genérico",
        p.category || p.cat || "General",
        cost > 0 ? cost : "",
        margin,
        priceUsd > 0 ? priceUsd : "",
        priceBs,
        p.stock !== undefined ? p.stock : 1,
        p.unit || "UND",
        p.location || "Pasillo General",
        p.warranty || "N/A",
        p.specs || p.description || p.desc || "",
        fileUrl
      ]);
      savedCount++;
    }

    lock.releaseLock();

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Se guardaron " + savedCount + " producto(s) en Google Sheets y Drive correctamente.",
      savedCount: savedCount,
      driveFileUrl: lastFileUrl
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "online",
    system: "FerreJade Cloud Connector v1.0",
    account: "ferrejadepzo@gmail.com",
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Obtiene o inicializa la pestaña con encabezados corporativos FerreJade
 */
function getOrCreateCatalogSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Catálogo FerreJade");
  if (!sheet) {
    sheet = ss.insertSheet("Catálogo FerreJade", 0);
  }

  // Si la hoja está vacía, colocar cabecera profesional con estilo FerreJade
  if (sheet.getLastRow() === 0) {
    var headers = [
      "Fecha y Hora",
      "SKU",
      "Código de Barras",
      "Nombre del Producto",
      "Marca",
      "Categoría",
      "Costo USD ($)",
      "Margen %",
      "Precio Venta USD ($)",
      "Precio Venta BCV (Bs)",
      "Stock Físico",
      "Unidad",
      "Ubicación Pasillo/Estante",
      "Garantía",
      "Especificaciones Técnicas",
      "Foto en Google Drive"
    ];
    sheet.appendRow(headers);

    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground("#003333"); // Verde Jade FerreJade
    headerRange.setFontColor("#CFB53B");  // Dorado FerreJade
    headerRange.setFontWeight("bold");
    headerRange.setFontSize(11);
    headerRange.setHorizontalAlignment("center");
    sheet.setFrozenRows(1);

    // Ajustar anchos iniciales
    sheet.setColumnWidth(1, 150); // Fecha
    sheet.setColumnWidth(2, 120); // SKU
    sheet.setColumnWidth(3, 130); // Barras
    sheet.setColumnWidth(4, 250); // Nombre
    sheet.setColumnWidth(5, 120); // Marca
    sheet.setColumnWidth(6, 150); // Categoría
    sheet.setColumnWidth(7, 100); // Costo
    sheet.setColumnWidth(8, 80);  // Margen
    sheet.setColumnWidth(9, 110); // Precio USD
    sheet.setColumnWidth(10, 120);// Precio Bs
    sheet.setColumnWidth(11, 90); // Stock
    sheet.setColumnWidth(12, 80); // Unidad
    sheet.setColumnWidth(13, 150);// Ubicación
    sheet.setColumnWidth(14, 100);// Garantía
    sheet.setColumnWidth(15, 260);// Specs
    sheet.setColumnWidth(16, 220);// Drive link
  }

  return sheet;
}

/**
 * Busca o crea la carpeta de fotos en Google Drive
 */
function getOrCreateDriveFolder(folderName) {
  var folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  }
  return DriveApp.createFolder(folderName);
}
