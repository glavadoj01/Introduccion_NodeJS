const express = require("express");
const app = express();

app.get("/", (req, res) => {
	res.send("Servidor Express funcionando");
});

app.get("/clima", async (req, res) => {
	const ciudad = req.query.ciudad || "zafra";
	if (!ciudad) return res.status(400).json({ error: "Falta el parámetro 'ciudad'" });
	const { latitud, longitud } = await obtenerCoordenadas(ciudad);
	let clima = await obtenerTiempo(latitud, longitud, ciudad);
	return res.json(clima);
});

app.listen(3000, () => {
	console.log("Servidor escuchando en el puerto 3000");
});

async function obtenerCoordenadas(ciudad = "zafra", format = "json") {
	// En consola he escrito: node index.js "Sevilla"
	// Si no se pasa ningún argumento, por defecto toma "zafra"
	// Si se pasa un argumento, toma el valor pasado (en este caso "Sevilla")
	// process.argv toma todos los argumentos pasados desde la consola
	// .slice(2) elimina los dos primeros argumentos que son "node" y "index.js"
	// [0] toma el primer argumento de la respuesta (puede haber más de 1 ciudad devuelta)

	// const ciudad = process.argv.slice(2)[0] || city;

	const url = `https://geocoding-api.open-meteo.com/v1/search?name=${ciudad}&count=1&language=es&format=${format}`;

	const respuesta = await fetch(url);

	const datos = await respuesta.json();

	const lugar = datos.results[0];

	const coordenadas = {
		latitud: lugar.latitude,
		longitud: lugar.longitude,
	};

	return coordenadas;
}

async function obtenerTiempo(latitud, longitud, ciudad) {
	const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitud}&longitude=${longitud}&current_weather=true&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,weathercode,windspeed_10m`;

	const respuesta = await fetch(url);
	const datos = await respuesta.json();
	// construcción del objeto tiempoCiudad

	const horaActual = new Date(datos.current_weather.time);
	const horasRegistro = datos.hourly.time.map(h => new Date(h));
	const temperatura = datos.current_weather.temperature;
	const escalaTemperatura = datos.current_weather_units.temperature;
	const viento = datos.current_weather.windspeed;
	const escalaViento = datos.current_weather_units.windspeed;

	// búsqueda de la hora más próxima en los registros horarios y obtención de la humedad
	const horaMasProxima = new Date(horaActual.getTime());
	horaMasProxima.setMinutes(0, 0, 0);

	const indice = horasRegistro.findIndex(d => d.getTime() == horaMasProxima.getTime());
	const humedad = indice > 0 ? datos.hourly.relative_humidity_2m[indice] : null;

	return {
		ciudad: ciudad,
		hora: horaActual,
		horaMasProxima: horaMasProxima,
		indice: indice,
		temperatura: temperatura,
		escalaTemperatura: escalaTemperatura,
		viento: viento,
		escalaViento: escalaViento,
		humedad: humedad,
	};
}
