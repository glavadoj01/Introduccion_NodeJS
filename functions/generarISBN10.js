/**
 *  Genera un código ISBN-10 aleatorio.
 *  @returns Object{type:"ISBN-10", identifier:"random10digitos"}
 */
function generarISBN10() {
	return [
		{
			type: `ISBN-10`,
			identifier: Math.floor(Math.random() * 10000000000)
				.toString()
				.substring(0, 10) // Si tiene más de 10 dígitos, recortar a 10
				.padStart(10, "0"), // Si tiene menos de 10 dígitos, rellenar con ceros a la izquierda
		},
	];
}
export { generarISBN10 };
