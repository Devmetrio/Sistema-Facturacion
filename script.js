// Seleccionamos los elementos del DOM que vamos a utilizar
const FORM = document.getElementById("formId");
const INPUT = document.getElementById("inputId");
const TABLE = document.getElementById("table-content");
const BTN = document.getElementById("btnGozu");
let contadorCUO = 1;  // Este contador puede almacenarse y recuperarse de una base de datos
let contadorAsiento = 1;  // También puede almacenarse en base de datos
let numeroSecuencialVenta;
// Añadimos un evento al botón de extracción
document.querySelector('.extraer').addEventListener('click', function (event) {
    event.preventDefault(); // Prevenimos el envío del formulario

    // Verificamos si se ha seleccionado un archivo
    if (INPUT.files.length === 0) {
        console.log("No file selected");
        return;
    }

    // Creamos un nuevo objeto FileReader para leer el archivo XML
    let reader = new FileReader();
    reader.readAsText(INPUT.files[0]);

    // Cuando la lectura del archivo se complete
    reader.onload = function (element) {
        // Parseamos el contenido del XML
        let xmlFile = $.parseXML(element.target.result);

        // Extraemos la fecha de emisión (cbc:IssueDate) del XML
        let fechaEmision = xmlFile.getElementsByTagName("cbc:IssueDate")[0]?.textContent || "N/A";
        // Verificamos si la fecha de emisión fue extraída correctamente
        let PeriodoInformado = "N/A";
        let AñoEmision = "";
        if (fechaEmision !== "N/A") {
            // Dividimos la fecha en componentes (formato YYYY-MM-DD)
            let partesFecha = fechaEmision.split("-");
            AñoEmision = partesFecha[0];
            // Concatenamos el año (YYYY), mes (MM), y agregamos '00'
            PeriodoInformado = partesFecha[0] + partesFecha[1] + "00";
        }

        // Función para asegurar dos dígitos
        function addZero(value) {
            return value < 10 ? `0${value}` : value;
        }
        // Obtenemos la fecha actual
        let date = new Date();
        // Extraemos el año, mes y día asegurando que el mes y día siempre tengan dos dígitos
        let year = date.getFullYear();
        let month = addZero(date.getMonth() + 1); // Los meses empiezan desde 0, por eso sumamos 1
        let day = addZero(date.getDate());
        // Formateamos la fecha a yyyy-mm-dd
        let currentDate = `${year}-${month}-${day}`;
        // Formamos la cadena deseada: yyyy + mm + '00'
        let PeriodoActual = `${year}${month}00`;

        // Generar CUO basado en la fecha y un contador único
        function generarCUO() {
            // Incrementamos el contador para cada nueva operación
            let CUO = `${PeriodoActual}-CUO${contadorCUO.toString().padStart(5, '0')}`;
            contadorCUO++;  // Aumentamos el contador para el próximo CUO
            return CUO;
        }

        // Generar número de asiento basado en la fecha y un contador único
        function generarNumAsiento() {
            let periodoModificado = PeriodoActual.slice(0, -2);  // Elimina los últimos 2 caracteres
            let NumAsiento = `${periodoModificado}-${contadorAsiento.toString().padStart(5, '0')}`;
            contadorAsiento++;  // Aumentamos el contador para el próximo asiento
            return NumAsiento;
        }


        // URL de la API de ExchangeRate-API para obtener tasas de cambio basadas en PEN
        const apiURL = 'https://api.exchangerate-api.com/v4/latest/PEN';
        // Función simple para obtener la tasa de cambio en soles
        async function obtenerEquivalenteSoles(monedita) {
            const response = await fetch(apiURL);
            const data = await response.json();
            // Si la moneda existe, se devuelve la tasa, si no, se retorna "N/A"
            return data.rates[monedita] || "N/A";
        }
        // Reemplazo sencillo del código original
        async function procesarMoneda(xmlFile) {
            // Obtener la moneda desde el XML
            let monedita = xmlFile.getElementsByTagName("cbc:DocumentCurrencyCode")[0]?.textContent || "N/A";
            let monedita_code;
            let equivalente_soles;
            if (monedita === 'PEN') {
                monedita_code = 1;  // Nuevos Soles
                equivalente_soles = 1;  // Ya está en soles
            } else {
                // Obtener el valor equivalente en soles usando la API
                monedita_code = monedita === 'USD' ? 2 : 9;  // USD o cualquier otra moneda
                equivalente_soles = await obtenerEquivalenteSoles(monedita);
            }

            // CAMPO 42
            let elIGV = xmlFile.getElementsByTagName("cac:TaxTotal")[0]
                ?.getElementsByTagName("cbc:TaxAmount")[0]
                ?.textContent || "N/A";
            let owo;
            // Convertir las fechas a objetos Date
            const fechaEmisionDate = new Date(fechaEmision);
            const dateDate = new Date(date);
            // Obtener la diferencia en meses
            const diferenciaMeses = (dateDate.getFullYear() - fechaEmisionDate.getFullYear()) * 12 + (dateDate.getMonth() - fechaEmisionDate.getMonth());
            if (PeriodoActual === PeriodoInformado) {
                owo = elIGV === "N/A" ? 0 : 1;  // 0: No hay IGV, 1: Hay IGV
            } else if (PeriodoActual > PeriodoInformado) {
                if (diferenciaMeses <= 12) {
                    owo = '6'; // Diferencia de 12 meses o menos
                } else {
                    owo = '7'; // Más de 12 meses de diferencia
                }
            } else {
                owo = 'Vaya vaya, tenemos un caso inusual eh e.e';
            }

            // Extraemos el elemento cbc:ID con el atributo schemeID dentro de cac:AccountingSupplierParty
            let supplierPartyIdentification = xmlFile.getElementsByTagName("cac:AccountingSupplierParty")[0]
                ?.getElementsByTagName("cac:PartyIdentification")[0]
                ?.getElementsByTagName("cbc:ID")[0];
            // Extraemos únicamente el valor del atributo schemeID
            let schemeID = supplierPartyIdentification?.getAttribute("schemeID") || "N/A";
            let importeTotal = xmlFile.getElementsByTagName("cac:LegalMonetaryTotal")[0]
                ?.getElementsByTagName("cbc:PayableAmount")[0]
                ?.textContent || "N/A";

            let tipoComprobante = xmlFile.getElementsByTagName("cbc:InvoiceTypeCode")[0]?.textContent || "N/A";
            
            // Lista de medios de pago válidos según la Tabla 1 de SUNAT
            const mediosPagoValidos = [
                '001', '002', '003', '004', '005', '006', '007', '008', '009', '010',
                '011', '012', '013', '101', '102', '103', '104', '105', '106', '107',
                '108', '999'
            ];

            function calcularNumeroFinal(campo6, campo9) {
                // Array de códigos válidos para el campo 6
                const codigosValidosCampo6 = [
                    '00', '03', '05', '06', '07', '08', '11', '12',
                    '13', '14', '15', '16', '18', '19', '23', '26',
                    '28', '30', '34', '35', '36', '37', '55', '56',
                    '87', '88'
                ];

                // Verificamos las condiciones
                if (codigosValidosCampo6.includes(campo6) && campo9 >= 0) {
                    return `VTA-${String(numeroSecuencialVenta).padStart(4, '0')++}`; // Retorna el número secuencial de la venta formateado
                } else {
                    return "N/A";  // O cualquier valor por defecto que prefieras
                }
            }

            // Extraemos datos específicos del XML y verificamos su existencia
            let data = {
                Periodo: PeriodoActual,
                CUO: generarCUO(),
                NumAsiento: generarNumAsiento(),
                FechaEmision: fechaEmision,
                FechaVencimiento: xmlFile.getElementsByTagName("cbc:DueDate")[0]?.textContent || "N/A",
                TipoComprobante: tipoComprobante,
                SerieComprobante: (xmlFile.getElementsByTagName("cbc:ID")[0]?.textContent || "N/A").split("-")[0],  // Extraemos la parte antes del guion
                AñoEmisión: AñoEmision,
                NúmeroComprobante: (xmlFile.getElementsByTagName("cbc:ID")[0]?.textContent || "N/A").split("-")[1] || "N/A",  // Extraemos la parte después del guion
                NúmeroFinal: calcularNumeroFinal(schemeID.padStart(3, '0'), importeTotal),
                TipoDocumento: schemeID,  // Agregamos el schemeID a la tabla de datos,
                // RUC del Proveedor
                RUCProveedor: xmlFile.getElementsByTagName("cac:AccountingSupplierParty")[0]
                    ?.getElementsByTagName("cac:PartyIdentification")[0]
                    ?.getElementsByTagName("cbc:ID")[0]
                    ?.textContent || "N/A",
                // Nombre del Proveedor
                NombreProveedor: xmlFile.getElementsByTagName("cac:AccountingSupplierParty")[0]
                    ?.getElementsByTagName("cac:PartyLegalEntity")[0]
                    ?.getElementsByTagName("cbc:RegistrationName")[0]
                    ?.textContent || "N/A",
                // Base Imponible (Valor Venta o LineExtensionAmount)
                BaseImponible: xmlFile.getElementsByTagName("cac:LegalMonetaryTotal")[0]
                    ?.getElementsByTagName("cbc:LineExtensionAmount")[0]
                    ?.textContent || "N/A",
                // Base Imponible (Valor Venta o LineExtensionAmount)
                IGV: elIGV,
                BaseImponibleMixtas: xmlFile.getElementsByTagName("cac:TaxSubtotal")[0] //Esta por verse 
                    ?.getElementsByTagName("cbc:TaxableAmount")[0]
                    ?.textContent || "N/A",
                IGVMixtas: "no sé qué poner",
                BaseImponibleNoGravadas: "no sé qué poner",
                MontoIGVIPMNoGravadas: "no sé qué poner",
                ValorNoGravadas: "no sé qué poner",
                ImpuestoSelectivo: "no sé qué poner",
                ImpuestoBolsasPlásticas: Array.from(xmlFile.getElementsByTagName("cac:TaxTotal")).find(tax => tax.getElementsByTagName("cbc:ID")[0]?.textContent === "7041")?.getElementsByTagName("cbc:TaxAmount")[0]?.textContent || "00.0",
                OtrosTributos: "no sé qué poner",
                ImporteTotal: importeTotal,
                CódigoMoneda: monedita_code,
                TipodeCambio: equivalente_soles,
                FechaComprobanteModificado: "no sé qué poner",
                TipoComprobanteModificado: "no sé qué poner",
                SerieComprobanteModificado: "no sé qué poner",
                CódigoAduanero: "no sé qué poner",
                NComprobanteModificado: "no sé qué poner",
                FechaDepositoDetraccion: xmlFile.getElementsByTagName("cac:PaymentTerms")[1] //Corroborado 
                    ?.getElementsByTagName("cbc:PaymentDueDate")[0]
                    ?.textContent || "N/A",
                NConstanciaDetracción: xmlFile.getElementsByTagName("cac:PaymentTerms")[1] // Corroborado
                    ?.getElementsByTagName("cbc:PaymentMeansID")[0]
                    ?.textContent || "N/A",
                ComprobanteconRetención: xmlFile.getElementsByTagName("cac:WithholdingTaxTotal")[0]//linea
                    ?.getElementsByTagName("cbc:TaxAmount")[0]
                    ?.textContent || "N/A",
                ClasificaciónBienes: xmlFile.getElementsByTagName("cac:Item")[0]?.getElementsByTagName("cbc:CommodityClassification")[0]?.getElementsByTagName("cbc:ItemClassificationCode")[0]?.textContent || "N/A",
                // corroborar 
                IdentificaciónContrato: xmlFile.getElementsByTagName("cac:Contract")[0] //corroborar 
                    ?.getElementsByTagName("cbc:ID")[0]
                    ?.textContent || "N/A",
                ErrorTipodeCambio: "no sé qué poner",
                ErrorProveedorNoHabido: "no sé qué poner",
                ErrorExoneración: "no sé qué poner",
                ErrorDNIoRUC: "no sé qué poner",
                ComprobantesCancelados: mediosPagoValidos.includes(tipoComprobante.padStart(3, '0')) ? "1" : "N/A",
                EstadoAnotaciónoAjuste: owo,
            };

            // Insertamos los datos extraídos en la tabla
            let row = TABLE.insertRow();
            for (const key in data) {
                let cell = row.insertCell();
                cell.innerHTML = data[key];
            }

            // Mostramos el botón de exportar
            BTN.style.display = "block";
        }

        procesarMoneda(xmlFile);  // Ejecutamos la función procesarMoneda
    };
});

// Añadimos un evento al botón de exportación
BTN.addEventListener("click", function () {
    let result = []; // Array para almacenar los datos de la tabla
    let rowsQuantity = TABLE.rows.length; // Cantidad de filas en la tabla

    // Encabezados
    let headers = [
        [
            "Información del Período y Operaciones", "", "",
            "Fechas Clave de la Transacción", "",
            "Detalles del Comprobante de Pago", "", "", "", "",
            "Identificación del Proveedor", "", "",
            "Valores Monetarios de las Adquisiciones", "", "", "", "", "", "",
            "Otros Impuestos", "", "",
            "Totales y Moneda", "", "",
            "Modificación de Comprobantes", "", "", "", "",
            "Detracción y Retención", "", "",
            "Clasificación y Contratos", "", "",
            "Errores en la Transacción", "", "", "",
            "Estado y Cancelación de Comprobantes", ""
        ],
        [
            "Periodo", "CUO", "N° Asiento", "Fecha Emisión", "Fecha Vencimiento/Pago",
            "Tipo Comprobante", "Serie", "Año Emisión", "Número Comprobante", "Número Final",
            "Tipo Documento", "RUC/DNI", "Nombre Proveedor", "Base Imponible Gravadas",
            "Monto IGV/IPM", "Base Imponible Mixtas", "Monto IGV/IPM Mixtas",
            "Base Imponible No Gravadas", "Monto IGV/IPM No Gravadas", "Valor No Gravadas",
            "Impuesto Selectivo", "Impuesto Bolsas Plásticas", "Otros Tributos",
            "Importe Total", "Código Moneda", "Tipo de Cambio", "Fecha Comprobante Modificado",
            "Tipo Comprobante Modificado", "Serie Comprobante Modificado", "Código Aduanero",
            "N° Comprobante Modificado", "Fecha Depósito Detracción", "N° Constancia Detracción",
            "Comprobante con Retención", "Clasificación Bienes", "Identificación Contrato",
            "Error Tipo de Cambio", "Error Proveedor No Habido", "Error Exoneración",
            "Error DNI/RUC", "Comprobantes Cancelados", "Estado Anotación/Ajuste"
        ]
    ];

    // Agregamos los encabezados al array de resultados
    result.push(...headers);

    // Solo procedemos si hay filas en la tabla
    if (rowsQuantity > 0) {
        for (let i = 0; i < rowsQuantity; i++) {
            let rowTemp = []; // Array temporal para almacenar datos de cada fila
            for (let j = 0; j < TABLE.rows[i].cells.length; j++) {
                rowTemp.push(TABLE.rows[i].cells[j].innerHTML); // Agregamos el contenido de cada celda al array
            }
            result.push(rowTemp); // Agregamos la fila al resultado final
        }
    }

    // Creamos un nuevo libro de Excel
    let book = XLSX.utils.book_new();
    book.SheetNames.push("Sheet 1"); // Agregamos una hoja

    // Convertimos el array a una hoja de Excel
    let sheet = XLSX.utils.aoa_to_sheet(result);
    book.Sheets['Sheet 1'] = sheet; // Asignamos la hoja al libro

    // Estilos para encabezados y subencabezados
    for (let R = 0; R <= 1; R++) { // Para las dos primeras filas (encabezados y subencabezados)
        for (let C = 0; C < headers[R].length; C++) {
            let cellRef = XLSX.utils.encode_cell({ r: R, c: C });
            if (!sheet[cellRef]) continue;
            sheet[cellRef].s = {
                fill: { fgColor: { rgb: "006400" } }, // Fondo verde oscuro
                font: { color: { rgb: "FFFFFF" }, bold: true }, // Texto blanco y negrita
                alignment: { horizontal: "center", vertical: "center" } // Centrado
            };
        }
    }

    // Centrado de todos los datos
    for (let R = 2; R < result.length; R++) { // A partir de la tercera fila (datos)
        for (let C = 0; C < result[R].length; C++) {
            let cellRef = XLSX.utils.encode_cell({ r: R, c: C });
            if (!sheet[cellRef]) continue;
            sheet[cellRef].s = {
                alignment: { horizontal: "center", vertical: "center" } // Centrado
            };
        }
    }

    // Ajuste de ancho de las columnas
    sheet['!cols'] = Array(result[0].length).fill({ wch: 20 }); // Establece un ancho de columna uniforme

    // Generamos el archivo Excel
    let xlsxFile = XLSX.write(book, { bookType: 'xlsx', type: 'binary' });
    let arrayBuffer = new ArrayBuffer(xlsxFile.length);
    let uint8array = new Uint8Array(arrayBuffer);

    // Convertimos el string a un array de bytes
    for (let i = 0; i < xlsxFile.length; i++) {
        uint8array[i] = xlsxFile.charCodeAt(i) & 0xff;
    }

    // Creamos el archivo y lo descargamos
    saveAs(new Blob([arrayBuffer], { type: "application/octet-stream" }), "MI REPORTE.xlsx");
});