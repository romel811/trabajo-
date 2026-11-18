const http = require('http');
const querystring = require('querystring');
const { Client } = require('pg');

const server = http.createServer(async (req, res) => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });

  try {
    await client.connect();
    await client.query(`
      CREATE TABLE IF NOT EXISTS registros (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(100),
        correo VARCHAR(100)
      )
    `);

    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', async () => {
        const datos = querystring.parse(body);
        await client.query('INSERT INTO registros (nombre, correo) VALUES ($1, $2)', [datos.nombre, datos.correo]);
        await client.end();
        res.writeHead(302, { 'Location': '/' });
        res.end();
      });
      return;
    }

    const resultado = await client.query('SELECT * FROM registros ORDER BY id DESC');
    await client.end();

    const listaHTML = resultado.rows
      .map(r => `<li><strong>${r.nombre}</strong> (${r.correo})</li>`)
      .join('');

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head><title>Formulario PostgreSQL</title></head>
      <body style="font-family: sans-serif; max-width: 450px; margin: 40px auto;">
        <h2>Formulario Conectado a PostgreSQL</h2>
        <form method="POST" action="/">
          <input type="text" name="nombre" placeholder="Tu nombre" required style="width: 100%; padding: 8px; margin-bottom: 10px;"><br>
          <input type="email" name="correo" placeholder="Tu correo" required style="width: 100%; padding: 8px; margin-bottom: 10px;"><br>
          <button type="submit" style="padding: 10px 20px; cursor: pointer;">Guardar registro</button>
        </form>
        <hr style="margin: 25px 0;">
        <h3>Datos guardados en la Base de Datos:</h3>
        <ul>${listaHTML || '<li>No hay registros aún</li>'}</ul>
      </body>
      </html>
    `);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Error de conexión: ' + err.message);
  }
});

server.listen(3000, () => console.log('Servidor web listo en el puerto 3000'));
